import { isLiability, today, type FinancialStore, type Transaction, type Account } from './model';
export const actual = (t: Transaction, asOf = today()) => ['posted', 'paid'].includes(t.status) && t.transactionDate <= asOf;
export function totals(transactions: Transaction[], start = '0000-01-01', end = today()) { let income = 0, spending = 0; for (const t of transactions) {
    if (!actual(t, end < today() ? end : today()) || t.transactionDate < start || t.transactionDate > end)
        continue;
    if (t.type === 'income')
        income += t.amountMinor;
    if (t.type === 'expense')
        spending += t.amountMinor;
    if (t.type === 'refund')
        spending -= t.amountMinor;
} return { income, spending, cashFlow: income - spending }; }
export function balance(account: Account, transactions: Transaction[], asOf = today()) { let n = account.openingBalanceDate <= asOf ? account.openingBalanceMinor : 0; for (const t of transactions) {
    if (!actual(t, asOf) || t.transactionDate < account.openingBalanceDate)
        continue;
    const direction = isLiability(account) ? -1 : 1;
    if (t.accountId === account.id) {
        const sign = t.type === 'income' || t.type === 'refund' || t.type === 'adjustment' ? 1 : -1;
        n += direction * sign * t.amountMinor;
    }
    if (t.type === 'transfer' && t.destinationAccountId === account.id)
        n += direction * t.amountMinor;
} return n; }
export function netWorth(s: FinancialStore, asOf = today()) { let assets = 0, liabilities = 0; for (const a of s.accounts) {
    const v = balance(a, s.transactions, asOf);
    if (isLiability(a))
        liabilities += v;
    else
        assets += v;
} for (const i of s.investments) {
    const val = [...i.valuations].reverse().filter(v => v.date <= asOf).sort((a, b) => b.date.localeCompare(a.date)).at(0);
    if (!i.accountId && val)
        assets += val.valueMinor;
} return { assets, liabilities, total: assets - liabilities }; }
export const goalProgress = (s: FinancialStore, id: string) => { const g = s.goals.find(x => x.id === id); return (g?.openingMinor || 0) + s.contributions.filter(x => x.goalId === id && x.date <= today() && (!x.transactionId || s.transactions.some(t => t.id === x.transactionId && actual(t)))).reduce((n, x) => n + x.amountMinor, 0); };
export const comparison = (current: number, previous: number) => previous === 0 ? null : (current - previous) / previous * 100;
export function budgetSummary(s: FinancialStore, month: string) { const b = s.budgets.find(x => x.month === month); const sum = totals(s.transactions, `${month}-01`, month === today().slice(0, 7) ? today() : `${month}-31`); const scheduled = s.transactions.filter(t => t.type === 'expense' && ['scheduled', 'pending'].includes(t.status) && t.transactionDate.startsWith(month)).reduce((n, t) => n + t.amountMinor, 0) + occurrences(s, `${month}-01`, `${month}-31`).filter(t => t.kind === 'expense').reduce((n, t) => n + t.amountMinor, 0); return { ...sum, budgeted: b?.spendingMinor || 0, remaining: (b?.spendingMinor || 0) - sum.spending, projectedRemaining: (b?.spendingMinor || 0) - sum.spending - scheduled, scheduled }; }
export function advance(date: string, frequency: string) { const [y, m, d] = date.split('-').map(Number); const x = new Date(y, m - 1, d, 12); if (frequency === 'weekly' || frequency === 'biweekly')
    x.setDate(d + (frequency === 'weekly' ? 7 : 14));
else {
    x.setDate(1);
    x.setMonth(m - 1 + (frequency === 'yearly' ? 12 : 1));
    x.setDate(Math.min(d, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
} return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }
export function occurrences(s: FinancialStore, start: string, end: string, asOf = today()) { const out: {
    id: string;
    ruleId: string;
    date: string;
    kind: string;
    name: string;
    amountMinor: number;
}[] = []; for (const r of s.recurringRules) {
    if (!r.enabled)
        continue;
    let d = r.nextDate;
    let guard = 0;
    while (d <= end && (!r.endDate || d <= r.endDate)) {
        if (++guard > 20000)
            throw Error('Recurring range is too large.');
        const id = `mhf-recurring-v1-${r.id}-${d}`;
        if (d >= start && d > asOf && !s.transactions.some(t => t.occurrenceId === id) && !s.contributions.some(t => t.occurrenceId === id))
            out.push({ id, ruleId: r.id, date: d, kind: r.kind, name: r.name, amountMinor: r.amountMinor });
        d = advance(d, r.frequency);
    }
} return out; }
export function materialize(s: FinancialStore, asOf = today()) { for (const r of s.recurringRules) {
    if (r.legacy)
        continue;
    let guard = 0;
    while (r.enabled && r.nextDate <= asOf && (!r.endDate || r.nextDate <= r.endDate)) {
        if (++guard > 20000)
            throw Error('Recurring range is too large.');
        const id = `mhf-recurring-v1-${r.id}-${r.nextDate}`;
        if (r.kind === 'savings') {
            if (r.goalId && !s.contributions.some(x => x.occurrenceId === id))
                s.contributions.push({ id, goalId: r.goalId, amountMinor: r.amountMinor, date: r.nextDate, occurrenceId: id });
        }
        else if (!s.transactions.some(t => t.occurrenceId === id)) {
            const timestamp = new Date().toISOString();
            s.transactions.push({ id, type: r.kind, status: r.status, amountMinor: r.amountMinor, currency: 'USD', transactionDate: r.nextDate, dueDate: r.kind === 'expense' ? r.nextDate : undefined, description: r.name, accountId: r.accountId, categoryId: r.categoryId, groupId: r.groupId, recurringRuleId: r.id, occurrenceId: id, sourceType: 'recurring', createdAt: timestamp, updatedAt: timestamp });
        }
        r.nextDate = advance(r.nextDate, r.frequency);
    }
} return s; }
export function validateTransaction(s: FinancialStore, t: Transaction) { if (t.categoryId) {
    const c = s.categories.find(c => c.id === t.categoryId);
    if (!c)
        throw Error('Select an existing category.');
    if (c.level === 'subcategory') {
        t.subcategoryId = c.id;
        t.categoryId = c.parentId;
    }
    const category = s.categories.find(c => c.id === t.categoryId);
    if (category?.parentId)
        t.groupId = category.parentId;
    if (c.type !== t.type && !(t.type === 'refund' && c.type === 'expense'))
        throw Error('Category must match the transaction type.');
} if (t.subcategoryId && !s.categories.some(c => c.id === t.subcategoryId && c.parentId === t.categoryId))
    throw Error('Subcategory must belong to the selected category.'); if (!Number.isSafeInteger(t.amountMinor) || (t.type !== 'adjustment' && t.amountMinor <= 0))
    throw Error('Enter a positive amount in cents.'); if (!/^\d{4}-\d{2}-\d{2}$/.test(t.transactionDate) || Number.isNaN(Date.parse(t.transactionDate)) || new Date(`${t.transactionDate}T12:00:00Z`).toISOString().slice(0, 10) !== t.transactionDate)
    throw Error('Enter a valid transaction date.'); for (const id of [t.accountId, t.destinationAccountId])
    if (id && !s.accounts.some(a => a.id === id && !a.archived))
        throw Error('Select an active account.'); if (t.type === 'transfer' && (!t.accountId || !t.destinationAccountId || t.accountId === t.destinationAccountId))
    throw Error('Choose two different owned accounts for a transfer.'); if (t.type === 'expense') { const refunds = s.transactions.filter(x => x.type === 'refund' && x.originalTransactionId === t.id && !['cancelled','reversed'].includes(x.status)); if (refunds.reduce((n,x)=>n+x.amountMinor,0)>t.amountMinor) throw Error('Expense amount cannot be smaller than its linked refunds.'); if (['cancelled','reversed'].includes(t.status) && refunds.length) throw Error('Cancel linked refunds before reversing this expense.'); }
    if (t.originalTransactionId) {
    const original = s.transactions.find(x => x.id === t.originalTransactionId);
    if (!original || original.type !== 'expense' || ['cancelled','reversed'].includes(original.status))
        throw Error('Refund must reference an expense.');
    if (!t.categoryId) { t.categoryId = original.categoryId; t.groupId = original.groupId; t.subcategoryId = original.subcategoryId; }
        const refunded = s.transactions.filter(x => x.type === 'refund' && x.originalTransactionId === original.id && x.id !== t.id && !['cancelled', 'reversed'].includes(x.status)).reduce((n, x) => n + x.amountMinor, 0);
    if (refunded + t.amountMinor > original.amountMinor)
        throw Error('Refunds cannot exceed the original expense.');
} }
