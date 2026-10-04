/* =========================================================
   MY HOME FINANCE v27
   Local Data Layer
   localStorage + Recently Deleted + Backup v2
   ========================================================= */

import {
    createHistoricalTestTransactions,
    isHistoricalTestTransaction
} from './historicalTestData';

export type {
    HistoricalTestCleanupResult,
    HistoricalTestSeedResult
} from './historicalTestData';


/* =========================================================
   TYPES
   ========================================================= */

export type Kind =
    | 'income'
    | 'expense';


export type Status =
    | 'paid'
    | 'unpaid';


export type DisplayStatus =
    | 'paid'
    | 'upcoming'
    | 'due-today'
    | 'overdue'
    | 'unpaid';


export type ExpenseGroup =
    | 'Home'
    | 'Personal'
    | 'Credit & Loan'
    | 'Others';


export type Transaction = {
    id: string;
    occurred_on: string;
    kind: Kind;
    group_name: string | null;
    category: string | null;
    name: string;
    merchant: string | null;
    amount: number;
    status: Status;
    payment_method: string | null;
    due_date: string | null;
    notes: string | null;
    /** Optional income metadata; absent records remain fully valid. */
    hours_worked?: number | null;
    /** Stable schedule occurrence identity for generated recurring records. */
    recurring_occurrence_id?: string | null;
    created_at: string;
};


export type Budget = {
    month_start: string;
    amount: number;
    category_amounts?: Partial<Record<ExpenseGroup, number>>;
};


export type Goal = {
    id: string;
    name:
        | 'Personal Savings'
        | 'Home Savings';
    current_amount: number;
    goal_amount: number;
    /** Legacy saved balance retained as the carry-forward base for the ledger. */
    base_amount?: number;
    created_at: string;
};


export type SavingsTrack = Goal['name'];


export type SavingsContribution = {
    id: string;
    track: SavingsTrack;
    month_start: string;
    amount: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    recurring_occurrence_id?: string | null;
};

export type RecurringFrequency =
    | 'weekly'
    | 'biweekly'
    | 'monthly';

export type RecurringRule = {
    id: string;
    kind: 'income' | 'expense' | 'savings';
    name: string;
    amount: number;
    frequency: RecurringFrequency;
    start_date: string;
    end_date: string | null;
    next_occurrence: string;
    enabled: boolean;
    group_name: string | null;
    category: string | null;
    merchant: string | null;
    payment_method: string | null;
    status: Status;
    due_date: string | null;
    notes: string | null;
    hours_worked: number | null;
    savings_track: SavingsTrack | null;
    created_at: string;
    updated_at: string;
};


export type DeletedTransaction = {
    transaction: Transaction;
    deleted_at: string;
};


export type BackupData = {
    version: 4;
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    savings_contributions: SavingsContribution[];
    deleted_transactions: DeletedTransaction[];
    dismissed_activity_ids?: string[];
    recurring_rules: RecurringRule[];
};

type VersionThreeBackupData = {
    version: 3;
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    savings_contributions: SavingsContribution[];
    deleted_transactions: DeletedTransaction[];
    dismissed_activity_ids?: string[];
};


type VersionTwoBackupData = {
    version: 2;
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    deleted_transactions: DeletedTransaction[];
    dismissed_activity_ids?: string[];
};


type LegacyBackupData = {
    version: 1;
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
};


type Store = BackupData;


type DataError = {
    message: string;
};


type DataResult<T> = {
    data: T | null;
    error: DataError | null;
};


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY =
    'my-home-finance-personal-v1';


const DATA_EVENT =
    'mhf-data';


const TRASH_RETENTION_DAYS =
    30;


function isDevelopmentBuild(): boolean {
    return (
        import.meta as unknown as {
            env?: {
                DEV?: boolean;
            };
        }
    ).env?.DEV === true;
}


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function emptyStore(): Store {
    return {
        version: 4,
        transactions: [],
        budgets: [],
        goals: [],
        savings_contributions: [],
        deleted_transactions: [],
        dismissed_activity_ids: [],
        recurring_rules: []
    };
}


function createId(): string {
    if (
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
    ) {
        return crypto.randomUUID();
    }

    return [
        Date.now().toString(36),
        Math.random()
            .toString(36)
            .slice(2)
    ].join('-');
}


function asError(
    error: unknown,
    fallback: string
): DataError {
    if (error instanceof Error) {
        return {
            message:
                error.message ||
                fallback
        };
    }

    return {
        message: fallback
    };
}


function emitChange(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new Event(DATA_EVENT)
    );
}


/* =========================================================
   DATE HELPERS
   ========================================================= */

export function localDateString(
    date = new Date()
): string {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            date.getDate()
        ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


export function range(
    year: number,
    month: number
): [string, string] {
    const startDate =
        new Date(
            year,
            month - 1,
            1
        );

    const endDate =
        new Date(
            year,
            month,
            0
        );

    return [
        localDateString(
            startDate
        ),

        localDateString(
            endDate
        )
    ];
}


/* =========================================================
   STORE NORMALIZATION
   ========================================================= */

function normalizeStore(
    value: unknown
): Store {
    if (
        !value ||
        typeof value !== 'object'
    ) {
        return emptyStore();
    }

    const source =
        value as Partial<Store>;

    const transactions: Transaction[] =
        Array.isArray(
            source.transactions
        )
            ? source.transactions
            : [];

    const budgets: Budget[] =
        Array.isArray(
            source.budgets
        )
            ? source.budgets
            : [];

    const goals: Goal[] =
        Array.isArray(
            source.goals
        )
            ? source.goals.map(
                goal => ({
                    ...goal,
                    base_amount:
                        Number(
                            goal.base_amount ??
                            goal.current_amount
                        ) || 0
                })
            )
            : [];

    const savingsContributions: SavingsContribution[] =
        Array.isArray(
            source.savings_contributions
        )
            ? source.savings_contributions.filter(
                (item): item is SavingsContribution =>
                    !!item &&
                    typeof item === 'object' &&
                    (item.track === 'Personal Savings' || item.track === 'Home Savings') &&
                    typeof item.month_start === 'string' &&
                    Number.isFinite(Number(item.amount))
            ).map(
                item => ({
                    ...item,
                    amount: Number(item.amount),
                    notes: typeof item.notes === 'string' ? item.notes : null,
                    updated_at: item.updated_at || item.created_at || new Date().toISOString()
                })
            )
            : [];

    const deletedTransactions: DeletedTransaction[] =
        Array.isArray(
            source.deleted_transactions
        )
            ? source.deleted_transactions
            : [];

    const dismissedActivityIds =
        Array.isArray(source.dismissed_activity_ids)
            ? source.dismissed_activity_ids.filter(
                (id): id is string => typeof id === 'string'
            )
            : [];

    const recurringRules: RecurringRule[] =
        Array.isArray(source.recurring_rules)
            ? source.recurring_rules.filter(
                (item): item is RecurringRule =>
                    !!item &&
                    typeof item === 'object' &&
                    typeof item.id === 'string' &&
                    (item.kind === 'income' || item.kind === 'expense' || item.kind === 'savings') &&
                    (item.frequency === 'weekly' || item.frequency === 'biweekly' || item.frequency === 'monthly') &&
                    typeof item.next_occurrence === 'string'
            ).map(item => ({
                ...item,
                amount: Number(item.amount) || 0,
                enabled: item.enabled !== false,
                end_date: item.end_date || null,
                savings_track: item.savings_track === 'Personal Savings' || item.savings_track === 'Home Savings' ? item.savings_track : null,
                hours_worked: Number.isFinite(Number(item.hours_worked)) ? Number(item.hours_worked) : null
            }))
            : [];

    return {
        version: 4,
        transactions,
        budgets,
        goals,
        savings_contributions: savingsContributions,
        deleted_transactions:
        deletedTransactions,
        dismissed_activity_ids: dismissedActivityIds,
        recurring_rules: recurringRules
    };
}


/* =========================================================
   TRASH EXPIRATION
   ========================================================= */

function removeExpiredTrash(
    store: Store
): Store {
    const retentionMs =
        TRASH_RETENTION_DAYS *
        24 *
        60 *
        60 *
        1000;

    const cutoff =
        Date.now() -
        retentionMs;

    const deletedTransactions =
        store.deleted_transactions.filter(
            item => {
                const deletedAt =
                    new Date(
                        item.deleted_at
                    ).getTime();

                return (
                    Number.isFinite(
                        deletedAt
                    ) &&
                    deletedAt >= cutoff
                );
            }
        );

    if (
        deletedTransactions.length ===
        store.deleted_transactions.length
    ) {
        return store;
    }

    return {
        ...store,
        deleted_transactions:
        deletedTransactions
    };
}


/* =========================================================
   READ / WRITE STORE
   ========================================================= */

function readStore(): Store {
    if (
        typeof localStorage ===
        'undefined'
    ) {
        return emptyStore();
    }

    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!raw) {
            return emptyStore();
        }

        const parsed =
            JSON.parse(raw) as unknown;

        const normalized =
            removeExpiredTrash(
                normalizeStore(
                    parsed
                )
            );

        const parsedVersion =
            (
                parsed &&
                typeof parsed === 'object' &&
                'version' in parsed
            )
                ? (
                    parsed as {
                        version?: unknown;
                    }
                ).version
                : undefined;

        const parsedDeletedCount =
            (
                parsed &&
                typeof parsed === 'object' &&
                'deleted_transactions' in parsed &&
                Array.isArray(
                    (
                        parsed as {
                            deleted_transactions?: unknown;
                        }
                    ).deleted_transactions
                )
            )
                ? (
                    (
                        parsed as {
                            deleted_transactions:
                                unknown[];
                        }
                    ).deleted_transactions
                ).length
                : 0;

        if (
            parsedVersion !== 3 ||
            parsedDeletedCount !==
            normalized
                .deleted_transactions
                .length
        ) {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    normalized
                )
            );
        }

        return normalized;

    } catch {
        return emptyStore();
    }
}


function writeStore(
    store: Store
): void {
    if (
        typeof localStorage ===
        'undefined'
    ) {
        return;
    }

    const normalized =
        removeExpiredTrash(
            normalizeStore(
                store
            )
        );

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            normalized
        )
    );

    emitChange();
}


/* =========================================================
   DISPLAY STATUS
   ========================================================= */

export function getDisplayStatus(
    transaction: Transaction,
    today =
    localDateString()
): DisplayStatus {
    if (
        transaction.kind ===
        'income'
    ) {
        return 'paid';
    }

    if (
        transaction.status ===
        'paid'
    ) {
        return 'paid';
    }

    if (!transaction.due_date) {
        return 'unpaid';
    }

    if (
        transaction.due_date <
        today
    ) {
        return 'overdue';
    }

    if (
        transaction.due_date ===
        today
    ) {
        return 'due-today';
    }

    return 'upcoming';
}


export function displayStatusLabel(
    status: DisplayStatus
): string {
    switch (status) {
        case 'paid':
            return 'Paid';

        case 'upcoming':
            return 'Upcoming';

        case 'due-today':
            return 'Due Today';

        case 'overdue':
            return 'Overdue';

        case 'unpaid':
            return 'Unpaid';

        default:
            return 'Unpaid';
    }
}


/* =========================================================
   TRANSACTIONS
   ========================================================= */

export async function listTransactions(
    start: string,
    end: string
): Promise<
    DataResult<Transaction[]>
> {
    try {
        const store =
            readStore();

        const transactions =
            store.transactions
                .filter(
                    transaction =>
                        transaction
                            .occurred_on >=
                        start &&
                        transaction
                            .occurred_on <=
                        end
                )
                .sort(
                    (a, b) =>
                        b.occurred_on
                            .localeCompare(
                                a.occurred_on
                            ) ||
                        b.created_at
                            .localeCompare(
                                a.created_at
                            )
                );

        return {
            data: transactions,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to load transactions.'
                )
        };
    }
}


export async function listYear(
    year: number
): Promise<
    DataResult<Transaction[]>
> {
    try {
        const store =
            readStore();

        const prefix =
            `${year}-`;

        const transactions =
            store.transactions
                .filter(
                    transaction =>
                        transaction
                            .occurred_on
                            .startsWith(
                                prefix
                            )
                )
                .sort(
                    (a, b) =>
                        b.occurred_on
                            .localeCompare(
                                a.occurred_on
                            ) ||
                        b.created_at
                            .localeCompare(
                                a.created_at
                            )
                );

        return {
            data: transactions,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to load yearly transactions.'
                )
        };
    }
}


export async function addTransaction(
    transaction: Omit<
        Transaction,
        'id' | 'created_at'
    >
): Promise<
    DataResult<Transaction>
> {
    try {
        const store =
            readStore();

        const created:
            Transaction = {
            ...transaction,
            id: createId(),
            created_at:
                new Date()
                    .toISOString()
        };

        writeStore({
            ...store,

            transactions: [
                created,
                ...store.transactions
            ]
        });

        return {
            data: created,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to add transaction.'
                )
        };
    }
}


/* =========================================================
   DEVELOPMENT-ONLY HISTORICAL TEST DATA
   ========================================================= */

export async function seedHistoricalTestData(): Promise<DataResult<import('./historicalTestData').HistoricalTestSeedResult>> {
    try {
        if (!isDevelopmentBuild()) {
            return { data: null, error: { message: 'Historical test data is available only in development.' } };
        }

        const store = readStore();
        const existing = store.transactions.filter(isHistoricalTestTransaction);
        const generated = createHistoricalTestTransactions();

        if (existing.length === generated.length) {
            return { data: { added: 0, existing: existing.length, start: '2016-01-01', end: '2025-12-31' }, error: null };
        }

        // Replace only a partial interrupted seed; real records are preserved.
        writeStore({
            ...store,
            transactions: [...generated, ...store.transactions.filter(item => !isHistoricalTestTransaction(item))],
            deleted_transactions: store.deleted_transactions.filter(item => !isHistoricalTestTransaction(item.transaction)),
            dismissed_activity_ids: (store.dismissed_activity_ids || []).filter(id => !id.startsWith('mhf-historical-test-v1-'))
        });
        return { data: { added: generated.length, existing: existing.length, start: '2016-01-01', end: '2025-12-31' }, error: null };
    } catch (error) {
        return { data: null, error: asError(error, 'Unable to seed historical test data.') };
    }
}

export async function clearHistoricalTestData(): Promise<DataResult<import('./historicalTestData').HistoricalTestCleanupResult>> {
    try {
        if (!isDevelopmentBuild()) {
            return { data: null, error: { message: 'Historical test data is available only in development.' } };
        }

        const store = readStore();
        const removed = store.transactions.filter(isHistoricalTestTransaction).length;
        writeStore({
            ...store,
            transactions: store.transactions.filter(item => !isHistoricalTestTransaction(item)),
            deleted_transactions: store.deleted_transactions.filter(item => !isHistoricalTestTransaction(item.transaction)),
            dismissed_activity_ids: (store.dismissed_activity_ids || []).filter(id => !id.startsWith('mhf-historical-test-v1-'))
        });
        return { data: { removed }, error: null };
    } catch (error) {
        return { data: null, error: asError(error, 'Unable to clear historical test data.') };
    }
}

export async function updateTransaction(
    id: string,
    changes: Partial<
        Omit<
            Transaction,
            'id' | 'created_at'
        >
    >
): Promise<
    DataResult<Transaction>
> {
    try {
        const store =
            readStore();

        const existing =
            store.transactions.find(
                transaction =>
                    transaction.id === id
            );

        if (!existing) {
            return {
                data: null,
                error: {
                    message:
                        'Transaction not found.'
                }
            };
        }

        const updated:
            Transaction = {
            ...existing,
            ...changes,
            id:
            existing.id,
            created_at:
            existing.created_at
        };

        writeStore({
            ...store,

            transactions:
                store.transactions.map(
                    transaction =>
                        transaction.id === id
                            ? updated
                            : transaction
                )
        });

        return {
            data: updated,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to update transaction.'
                )
        };
    }
}


/* =========================================================
   RECENTLY DELETED
   ========================================================= */

export async function deleteTransaction(
    id: string
): Promise<
    DataResult<null>
> {
    try {
        const store =
            readStore();

        const transaction =
            store.transactions.find(
                item =>
                    item.id === id
            );

        if (!transaction) {
            return {
                data: null,
                error: {
                    message:
                        'Transaction not found.'
                }
            };
        }

        const deleted:
            DeletedTransaction = {
            transaction,
            deleted_at:
                new Date()
                    .toISOString()
        };

        writeStore({
            ...store,

            transactions:
                store.transactions.filter(
                    item =>
                        item.id !== id
                ),

            deleted_transactions: [
                deleted,
                ...store.deleted_transactions
                    .filter(
                        item =>
                            item.transaction
                                .id !== id
                    )
            ]
        });

        return {
            data: null,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to delete transaction.'
                )
        };
    }
}


export async function listDeletedTransactions():
    Promise<
        DataResult<
            DeletedTransaction[]
        >
    > {
    try {
        const store =
            readStore();

        const deleted =
            [
                ...store
                    .deleted_transactions
            ].sort(
                (a, b) =>
                    b.deleted_at
                        .localeCompare(
                            a.deleted_at
                        )
            );

        return {
            data: deleted,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to load recently deleted transactions.'
                )
        };
    }
}


export async function restoreDeletedTransaction(
    id: string
): Promise<
    DataResult<Transaction>
> {
    try {
        const store =
            readStore();

        const deleted =
            store
                .deleted_transactions
                .find(
                    item =>
                        item.transaction
                            .id === id
                );

        if (!deleted) {
            return {
                data: null,
                error: {
                    message:
                        'Deleted transaction not found.'
                }
            };
        }

        const alreadyExists =
            store.transactions.some(
                transaction =>
                    transaction.id === id
            );

        const transactions =
            alreadyExists
                ? store.transactions
                : [
                    deleted.transaction,
                    ...store.transactions
                ];

        writeStore({
            ...store,

            transactions,

            deleted_transactions:
                store
                    .deleted_transactions
                    .filter(
                        item =>
                            item.transaction
                                .id !== id
                    )
        });

        return {
            data:
            deleted.transaction,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to restore transaction.'
                )
        };
    }
}


export async function permanentlyDeleteTransaction(
    id: string
): Promise<
    DataResult<null>
> {
    try {
        const store =
            readStore();

        writeStore({
            ...store,

            deleted_transactions:
                store
                    .deleted_transactions
                    .filter(
                        item =>
                            item.transaction
                                .id !== id
                    )
        });

        return {
            data: null,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to permanently delete transaction.'
                )
        };
    }
}


export async function emptyDeletedTransactions():
    Promise<
        DataResult<null>
    > {
    try {
        const store =
            readStore();

        writeStore({
            ...store,
            deleted_transactions: []
        });

        return {
            data: null,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to empty Recently Deleted.'
                )
        };
    }
}


/* =========================================================
   BUDGET
   ========================================================= */

export async function getBudget(
    monthStart: string
): Promise<
    DataResult<Budget | null>
> {
    try {
        const store =
            readStore();

        const budget =
            store.budgets.find(
                item =>
                    item.month_start ===
                    monthStart
            ) || null;

        return {
            data: budget,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to load budget.'
                )
        };
    }
}


export async function setBudget(
    monthStart: string,
    amount: number
): Promise<
    DataResult<Budget>
> {
    try {
        if (
            !Number.isFinite(
                amount
            ) ||
            amount < 0
        ) {
            return {
                data: null,
                error: {
                    message:
                        'Budget must be zero or greater.'
                }
            };
        }

        const store =
            readStore();

        const budget:
            Budget = {
            month_start:
            monthStart,
            amount,
            category_amounts:
                store.budgets.find(
                    item => item.month_start === monthStart
                )?.category_amounts
        };

        const exists =
            store.budgets.some(
                item =>
                    item.month_start ===
                    monthStart
            );

        const budgets =
            exists
                ? store.budgets.map(
                    item =>
                        item.month_start ===
                        monthStart
                            ? budget
                            : item
                )
                : [
                    ...store.budgets,
                    budget
                ];

        writeStore({
            ...store,
            budgets
        });

        return {
            data: budget,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to save budget.'
                )
        };
    }
}


/* =========================================================
   SAVINGS GOALS
   ========================================================= */

export async function listGoals():
    Promise<
        DataResult<Goal[]>
    > {
    try {
        const store =
            readStore();

        return {
            data: [
                ...store.goals
            ],
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to load savings goals.'
                )
        };
    }
}


export async function saveGoal(
    goal: Omit<
        Goal,
        'id' | 'created_at'
    > & {
        id?: string;
        created_at?: string;
    }
): Promise<
    DataResult<Goal>
> {
    try {
        const store =
            readStore();

        const existing =
            store.goals.find(
                item =>
                    (
                        goal.id &&
                        item.id === goal.id
                    ) ||
                    item.name ===
                    goal.name
            );

        const saved:
            Goal = {
            id:
                existing?.id ||
                goal.id ||
                createId(),

            name:
            goal.name,

            current_amount:
                existing?.current_amount ??
                (Number(goal.current_amount) || 0),

            goal_amount:
                Number(
                    goal.goal_amount
                ) || 0,

            base_amount:
                existing?.base_amount ??
                existing?.current_amount ??
                (Number(goal.current_amount) || 0),

            created_at:
                existing
                    ?.created_at ||
                goal.created_at ||
                new Date()
                    .toISOString()
        };

        const goals =
            existing
                ? store.goals.map(
                    item =>
                        item.id ===
                        existing.id
                            ? saved
                            : item
                )
                : [
                    ...store.goals,
                    saved
                ];

        writeStore({
            ...store,
            goals
        });

        return {
            data: saved,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to save savings goal.'
                )
        };
    }
}


/* =========================================================
   MONTHLY SAVINGS LEDGER
   ========================================================= */

export async function listSavingsContributions():
    Promise<DataResult<SavingsContribution[]>> {
    try {
        const store = readStore();

        return {
            data: [...store.savings_contributions].sort(
                (a, b) => a.month_start.localeCompare(b.month_start)
            ),
            error: null
        };
    } catch (error) {
        return {
            data: null,
            error: asError(error, 'Unable to load savings history.')
        };
    }
}


export async function upsertSavingsContribution(
    contribution: Pick<
        SavingsContribution,
        'track' | 'month_start' | 'amount' | 'notes'
    >
): Promise<DataResult<SavingsContribution>> {
    try {
        if (
            contribution.track !== 'Personal Savings' &&
            contribution.track !== 'Home Savings'
        ) {
            return {
                data: null,
                error: { message: 'Choose a valid savings track.' }
            };
        }

        if (!/^\d{4}-\d{2}-01$/.test(contribution.month_start)) {
            return {
                data: null,
                error: { message: 'Choose a valid savings month.' }
            };
        }

        const amount = Number(contribution.amount);

        if (!Number.isFinite(amount) || amount < 0) {
            return {
                data: null,
                error: { message: 'Enter a valid savings contribution.' }
            };
        }

        const store = readStore();
        const existing = store.savings_contributions.find(
            item =>
                item.track === contribution.track &&
                item.month_start === contribution.month_start
        );
        const timestamp = new Date().toISOString();
        const saved: SavingsContribution = {
            id: existing?.id || createId(),
            track: contribution.track,
            month_start: contribution.month_start,
            amount,
            notes: contribution.notes?.trim() || null,
            created_at: existing?.created_at || timestamp,
            updated_at: timestamp
        };

        writeStore({
            ...store,
            savings_contributions: existing
                ? store.savings_contributions.map(
                    item => item.id === existing.id ? saved : item
                )
                : [...store.savings_contributions, saved]
        });

        return { data: saved, error: null };
    } catch (error) {
        return {
            data: null,
            error: asError(error, 'Unable to save savings contribution.')
        };
    }
}


/* =========================================================
   RECURRING FINANCE
   ========================================================= */

function addRecurringDate(
    value: string,
    frequency: RecurringFrequency
) {
    const date = new Date(`${value}T12:00:00`);
    if (frequency === 'monthly') {
        const day = date.getDate();
        date.setDate(1);
        date.setMonth(date.getMonth() + 1);
        date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
    } else {
        date.setDate(
            date.getDate() +
            (frequency === 'weekly' ? 7 : 14)
        );
    }

    return localDateString(date);
}

export async function listRecurringRules(): Promise<DataResult<RecurringRule[]>> {
    try {
        return { data: [...readStore().recurring_rules], error: null };
    } catch (error) {
        return { data: null, error: asError(error, 'Unable to load recurring rules.') };
    }
}

export async function upsertRecurringRule(
    rule: Omit<RecurringRule, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<DataResult<RecurringRule>> {
    try {
        if (!rule.name.trim() || !Number.isFinite(rule.amount) || rule.amount <= 0) {
            return { data: null, error: { message: 'Enter a name and amount greater than zero.' } };
        }
        if (rule.kind === 'savings' && !rule.savings_track) {
            return { data: null, error: { message: 'Choose a savings track.' } };
        }
        if (rule.end_date && rule.end_date < rule.start_date) {
            return { data: null, error: { message: 'End date must be on or after the start date.' } };
        }
        const store = readStore();
        const existing = rule.id ? store.recurring_rules.find(item => item.id === rule.id) : undefined;
        const timestamp = new Date().toISOString();
        const saved: RecurringRule = {
            ...rule,
            id: existing?.id || createId(),
            created_at: existing?.created_at || timestamp,
            updated_at: timestamp
        };
        writeStore({
            ...store,
            recurring_rules: existing
                ? store.recurring_rules.map(item => item.id === saved.id ? saved : item)
                : [saved, ...store.recurring_rules]
        });
        return { data: saved, error: null };
    } catch (error) {
        return { data: null, error: asError(error, 'Unable to save recurring rule.') };
    }
}

export async function deleteRecurringRule(id: string): Promise<DataResult<null>> {
    try {
        const store = readStore();
        writeStore({ ...store, recurring_rules: store.recurring_rules.filter(item => item.id !== id) });
        return { data: null, error: null };
    } catch (error) {
        return { data: null, error: asError(error, 'Unable to delete recurring rule.') };
    }
}

export async function materializeDueRecurringRecords(
    today = localDateString()
): Promise<DataResult<number>> {
    try {
        const store = readStore();
        let created = 0;
        const transactions = [...store.transactions];
        const contributions = [...store.savings_contributions];
        const rules = store.recurring_rules.map(rule => ({ ...rule }));

        rules.forEach(rule => {
            while (rule.enabled && rule.next_occurrence <= today && (!rule.end_date || rule.next_occurrence <= rule.end_date)) {
                const occurrenceId = `mhf-recurring-v1-${rule.id}-${rule.next_occurrence}`;
                if (rule.kind === 'savings') {
                    const monthStart = `${rule.next_occurrence.slice(0, 7)}-01`;
                    const existing = contributions.find(item => item.track === rule.savings_track && item.month_start === monthStart);
                    if (!existing && rule.savings_track) {
                        const timestamp = new Date().toISOString();
                        contributions.push({
                            id: occurrenceId,
                            track: rule.savings_track,
                            month_start: monthStart,
                            amount: rule.amount,
                            notes: rule.notes,
                            recurring_occurrence_id: occurrenceId,
                            created_at: timestamp,
                            updated_at: timestamp
                        });
                        created += 1;
                    }
                } else if (!transactions.some(item => item.recurring_occurrence_id === occurrenceId)) {
                    const timestamp = new Date().toISOString();
                    transactions.unshift({
                        id: occurrenceId,
                        occurred_on: rule.next_occurrence,
                        kind: rule.kind,
                        group_name: rule.group_name,
                        category: rule.category,
                        name: rule.name,
                        merchant: rule.merchant,
                        amount: rule.amount,
                        status: rule.kind === 'expense' ? rule.status : 'paid',
                        payment_method: rule.payment_method,
                        due_date: rule.due_date,
                        notes: rule.notes,
                        hours_worked: rule.kind === 'income' ? rule.hours_worked : null,
                        recurring_occurrence_id: occurrenceId,
                        created_at: timestamp
                    });
                    created += 1;
                }
                rule.next_occurrence = addRecurringDate(rule.next_occurrence, rule.frequency);
            }
        });

        writeStore({ ...store, transactions, savings_contributions: contributions, recurring_rules: rules });
        return { data: created, error: null };
    } catch (error) {
        return { data: null, error: asError(error, 'Unable to materialize recurring records.') };
    }
}


/* =========================================================
   BACKUP
   ========================================================= */

export async function exportBackup():
    Promise<
        DataResult<BackupData>
    > {
    try {
        const store =
            readStore();

        const backup:
            BackupData = {
            version: 4,

            transactions: [
                ...store.transactions
            ],

            budgets: [
                ...store.budgets
            ],

            goals: [
                ...store.goals
            ],

            savings_contributions: [
                ...store.savings_contributions
            ],

            deleted_transactions: [
                ...store
                    .deleted_transactions
            ],

            dismissed_activity_ids: [
                ...(store.dismissed_activity_ids || [])
            ],

            recurring_rules: [
                ...store.recurring_rules
            ]
        };

        return {
            data: backup,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to create backup.'
                )
        };
    }
}

/** Archival-only subset export. It is intentionally not restore-compatible. */
export async function exportFilteredData(options: { year: number; month?: number }): Promise<DataResult<{
    kind: 'filtered-data-export';
    scope: 'year' | 'month';
    year: number;
    month?: number;
    generated_at: string;
    transactions: Transaction[];
    budgets: Budget[];
    savings_contributions: SavingsContribution[];
}> > {
    try {
        const store = readStore();
        const prefix = `${options.year}-${options.month ? String(options.month).padStart(2, '0') : ''}`;
        const inScope = (date: string) => date.startsWith(prefix);
        return { data: {
            kind: 'filtered-data-export', scope: options.month ? 'month' : 'year', year: options.year, month: options.month,
            generated_at: new Date().toISOString(),
            transactions: store.transactions.filter(item => inScope(item.occurred_on)),
            budgets: store.budgets.filter(item => inScope(item.month_start)),
            savings_contributions: store.savings_contributions.filter(item => inScope(item.month_start))
        }, error: null };
    } catch (error) { return { data: null, error: asError(error, 'Unable to create filtered data export.') }; }
}


export async function replaceBackup(
    backup:
        | BackupData
        | VersionThreeBackupData
        | VersionTwoBackupData
        | LegacyBackupData
): Promise<
    DataResult<null>
> {
    try {
        if (
            !backup ||
            typeof backup !==
            'object'
        ) {
            return {
                data: null,
                error: {
                    message:
                        'Invalid backup file.'
                }
            };
        }

        if (
            backup.version !== 1 &&
            backup.version !== 2 &&
            backup.version !== 3 &&
            backup.version !== 4
        ) {
            return {
                data: null,
                error: {
                    message:
                        'Unsupported backup version.'
                }
            };
        }

        if (
            !Array.isArray(
                backup.transactions
            ) ||
            !Array.isArray(
                backup.budgets
            ) ||
            !Array.isArray(
                backup.goals
            )
        ) {
            return {
                data: null,
                error: {
                    message:
                        'Backup data is incomplete.'
                }
            };
        }

        const deletedTransactions:
            DeletedTransaction[] =
            (backup.version === 2 || backup.version === 3 || backup.version === 4) &&
            Array.isArray(
                backup
                    .deleted_transactions
            )
                ? backup
                    .deleted_transactions
                : [];

        const savingsContributions: SavingsContribution[] =
            (backup.version === 3 || backup.version === 4) &&
            Array.isArray(backup.savings_contributions)
                ? backup.savings_contributions
                : [];

        writeStore({
            version: 4,

            transactions:
            backup.transactions,

            budgets:
            backup.budgets,

            goals:
            backup.goals,

            savings_contributions:
            savingsContributions,

            deleted_transactions:
            deletedTransactions,

            dismissed_activity_ids:
                (backup.version === 2 || backup.version === 3 || backup.version === 4) &&
                Array.isArray(backup.dismissed_activity_ids)
                    ? backup.dismissed_activity_ids.filter(
                        (id): id is string => typeof id === 'string'
                    )
                    : [],

            recurring_rules:
                backup.version === 4 &&
                Array.isArray(backup.recurring_rules)
                    ? backup.recurring_rules
                    : []
        });

        return {
            data: null,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to restore backup.'
                )
        };
    }
}


/* =========================================================
   RESET
   ========================================================= */

export async function resetFinanceData():
    Promise<
        DataResult<null>
    > {
    try {
        writeStore(
            emptyStore()
        );

        return {
            data: null,
            error: null
        };

    } catch (error) {
        return {
            data: null,
            error:
                asError(
                    error,
                    'Unable to reset financial data.'
                )
        };
    }
}

export async function selectivelyResetFinanceData(options: {
    kinds?: Kind[];
    year?: number;
    month?: number;
    day?: number;
    savings?: boolean;
    goals?: boolean;
    recurringRules?: boolean;
}): Promise<DataResult<null>> {
    try {
        const store = readStore();
        const prefix = options.year
            ? `${options.year}-${options.month ? String(options.month).padStart(2, '0') : ''}${options.day ? `-${String(options.day).padStart(2, '0')}` : ''}`
            : null;
        const inScope = (value: string) => !prefix || value.startsWith(prefix);
        const selectedKinds = options.kinds || [];
        writeStore({
            ...store,
            transactions: selectedKinds.length
                ? store.transactions.filter(item => !(selectedKinds.includes(item.kind) && inScope(item.occurred_on)))
                : store.transactions,
            savings_contributions: options.savings
                ? store.savings_contributions.filter(item => !inScope(item.month_start))
                : store.savings_contributions,
            goals: options.goals ? [] : store.goals,
            recurring_rules: options.recurringRules ? [] : store.recurring_rules
        });
        return { data: null, error: null };
    } catch (error) {
        return { data: null, error: asError(error, 'Unable to reset selected data.') };
    }
}


/* =========================================================
   SUBSCRIPTION
   ========================================================= */

export function subscribe(
    callback: () => void
): () => void {
    if (
        typeof window ===
        'undefined'
    ) {
        return () => undefined;
    }

    const handleLocalChange =
        () => {
            callback();
        };

    const handleStorageChange =
        (
            event: StorageEvent
        ) => {
            if (
                event.key ===
                STORAGE_KEY ||
                event.key === null
            ) {
                callback();
            }
        };

    window.addEventListener(
        DATA_EVENT,
        handleLocalChange
    );

    window.addEventListener(
        'storage',
        handleStorageChange
    );

    return () => {
        window.removeEventListener(
            DATA_EVENT,
            handleLocalChange
        );

        window.removeEventListener(
            'storage',
            handleStorageChange
        );
    };
}


export async function listActionablePayments(): Promise<DataResult<Transaction[]>> {
    try {
        const transactions = readStore().transactions
            .filter(item => item.kind === 'expense' && item.status !== 'paid')
            .sort((a, b) => (a.due_date || a.occurred_on).localeCompare(
                b.due_date || b.occurred_on
            ));

        return { data: transactions, error: null };
    } catch (error) {
        return {
            data: null,
            error: asError(error, 'Unable to load actionable payments.')
        };
    }
}


export async function setCategoryBudgets(
    monthStart: string,
    categoryAmounts: Partial<Record<ExpenseGroup, number>>
): Promise<DataResult<Budget>> {
    try {
        const sanitized = Object.fromEntries(
            Object.entries(categoryAmounts).filter(
                ([, amount]) => Number.isFinite(amount) && Number(amount) >= 0
            )
        ) as Partial<Record<ExpenseGroup, number>>;

        const store = readStore();
        const existing = store.budgets.find(
            item => item.month_start === monthStart
        );
        const budget: Budget = {
            month_start: monthStart,
            amount: existing?.amount || 0,
            category_amounts: sanitized
        };
        const budgets = existing
            ? store.budgets.map(item =>
                item.month_start === monthStart ? budget : item
            )
            : [...store.budgets, budget];

        writeStore({ ...store, budgets });
        return { data: budget, error: null };
    } catch (error) {
        return {
            data: null,
            error: asError(error, 'Unable to save category budgets.')
        };
    }
}


export async function dismissHomeActivity(
    transactionId: string
): Promise<DataResult<null>> {
    try {
        const store = readStore();
        const dismissed = store.dismissed_activity_ids || [];

        writeStore({
            ...store,
            dismissed_activity_ids: dismissed.includes(transactionId)
                ? dismissed
                : [...dismissed, transactionId]
        });
        return { data: null, error: null };
    } catch (error) {
        return {
            data: null,
            error: asError(error, 'Unable to dismiss Home activity.')
        };
    }
}


export async function listDismissedHomeActivities(): Promise<DataResult<string[]>> {
    try {
        return {
            data: [...(readStore().dismissed_activity_ids || [])],
            error: null
        };
    } catch (error) {
        return {
            data: null,
            error: asError(error, 'Unable to load dismissed Home activity.')
        };
    }
}
