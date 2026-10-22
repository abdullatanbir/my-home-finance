export const SCHEMA_VERSION = 5 as const;
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'loan' | 'other_asset' | 'other_liability';
export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund' | 'adjustment';
export type Lifecycle = 'scheduled' | 'pending' | 'posted' | 'paid' | 'cancelled' | 'reversed';
export type Source = 'manual' | 'statement_import' | 'recurring' | 'copy' | 'system_generated';
export interface Account {
    id: string;
    name: string;
    institutionName?: string;
    nickname?: string;
    type: AccountType;
    last4?: string;
    openingBalanceMinor: number;
    openingBalanceDate: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface Category {
    id: string;
    name: string;
    type: TransactionType;
    parentId?: string;
    level: 'group' | 'category' | 'subcategory';
    /** Optional presentation metadata; older stores remain compatible. */
    icon?: string;
    color?: string;
}
export interface Transaction {
    id: string;
    type: TransactionType;
    status: Lifecycle;
    amountMinor: number;
    currency: 'USD';
    transactionDate: string;
    dueDate?: string;
    postedDate?: string;
    merchant?: string;
    description: string;
    notes?: string;
    accountId?: string;
    destinationAccountId?: string;
    groupId?: string;
    categoryId?: string;
    subcategoryId?: string;
    recurringRuleId?: string;
    occurrenceId?: string;
    savingsGoalId?: string;
    investmentId?: string;
    sourceType: Source;
    importBatchId?: string;
    originalTransactionId?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Goal {
    id: string;
    name: string;
    targetMinor: number;
    openingMinor: number;
    accountId?: string;
    targetDate?: string;
    notes?: string;
}
export interface Contribution {
    id: string;
    goalId: string;
    amountMinor: number;
    date: string;
    transactionId?: string;
    occurrenceId?: string;
    notes?: string;
}
export interface Investment {
    id: string;
    name: string;
    type: string;
    institution?: string;
    investedMinor: number;
    accountId?: string;
    notes?: string;
    valuations: {
        id: string;
        date: string;
        valueMinor: number;
    }[];
}
export interface Budget {
    id: string;
    month: string;
    plannedIncomeMinor: number;
    spendingMinor: number;
    categoryAmounts: Record<string, number>;
}
export interface RecurringRule {
    id: string;
    name: string;
    kind: 'expense' | 'income' | 'savings';
    amountMinor: number;
    frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    nextDate: string;
    endDate?: string;
    enabled: boolean;
    status: Lifecycle;
    accountId?: string;
    categoryId?: string;
    groupId?: string;
    goalId?: string;
    legacy?: boolean;
}
export type ReviewStatus = 'Ready' | 'Review' | 'Unknown' | 'Possible Duplicate' | 'Excluded';
export interface StagedRow {
    id: string;
    date: string;
    amountMinor: number;
    description: string;
    type: TransactionType;
    status: ReviewStatus;
    categoryId?: string;
    fromAccountId?: string;
    destinationAccountId?: string;
    originalTransactionId?: string;
    errors: string[];
    fingerprint: string;
    duplicateIds: string[];
}
export interface ImportBatch {
    id: string;
    accountId: string;
    createdAt: string;
    format: 'csv' | 'pdf';
    state: 'staged' | 'approved' | 'cancelled' | 'rolled_back';
    rows: StagedRow[];
    importedIds: string[];
    excludedCount: number;
    duplicatesSkipped: number;
    period?: string;
}
export interface ClassificationRule {
    id: string;
    contains: string;
    type: TransactionType;
    categoryId?: string;
}
export interface FinancialStore {
    schemaVersion: 5;
    trash: {id:string;transaction:Transaction;deletedAt:string}[];
    accounts: Account[];
    transactions: Transaction[];
    categories: Category[];
    goals: Goal[];
    contributions: Contribution[];
    investments: Investment[];
    budgets: Budget[];
    recurringRules: RecurringRule[];
    importBatches: ImportBatch[];
    classificationRules: ClassificationRule[];
    netWorthSnapshots: {
        id: string;
        date: string;
        valueMinor: number;
    }[];
    preferences: {
        theme: 'dark' | 'light';
        volume: number;
        muted: boolean;
    };
    legacy: Record<string, unknown>;
    migration: {
        from: number;
        at: string;
        warnings: string[];
    };
}
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const uid = () => crypto.randomUUID();
export function minor(value: string | number): number { const s = String(value).trim(); if (!/^-?\d+(\.\d{1,2})?$/.test(s))
    throw Error('Enter a valid amount with at most two decimal places.'); const neg = s.startsWith('-'); const [a, b = ''] = s.replace('-', '').split('.'); const n = Number(a) * 100 + Number(b.padEnd(2, '0')); if (!Number.isSafeInteger(n))
    throw Error('Amount is too large.'); return neg ? -n : n; }
export const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
export const isLiability = (a: Account) => ['credit_card', 'loan', 'other_liability'].includes(a.type);
export function emptyStore(): FinancialStore { return { schemaVersion: 5, trash:[], accounts: [], transactions: [], categories: ['Home', 'Personal', 'Credit & Loan', 'Others'].map(name => ({ id: `legacy-category:expense::${name}`, name, type: 'expense', level: 'group' })), goals: [], contributions: [], investments: [], budgets: [], recurringRules: [], importBatches: [], classificationRules: [], netWorthSnapshots: [], preferences: { theme: 'dark', volume: 0.4, muted: true }, legacy: {}, migration: { from: 0, at: new Date().toISOString(), warnings: [] } }; }
