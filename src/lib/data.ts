/* =========================================================
   MY HOME FINANCE v27
   Local Data Layer
   localStorage + Recently Deleted + Backup v2
   ========================================================= */


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
    created_at: string;
};


export type Budget = {
    month_start: string;
    amount: number;
};


export type Goal = {
    id: string;
    name:
        | 'Personal Savings'
        | 'Home Savings';
    current_amount: number;
    goal_amount: number;
    created_at: string;
};


export type DeletedTransaction = {
    transaction: Transaction;
    deleted_at: string;
};


export type BackupData = {
    version: 2;
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    deleted_transactions: DeletedTransaction[];
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


/* =========================================================
   BASIC HELPERS
   ========================================================= */

function emptyStore(): Store {
    return {
        version: 2,
        transactions: [],
        budgets: [],
        goals: [],
        deleted_transactions: []
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
            ? source.goals
            : [];

    const deletedTransactions: DeletedTransaction[] =
        Array.isArray(
            source.deleted_transactions
        )
            ? source.deleted_transactions
            : [];

    return {
        version: 2,
        transactions,
        budgets,
        goals,
        deleted_transactions:
        deletedTransactions
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
            parsedVersion !== 2 ||
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
            amount
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
                Number(
                    goal.current_amount
                ) || 0,

            goal_amount:
                Number(
                    goal.goal_amount
                ) || 0,

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
            version: 2,

            transactions: [
                ...store.transactions
            ],

            budgets: [
                ...store.budgets
            ],

            goals: [
                ...store.goals
            ],

            deleted_transactions: [
                ...store
                    .deleted_transactions
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


export async function replaceBackup(
    backup:
        | BackupData
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
            backup.version !== 2
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
            backup.version === 2 &&
            Array.isArray(
                backup
                    .deleted_transactions
            )
                ? backup
                    .deleted_transactions
                : [];

        writeStore({
            version: 2,

            transactions:
            backup.transactions,

            budgets:
            backup.budgets,

            goals:
            backup.goals,

            deleted_transactions:
            deletedTransactions
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