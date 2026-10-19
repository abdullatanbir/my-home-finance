import { emptyStore, uid, type FinancialStore, type Transaction } from './model';
import { migrateLegacy, validateStore } from './migration';
import { materialize, validateTransaction } from './engine';
export const CORE_KEY = 'my-home-finance-financial-core';
export const LEGACY_KEY = 'my-home-finance-personal-v1';
const EVENT = 'mhf-core';
export function load(): FinancialStore { const raw = localStorage.getItem(CORE_KEY); if (raw) {
    const s = JSON.parse(raw);
    validateStore(s);
    return s;
} const old = localStorage.getItem(LEGACY_KEY); const s = old ? migrateLegacy(JSON.parse(old)) : emptyStore(); if (old && !localStorage.getItem('mhf-pre-blueprint-c-backup'))
    localStorage.setItem('mhf-pre-blueprint-c-backup', old); save(s); return s; }
export function save(s: FinancialStore) { validateStore(s); localStorage.setItem(CORE_KEY, JSON.stringify(s)); window.dispatchEvent(new Event(EVENT)); }
export function change(fn: (s: FinancialStore) => void) { const s = load(); fn(s); save(s); return s; }
export function subscribeCore(fn: () => void) { const storage = (e: StorageEvent) => { if (e.key === CORE_KEY || e.key === LEGACY_KEY || e.key === null)
    fn(); }; window.addEventListener(EVENT, fn); window.addEventListener('storage', storage); return () => { window.removeEventListener(EVENT, fn); window.removeEventListener('storage', storage); }; }
export function addCanonical(s: FinancialStore, input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'currency'>) { const time = new Date().toISOString(); const t: Transaction = { ...input, id: uid(), currency: 'USD', createdAt: time, updatedAt: time }; validateTransaction(s, t); s.transactions.push(t); return t; }
// The accepted workspace remains available for legacy operations. Reconcile its
// changes by stable ID, preserving Blueprint C metadata and all new entity types.
export function reconcileLegacy(s: FinancialStore, old: Record<string, unknown>) { if (JSON.stringify(s.legacy) === JSON.stringify(old))
    return s; const incoming = migrateLegacy(old); const prior = new Set(((s.legacy.transactions || []) as {
    id: string;
}[]).map(t => t.id)); const incomingIds = new Set(incoming.transactions.map(t => t.id)); s.transactions = s.transactions.filter(t => !prior.has(t.id) || incomingIds.has(t.id)); for (const t of incoming.transactions) {
    const index = s.transactions.findIndex(x => x.id === t.id);
    const prev = s.transactions[index];
    if (prev) {
        const legacyPrior = (s.legacy.transactions as {
            id: string;
        }[] | undefined)?.find(x => x.id === t.id);
        const legacyNext = (old.transactions as {
            id: string;
        }[]).find(x => x.id === t.id);
        if (JSON.stringify(legacyPrior) !== JSON.stringify(legacyNext))
            s.transactions[index] = { ...prev, ...t, accountId: prev.accountId, updatedAt: new Date().toISOString() };
    }
    else if(!s.trash.some(entry=>entry.id===t.id))
        s.transactions.push(t);
} for (const key of ['categories', 'goals', 'contributions', 'budgets', 'recurringRules'] as const) {
    const incomingItems = incoming[key] as {
        id: string;
    }[];
    const incomingIds = new Set(incomingItems.map(x => x.id));
    const oldIncoming = migrateLegacy(s.legacy.version ? s.legacy : { version: 4, transactions: [], budgets: [], goals: [] });
    const previous = oldIncoming[key] as {
        id: string;
    }[];
    const oldIds = new Set(previous.map(x => x.id));
    const result = (s[key] as {
        id: string;
    }[]).filter(x => !oldIds.has(x.id) || incomingIds.has(x.id));
    for (const item of incomingItems) {
        const index = result.findIndex(x => x.id === item.id);
        const before = previous.find(x => x.id === item.id);
        if (index < 0)
            result.push(item);
        else if (JSON.stringify(before) !== JSON.stringify(item))
            result[index] = item;
    }
    (s[key] as {
        id: string;
    }[]) = result;
} s.legacy = structuredClone(old); return s; }
export function syncLegacy() { const raw = localStorage.getItem(LEGACY_KEY); if (raw) {
    const s = load();
    reconcileLegacy(s, JSON.parse(raw));
    materialize(s);
    save(s);
}
else
    change(s => { materialize(s); }); }
export function exportFinancialBackup(s: FinancialStore) { return { format: 'my-home-finance', version: 5, exportedAt: new Date().toISOString(), store: s }; }
export function restoreFinancialBackup(value: unknown) { const v = value as {
    version?: number;
    format?: string;
    store?: unknown;
}; const s = v?.version === 5 && v.format === 'my-home-finance' ? v.store : migrateLegacy(value); validateStore(s); const before = localStorage.getItem(CORE_KEY); if (before)
    localStorage.setItem('mhf-before-restore', before); save(s); if (s.legacy.version)
    localStorage.setItem(LEGACY_KEY, JSON.stringify(s.legacy));
else
    localStorage.removeItem(LEGACY_KEY); window.dispatchEvent(new Event('mhf-data')); return s; }
// Project only supported legacy fields on explicit entry to the compatibility
// workspace. Canonical-only records remain authoritative and are never removed.
export function prepareLegacyWorkspace() { const s = load(); const old = s.legacy as Record<string, any>; const originals = new Map((old.transactions || []).map((t: any) => [t.id, t])); const name = (id?: string) => s.categories.find(c => c.id === id)?.name || null; const transactions = s.transactions.filter(t => ['expense', 'income'].includes(t.type) && !['cancelled', 'reversed'].includes(t.status)).map(t => ({ ...((originals.get(t.id) || {}) as Record<string, unknown>), id: t.id, occurred_on: t.transactionDate, kind: t.type, group_name: name(t.groupId), category: name(t.categoryId), name: t.description, merchant: t.merchant || null, amount: t.amountMinor / 100, status: t.status === 'paid' || t.status === 'posted' ? 'paid' : 'unpaid', payment_method: ((originals.get(t.id) || {}) as Record<string, unknown>).payment_method || null, due_date: t.dueDate || null, notes: t.notes || null, recurring_occurrence_id: t.occurrenceId, created_at: t.createdAt })); const next = { version: 4, transactions, budgets: old.budgets || [], goals: old.goals || [], savings_contributions: old.savings_contributions || [], recurring_rules: old.recurring_rules || [], deleted_transactions: old.deleted_transactions || [], dismissed_activity_ids: old.dismissed_activity_ids || [] }; s.legacy = next; save(s); localStorage.setItem(LEGACY_KEY, JSON.stringify(next)); }
