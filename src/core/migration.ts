import { emptyStore, type FinancialStore, type Transaction } from './model';
// Legacy records are retained verbatim in the envelope. Migration never guesses account ownership.
type RecordValue = Record<string, any>;
const cents = (n: unknown) => { const v = Number(n); if (!Number.isFinite(v) || !Number.isSafeInteger(Math.round(v * 100)))
    throw Error('Legacy amount is invalid; original data has been preserved.'); return Math.round(v * 100); };
export function migrateLegacy(input: unknown): FinancialStore {
    if (!input || typeof input !== 'object')
        throw Error('Invalid backup.');
    const old = input as RecordValue;
    if (![1, 2, 3, 4].includes(old.version))
        throw Error('Unsupported legacy version.');
    for (const key of ['transactions', 'budgets', 'goals'])
        if (!Array.isArray(old[key]))
            throw Error(`Missing legacy ${key}.`);
    const s = emptyStore();
    s.legacy = structuredClone(old);
    s.migration.from = old.version;
    const category = (type: Transaction['type'], name: string, parentId?: string, level: 'group' | 'category' | 'subcategory' = 'category') => { const id = `legacy-category:${type}:${parentId || ''}:${name}`; if (!s.categories.some(c => c.id === id))
        s.categories.push({ id, name, type, parentId, level }); return id; };
    for (const name of ['Home', 'Personal', 'Credit & Loan', 'Others'])
        category('expense', name, undefined, 'group');
    for (const t of old.transactions) {
        if (!t.id || !['income', 'expense'].includes(t.kind))
            throw Error('Unknown legacy transaction; original data has been preserved.');
        const groupId = t.group_name ? category(t.kind, t.group_name, undefined, 'group') : undefined;
        const categoryId = t.category ? category(t.kind, t.category, groupId) : undefined;
        s.transactions.push({ id: t.id, type: t.kind, status: t.kind === 'income' || t.status === 'paid' ? 'paid' : 'pending', amountMinor: cents(t.amount), currency: 'USD', transactionDate: t.occurred_on, dueDate: t.due_date || undefined, merchant: t.merchant || undefined, description: t.name, notes: t.notes || undefined, categoryId, groupId, occurrenceId: t.recurring_occurrence_id || undefined, sourceType: t.recurring_occurrence_id ? 'recurring' : 'manual', createdAt: t.created_at, updatedAt: t.created_at });
    }
    for (const g of old.goals)
        s.goals.push({ id: g.id, name: g.name, targetMinor: cents(g.goal_amount), openingMinor: cents(g.base_amount ?? g.current_amount) });
    for (const c of old.savings_contributions || []) {
        let g = s.goals.find(g => g.name === c.track);
        if (!g) {
            g = { id: `legacy-goal:${c.track}`, name: c.track, targetMinor: 0, openingMinor: 0 };
            s.goals.push(g);
        }
        s.contributions.push({ id: c.id, goalId: g.id, amountMinor: cents(c.amount), date: c.month_start, notes: c.notes, occurrenceId: c.recurring_occurrence_id });
    }
    for (const b of old.budgets)
        s.budgets.push({ id: `legacy-budget:${b.month_start}`, month: b.month_start.slice(0, 7), plannedIncomeMinor: 0, spendingMinor: cents(b.amount), categoryAmounts: Object.fromEntries(Object.entries(b.category_amounts || {}).map(([name, n]) => [category('expense', name, undefined, 'group'), cents(n)])) });
    if ((old.deleted_transactions || []).length) { const migratedTrash=migrateLegacy({...old, transactions:old.deleted_transactions.map((d:RecordValue)=>d.transaction), deleted_transactions:[]});s.trash=migratedTrash.transactions.map(t=>({id:t.id,transaction:t,deletedAt:old.deleted_transactions.find((d:RecordValue)=>d.transaction.id===t.id).deleted_at})); }
    for (const r of old.recurring_rules || [])
        s.recurringRules.push({ id: r.id, name: r.name, kind: r.kind, amountMinor: cents(r.amount), frequency: r.frequency, nextDate: r.next_occurrence, endDate: r.end_date || undefined, enabled: r.enabled, status: r.kind === 'income' || r.status === 'paid' ? 'paid' : 'pending', goalId: s.goals.find(g => g.name === r.savings_track)?.id, groupId: r.group_name ? category(r.kind === 'income' ? 'income' : 'expense', r.group_name, undefined, 'group') : undefined, categoryId: r.category ? category(r.kind === 'income' ? 'income' : 'expense', r.category, r.group_name ? category('expense', r.group_name, undefined, 'group') : undefined) : undefined, legacy: true });
    if (s.transactions.some(t => !t.accountId))
        s.migration.warnings.push('Legacy transactions have no inferred account. Assign accounts only after checking opening balances to avoid double counting.');
    return s;
}
export function validateStore(value: unknown): asserts value is FinancialStore { if (!value || typeof value !== 'object')
    throw Error('Invalid financial data.'); const s = value as FinancialStore; if (s.schemaVersion !== 5)
    throw Error('Unsupported financial schema.'); for (const k of ['trash', 'accounts', 'transactions', 'categories', 'goals', 'contributions', 'investments', 'budgets', 'recurringRules', 'importBatches', 'classificationRules', 'netWorthSnapshots'] as const) {
    if (!Array.isArray(s[k]))
        throw Error(`Invalid ${k}.`);
    const ids = s[k].map(x => x.id);
    if (ids.some(x => typeof x !== 'string') || new Set(ids).size !== ids.length)
        throw Error(`Invalid or duplicate IDs in ${k}.`);
} for (const t of s.transactions) {
    if (!['expense', 'income', 'transfer', 'refund', 'adjustment'].includes(t.type) || !['scheduled', 'pending', 'posted', 'paid', 'cancelled', 'reversed'].includes(t.status) || !Number.isSafeInteger(t.amountMinor) || t.currency !== 'USD' || typeof t.transactionDate !== 'string')
        throw Error('Invalid canonical transaction.');
    for (const id of [t.accountId, t.destinationAccountId])
        if (id && !s.accounts.some(a => a.id === id))
            throw Error('Missing transaction account.');
} for (const a of s.accounts)
    if (!Number.isSafeInteger(a.openingBalanceMinor) || !['checking', 'savings', 'credit_card', 'cash', 'loan', 'other_asset', 'other_liability'].includes(a.type))
        throw Error('Invalid account.'); for (const c of s.contributions)
    if (!Number.isSafeInteger(c.amountMinor) || !s.goals.some(g => g.id === c.goalId))
        throw Error('Invalid contribution.'); for (const g of s.goals)
    if (!Number.isSafeInteger(g.targetMinor) || !Number.isSafeInteger(g.openingMinor))
        throw Error('Invalid savings goal.'); for (const b of s.budgets)
    if (!Number.isSafeInteger(b.plannedIncomeMinor) || !Number.isSafeInteger(b.spendingMinor) || Object.values(b.categoryAmounts).some(n => !Number.isSafeInteger(n) || n < 0))
        throw Error('Invalid budget.'); for (const i of s.investments)
    if (!Number.isSafeInteger(i.investedMinor) || !Array.isArray(i.valuations) || i.valuations.some(v => !Number.isSafeInteger(v.valueMinor) || v.valueMinor < 0))
        throw Error('Invalid investment valuation.'); for (const r of s.recurringRules)
    if (!Number.isSafeInteger(r.amountMinor) || r.amountMinor <= 0 || !['weekly', 'biweekly', 'monthly', 'yearly'].includes(r.frequency) || !/^\d{4}-\d{2}-\d{2}$/.test(r.nextDate))
        throw Error('Invalid recurring rule.'); if (!s.preferences || !s.legacy)
    throw Error('Incomplete financial data.'); }
