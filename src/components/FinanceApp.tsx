import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react';

import type {
    DeletedTransaction,
    DisplayStatus,
    ExpenseGroup,
    Goal,
    Transaction
} from '../lib/data';

import {
    deleteTransaction,
    displayStatusLabel,
    emptyDeletedTransactions,
    exportBackup,
    getBudget,
    getDisplayStatus,
    listDeletedTransactions,
    listGoals,
    listTransactions,
    listYear,
    localDateString,
    permanentlyDeleteTransaction,
    range,
    resetFinanceData,
    restoreDeletedTransaction,
    saveGoal,
    setBudget,
    subscribe,
    updateTransaction
} from '../lib/data';

import TransactionModal from './TransactionModal';
import RestoreBackup from './RestoreBackup';

import {
    monthlyReportHtml,
    printHtml,
    yearlyReportHtml
} from '../lib/reports';


/* =========================================================
   TYPES
   ========================================================= */

type Page =
    | 'Home'
    | 'Expense'
    | 'Income'
    | 'Calendar'
    | 'More';

type CalendarReturnPage =
    | 'Home'
    | 'Expense'
    | 'Income';

type MoreView =
    | 'Menu'
    | 'Reports'
    | 'Backup'
    | 'Trash'
    | 'Settings';

type ExpenseFilter =
    | 'All'
    | ExpenseGroup;


/* =========================================================
   CONSTANTS
   ========================================================= */

const expenseGroups: ExpenseGroup[] = [
    'Home',
    'Personal',
    'Credit & Loan',
    'Others'
];

const categoryColors = [
    '#6ed9bd',
    '#66b9ef',
    '#f3c75d',
    '#f38a93'
];


/* =========================================================
   HELPERS
   ========================================================= */

const money = (amount: number) =>
    new Intl.NumberFormat(
        'en-US',
        {
            style: 'currency',
            currency: 'USD'
        }
    ).format(amount);


function parseLocalDate(
    value: string
) {
    const [
        year,
        month,
        day
    ] = value
        .split('-')
        .map(Number);

    return new Date(
        year,
        month - 1,
        day
    );
}


function shortDate(
    value: string | null
) {
    if (!value) {
        return 'No date';
    }

    return parseLocalDate(
        value
    ).toLocaleDateString(
        'en-US',
        {
            month: 'short',
            day: 'numeric'
        }
    );
}


function longDate(
    value: string | null
) {
    if (!value) {
        return 'Not set';
    }

    return parseLocalDate(
        value
    ).toLocaleDateString(
        'en-US',
        {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        }
    );
}


function fullDate() {
    return new Date()
        .toLocaleDateString(
            'en-US',
            {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            }
        );
}


function monthName(
    month: number
) {
    return new Date(
        2000,
        month - 1
    ).toLocaleString(
        'en-US',
        {
            month: 'long'
        }
    );
}


function monthLabel(
    year: number,
    month: number
) {
    return `${monthName(month)} ${year}`;
}


function normalizeGroup(
    group: string | null
): ExpenseGroup | null {
    switch (group) {
        case 'Home Expenses':
            return 'Home';

        case 'Credit Card / Debt':
            return 'Credit & Loan';

        case 'Everyday / Misc':
            return 'Others';

        case 'Home':
        case 'Personal':
        case 'Credit & Loan':
        case 'Others':
            return group;

        default:
            return null;
    }
}


function greeting() {
    const hour =
        new Date().getHours();

    if (hour < 12) {
        return 'Good Morning';
    }

    if (hour < 17) {
        return 'Good Afternoon';
    }

    return 'Good Evening';
}


function statusClass(
    status: DisplayStatus
) {
    return `statusBadge status-${status}`;
}


function paymentMethodLabel(
    transaction: Transaction
) {
    return (
        transaction.payment_method
            ?.trim() ||
        'Not specified'
    );
}


/* =========================================================
   SVG ICONS
   ========================================================= */

function Icon({
                  name,
                  size = 22
              }: {
    name:
        | 'home'
        | 'wallet'
        | 'card'
        | 'more'
        | 'income'
        | 'expense'
        | 'calendar'
        | 'eye'
        | 'edit'
        | 'trash'
        | 'check'
        | 'clock'
        | 'chart'
        | 'user'
        | 'bank'
        | 'settings'
        | 'backup'
        | 'report'
        | 'sun'
        | 'moon'
        | 'arrow';
    size?: number;
}) {
    const common = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.9,
        strokeLinecap:
            'round' as const,
        strokeLinejoin:
            'round' as const,
        'aria-hidden': true
    };

    switch (name) {
        case 'home':
            return (
                <svg {...common}>
                    <path d="M3 11.5 12 4l9 7.5" />
                    <path d="M5.5 10.5V20h13v-9.5" />
                    <path d="M9.5 20v-6h5v6" />
                </svg>
            );

        case 'wallet':
            return (
                <svg {...common}>
                    <path d="M4 6.5h14a2 2 0 0 1 2 2V18H5a2 2 0 0 1-2-2V7.5a3.5 3.5 0 0 1 3.5-3.5H17" />
                    <path d="M16 11h4v4h-4a2 2 0 0 1 0-4Z" />
                </svg>
            );

        case 'card':
            return (
                <svg {...common}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2.5"
                    />
                    <path d="M3 9h18" />
                    <path d="M7 15h4" />
                </svg>
            );

        case 'income':
            return (
                <svg {...common}>
                    <path d="M12 3v14" />
                    <path d="m7 8 5-5 5 5" />
                    <path d="M5 21h14" />
                </svg>
            );

        case 'expense':
            return (
                <svg {...common}>
                    <path d="M12 3v14" />
                    <path d="m7 12 5 5 5-5" />
                    <path d="M5 21h14" />
                </svg>
            );

        case 'calendar':
            return (
                <svg {...common}>
                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="16"
                        rx="3"
                    />
                    <path d="M7 3v4M17 3v4M3 10h18" />
                    <path d="M8 14h2M14 14h2M8 18h2" />
                </svg>
            );

        case 'eye':
            return (
                <svg {...common}>
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle
                        cx="12"
                        cy="12"
                        r="2.5"
                    />
                </svg>
            );

        case 'edit':
            return (
                <svg {...common}>
                    <path d="M4 20h4l11-11-4-4L4 16v4Z" />
                    <path d="m13.5 6.5 4 4" />
                </svg>
            );

        case 'trash':
            return (
                <svg {...common}>
                    <path d="M4 7h16" />
                    <path d="M9 3h6l1 4H8l1-4Z" />
                    <path d="m6.5 7 1 14h9l1-14" />
                    <path d="M10 11v6M14 11v6" />
                </svg>
            );

        case 'check':
            return (
                <svg {...common}>
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />
                    <path d="m8 12 2.5 2.5L16 9" />
                </svg>
            );

        case 'clock':
            return (
                <svg {...common}>
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />
                    <path d="M12 7v5l3 2" />
                </svg>
            );

        case 'chart':
            return (
                <svg {...common}>
                    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                </svg>
            );

        case 'user':
            return (
                <svg {...common}>
                    <circle
                        cx="12"
                        cy="8"
                        r="4"
                    />
                    <path d="M5 21a7 7 0 0 1 14 0" />
                </svg>
            );

        case 'bank':
            return (
                <svg {...common}>
                    <path d="m3 9 9-5 9 5" />
                    <path d="M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M3 20h18" />
                </svg>
            );

        case 'settings':
            return (
                <svg {...common}>
                    <circle
                        cx="12"
                        cy="12"
                        r="3"
                    />
                    <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" />
                </svg>
            );

        case 'backup':
            return (
                <svg {...common}>
                    <path d="M12 4v11" />
                    <path d="m8 8 4-4 4 4" />
                    <path d="M5 14v6h14v-6" />
                </svg>
            );

        case 'report':
            return (
                <svg {...common}>
                    <path d="M6 3h9l4 4v14H6V3Z" />
                    <path d="M15 3v5h4M9 12h6M9 16h6" />
                </svg>
            );

        case 'sun':
            return (
                <svg {...common}>
                    <circle
                        cx="12"
                        cy="12"
                        r="4"
                    />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
            );

        case 'moon':
            return (
                <svg {...common}>
                    <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
                </svg>
            );

        case 'arrow':
            return (
                <svg {...common}>
                    <path d="M5 12h14M14 7l5 5-5 5" />
                </svg>
            );

        default:
            return (
                <svg {...common}>
                    <circle
                        cx="6"
                        cy="12"
                        r="1"
                        fill="currentColor"
                    />
                    <circle
                        cx="12"
                        cy="12"
                        r="1"
                        fill="currentColor"
                    />
                    <circle
                        cx="18"
                        cy="12"
                        r="1"
                        fill="currentColor"
                    />
                </svg>
            );
    }
}


/* =========================================================
   APP
   ========================================================= */

export default function FinanceApp() {
    const now =
        new Date();

    const todayString =
        localDateString();

    const [page, setPage] =
        useState<Page>('Home');

    const [
        calendarReturnPage,
        setCalendarReturnPage
    ] =
        useState<CalendarReturnPage>(
            'Home'
        );

    const [
        moreView,
        setMoreView
    ] =
        useState<MoreView>('Menu');

    const [year, setYear] =
        useState(
            now.getFullYear()
        );

    const [month, setMonth] =
        useState(
            now.getMonth() + 1
        );

    const [
        transactions,
        setTransactions
    ] =
        useState<Transaction[]>([]);

    let yearTransactions: Transaction[],
        setYearTransactions: (value: (((prevState: Transaction[]) => Transaction[]) | Transaction[])) => void;
    [
        yearTransactions,
        setYearTransactions
    ] = useState<Transaction[]>([]);

    const [
        deletedTransactions,
        setDeletedTransactions
    ] =
        useState<
            DeletedTransaction[]
        >([]);

    const [goals, setGoals] =
        useState<Goal[]>([]);

    const [budget, setBudgetValue] =
        useState(0);

    const [
        modalKind,
        setModalKind
    ] =
        useState<
            'income' |
            'expense' |
            null
        >(null);

    const [
        editing,
        setEditing
    ] =
        useState<
            Transaction |
            undefined
        >();

    const [
        modalExpenseGroup,
        setModalExpenseGroup
    ] =
        useState<
            ExpenseGroup |
            null
        >(null);

    const [
        detailTransaction,
        setDetailTransaction
    ] =
        useState<
            Transaction |
            null
        >(null);

    const [
        budgetPopupOpen,
        setBudgetPopupOpen
    ] =
        useState(false);

    const [
        budgetDraft,
        setBudgetDraft
    ] =
        useState('');

    const [
        calendarDate,
        setCalendarDate
    ] =
        useState<
            string |
            null
        >(null);

    const [
        expenseFilter,
        setExpenseFilter
    ] =
        useState<ExpenseFilter>(
            'All'
        );

    const [dark, setDark] =
        useState(
            () =>
                localStorage.getItem(
                    'mhf-theme'
                ) === 'dark'
        );


    /* =====================================================
       LOAD
       ===================================================== */

    const load =
        useCallback(
            async () => {
                const [
                    start,
                    end
                ] =
                    range(
                        year,
                        month
                    );

                const [
                    transactionResult,
                    goalResult,
                    budgetResult,
                    yearResult,
                    deletedResult
                ] =
                    await Promise.all([
                        listTransactions(
                            start,
                            end
                        ),
                        listGoals(),
                        getBudget(start),
                        listYear(year),
                        listDeletedTransactions()
                    ]);

                setTransactions(
                    transactionResult
                        .data || []
                );

                setGoals(
                    goalResult
                        .data || []
                );

                setBudgetValue(
                    budgetResult
                        .data
                        ?.amount || 0
                );

                setYearTransactions(
                    yearResult
                        .data || []
                );

                setDeletedTransactions(
                    deletedResult
                        .data || []
                );
            },
            [
                year,
                month
            ]
        );


    useEffect(
        () => {
            void load();

            return subscribe(
                () => {
                    void load();
                }
            );
        },
        [load]
    );


    useEffect(
        () => {
            document
                .documentElement
                .classList
                .toggle(
                    'dark',
                    dark
                );

            localStorage
                .setItem(
                    'mhf-theme',
                    dark
                        ? 'dark'
                        : 'light'
                );
        },
        [dark]
    );


    /* =====================================================
       TOTALS
       ===================================================== */

    const income =
        useMemo(
            () =>
                transactions
                    .filter(
                        item =>
                            item.kind ===
                            'income'
                    )
                    .reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            Number(
                                item.amount
                            ),
                        0
                    ),
            [transactions]
        );


    const expenses =
        useMemo(
            () =>
                transactions
                    .filter(
                        item =>
                            item.kind ===
                            'expense'
                    )
                    .reduce(
                        (
                            total,
                            item
                        ) =>
                            total +
                            Number(
                                item.amount
                            ),
                        0
                    ),
            [transactions]
        );


    const balance =
        income -
        expenses;


    const monthlySavings =
        Math.max(
            0,
            balance
        );


    const savingsRate =
        income > 0
            ? (
            monthlySavings /
            income
        ) * 100
            : 0;


    const expenseTransactions =
        useMemo(
            () =>
                transactions
                    .filter(
                        item =>
                            item.kind ===
                            'expense'
                    ),
            [transactions]
        );


    const incomeTransactions =
        useMemo(
            () =>
                transactions
                    .filter(
                        item =>
                            item.kind ===
                            'income'
                    ),
            [transactions]
        );


    const todayExpenses =
        useMemo(
            () =>
                expenseTransactions
                    .filter(
                        item =>
                            item.occurred_on ===
                            todayString
                    ),
            [
                expenseTransactions,
                todayString
            ]
        );


    const todayExpenseTotal =
        todayExpenses
            .reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.amount
                    ),
                0
            );


    const groupTotals =
        useMemo(
            () => {
                const totals:
                    Record<
                        ExpenseGroup,
                        number
                    > = {
                    Home: 0,
                    Personal: 0,
                    'Credit & Loan': 0,
                    Others: 0
                };

                expenseTransactions
                    .forEach(
                        item => {
                            const group =
                                normalizeGroup(
                                    item.group_name
                                );

                            if (group) {
                                totals[
                                    group
                                    ] +=
                                    Number(
                                        item.amount
                                    );
                            }
                        }
                    );

                return totals;
            },
            [
                expenseTransactions
            ]
        );


    const categoryBreakdown =
        expenseGroups
            .map(
                (
                    group,
                    index
                ) => ({
                    group,
                    amount:
                        groupTotals[
                            group
                            ],
                    percent:
                        expenses > 0
                            ? (
                            groupTotals[
                                group
                                ] /
                            expenses
                        ) * 100
                            : 0,
                    color:
                        categoryColors[
                            index
                            ]
                })
            );


    const donutBackground =
        useMemo(
            () => {
                if (
                    expenses <= 0
                ) {
                    return (
                        'conic-gradient(#dfe5ea 0 100%)'
                    );
                }

                let current = 0;

                const pieces =
                    categoryBreakdown
                        .filter(
                            item =>
                                item.percent >
                                0
                        )
                        .map(
                            item => {
                                const start =
                                    current;

                                current +=
                                    item.percent;

                                return (
                                    `${item.color} ` +
                                    `${start}% ` +
                                    `${current}%`
                                );
                            }
                        );

                return (
                    `conic-gradient(${pieces.join(
                        ', '
                    )})`
                );
            },
            [
                categoryBreakdown,
                expenses
            ]
        );


    const attentionBills =
        useMemo(
            () => {
                const priority:
                    Record<
                        DisplayStatus,
                        number
                    > = {
                    overdue: 0,
                    'due-today': 1,
                    unpaid: 2,
                    upcoming: 3,
                    paid: 4
                };

                return [
                    ...expenseTransactions
                ]
                    .filter(
                        item => {
                            return getDisplayStatus(
                                    item
                                ) !==
                                'paid';
                        }
                    )
                    .sort(
                        (a, b) => {
                            const difference =
                                priority[
                                    getDisplayStatus(
                                        a
                                    )
                                    ] -
                                priority[
                                    getDisplayStatus(
                                        b
                                    )
                                    ];

                            if (
                                difference !==
                                0
                            ) {
                                return difference;
                            }

                            return (
                                (
                                    a.due_date ||
                                    a.occurred_on
                                )
                                    .localeCompare(
                                        b.due_date ||
                                        b.occurred_on
                                    )
                            );
                        }
                    );
            },
            [
                expenseTransactions
            ]
        );


    const filteredExpenses =
        useMemo(
            () =>
                expenseTransactions
                    .filter(
                        item => {
                            if (
                                expenseFilter ===
                                'All'
                            ) {
                                return true;
                            }

                            return (
                                normalizeGroup(
                                    item.group_name
                                ) ===
                                expenseFilter
                            );
                        }
                    )
                    .sort(
                        (a, b) =>
                            b.occurred_on
                                .localeCompare(
                                    a.occurred_on
                                )
                    ),
            [
                expenseTransactions,
                expenseFilter
            ]
        );


    /* =====================================================
       ACTIONS
       ===================================================== */

    function addExpense(
        group:
            ExpenseGroup |
            null = null
    ) {
        setEditing(
            undefined
        );

        setModalExpenseGroup(
            group
        );

        setModalKind(
            'expense'
        );
    }


    function addIncome() {
        setEditing(
            undefined
        );

        setModalExpenseGroup(
            null
        );

        setModalKind(
            'income'
        );
    }


    function editTransaction(
        transaction:
        Transaction
    ) {
        setDetailTransaction(
            null
        );

        setEditing(
            transaction
        );

        setModalExpenseGroup(
            transaction.kind ===
            'expense'
                ? normalizeGroup(
                    transaction
                        .group_name
                )
                : null
        );

        setModalKind(
            transaction.kind
        );
    }


    async function removeTransaction(
        transaction:
        Transaction
    ) {
        if (
            !window.confirm(
                `Move "${transaction.name}" to Recently Deleted?`
            )
        ) {
            return;
        }

        setDetailTransaction(
            null
        );

        await deleteTransaction(
            transaction.id
        );
    }


    async function togglePaid(
        transaction:
        Transaction
    ) {
        if (
            transaction.kind !==
            'expense'
        ) {
            return;
        }

        await updateTransaction(
            transaction.id,
            {
                status:
                    transaction.status ===
                    'paid'
                        ? 'unpaid'
                        : 'paid'
            }
        );

        setDetailTransaction(
            null
        );
    }


    function openCalendar() {
        const source:
            CalendarReturnPage =
            page === 'Income'
                ? 'Income'
                : page ===
                'Expense'
                    ? 'Expense'
                    : 'Home';

        setCalendarReturnPage(
            source
        );

        setCalendarDate(
            null
        );

        setPage(
            'Calendar'
        );
    }


    function openBudget() {
        setBudgetDraft(
            budget > 0
                ? String(
                    budget
                )
                : ''
        );

        setBudgetPopupOpen(
            true
        );
    }


    async function saveBudgetAmount() {
        const amount =
            Number(
                budgetDraft
            );

        if (
            !Number.isFinite(
                amount
            ) ||
            amount < 0
        ) {
            window.alert(
                'Enter a valid budget amount.'
            );

            return;
        }

        const [
            start
        ] =
            range(
                year,
                month
            );

        const result =
            await setBudget(
                start,
                amount
            );

        if (
            result.error
        ) {
            window.alert(
                result.error.message
            );

            return;
        }

        setBudgetValue(
            amount
        );

        setBudgetPopupOpen(
            false
        );
    }


    /* =====================================================
       PERIOD SELECTOR
       ===================================================== */

    function PeriodSelector() {
        return (
            <div className="mhfPeriod">
                <select
                    aria-label="Month"
                    value={month}
                    onChange={
                        event =>
                            setMonth(
                                Number(
                                    event
                                        .target
                                        .value
                                )
                            )
                    }
                >
                    {Array.from(
                        {
                            length: 12
                        },
                        (
                            _,
                            index
                        ) => (
                            <option
                                key={
                                    index +
                                    1
                                }
                                value={
                                    index +
                                    1
                                }
                            >
                                {monthName(
                                    index +
                                    1
                                )}
                            </option>
                        )
                    )}
                </select>

                <select
                    aria-label="Year"
                    value={year}
                    onChange={
                        event =>
                            setYear(
                                Number(
                                    event
                                        .target
                                        .value
                                )
                            )
                    }
                >
                    {Array.from(
                        {
                            length: 25
                        },
                        (
                            _,
                            index
                        ) =>
                            2026 +
                            index
                    ).map(
                        value => (
                            <option
                                key={
                                    value
                                }
                                value={
                                    value
                                }
                            >
                                {value}
                            </option>
                        )
                    )}
                </select>
            </div>
        );
    }


    /* =====================================================
       TRANSACTION ICON
       ===================================================== */

    function TransactionIcon({
                                 transaction
                             }: {
        transaction:
            Transaction;
    }) {
        if (
            transaction.kind ===
            'income'
        ) {
            return (
                <span className="mhfTransactionIcon income">
                    <Icon
                        name="income"
                        size={21}
                    />
                </span>
            );
        }

        const group =
            normalizeGroup(
                transaction
                    .group_name
            );

        let icon:
            'home' |
            'user' |
            'card' |
            'wallet' =
            'wallet';

        if (
            group === 'Home'
        ) {
            icon = 'home';
        } else if (
            group ===
            'Personal'
        ) {
            icon = 'user';
        } else if (
            group ===
            'Credit & Loan'
        ) {
            icon = 'card';
        }

        return (
            <span
                className={
                    `mhfTransactionIcon ` +
                    `${group
                        ?.toLowerCase()
                        .replaceAll(
                            ' ',
                            '-'
                        )
                        .replaceAll(
                            '&',
                            'and'
                        ) || 'other'}`
                }
            >
                <Icon
                    name={icon}
                    size={21}
                />
            </span>
        );
    }


    /* =====================================================
       COMPACT TRANSACTION CARD
       ===================================================== */

    function CompactTransaction({
                                    transaction,
                                    showStatus = true
                                }: {
        transaction:
            Transaction;
        showStatus?: boolean;
    }) {
        const displayStatus =
            transaction.kind ===
            'expense'
                ? getDisplayStatus(
                    transaction
                )
                : null;

        return (
            <article className="mhfTransaction">
                <button
                    type="button"
                    className="mhfTransactionMain"
                    onClick={() =>
                        setDetailTransaction(
                            transaction
                        )
                    }
                    aria-label={
                        `View ${transaction.name} details`
                    }
                >
                    <TransactionIcon
                        transaction={
                            transaction
                        }
                    />

                    <span className="mhfTransactionCopy">
                        <strong>
                            {
                                transaction
                                    .name
                            }
                        </strong>

                        <small>
                            {transaction
                                    .category ||
                                (
                                    transaction
                                        .kind ===
                                    'income'
                                        ? 'Income'
                                        : normalizeGroup(
                                            transaction
                                                .group_name
                                        ) ||
                                        'Expense'
                                )}
                            {' · '}
                            {shortDate(
                                transaction
                                    .occurred_on
                            )}
                        </small>
                    </span>

                    <span className="mhfTransactionAmount">
                        <strong>
                            {transaction
                                .kind ===
                            'expense'
                                ? '−'
                                : '+'}
                            {money(
                                Number(
                                    transaction
                                        .amount
                                )
                            )}
                        </strong>

                        {showStatus &&
                            displayStatus && (
                                <span
                                    className={
                                        statusClass(
                                            displayStatus
                                        )
                                    }
                                >
                                    {displayStatusLabel(
                                        displayStatus
                                    )}
                                </span>
                            )}
                    </span>
                </button>

                <div className="mhfMiniActions">
                    <button
                        type="button"
                        title="Details"
                        aria-label="Details"
                        onClick={() =>
                            setDetailTransaction(
                                transaction
                            )
                        }
                    >
                        <Icon
                            name="eye"
                            size={17}
                        />
                    </button>

                    {transaction.kind ===
                        'expense' && (
                            <button
                                type="button"
                                title={
                                    transaction
                                        .status ===
                                    'paid'
                                        ? 'Mark unpaid'
                                        : 'Mark paid'
                                }
                                aria-label={
                                    transaction
                                        .status ===
                                    'paid'
                                        ? 'Mark unpaid'
                                        : 'Mark paid'
                                }
                                onClick={() =>
                                    void togglePaid(
                                        transaction
                                    )
                                }
                            >
                                <Icon
                                    name={
                                        transaction
                                            .status ===
                                        'paid'
                                            ? 'clock'
                                            : 'check'
                                    }
                                    size={17}
                                />
                            </button>
                        )}

                    <button
                        type="button"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() =>
                            editTransaction(
                                transaction
                            )
                        }
                    >
                        <Icon
                            name="edit"
                            size={17}
                        />
                    </button>

                    <button
                        type="button"
                        title="Delete"
                        aria-label="Delete"
                        className="danger"
                        onClick={() =>
                            void removeTransaction(
                                transaction
                            )
                        }
                    >
                        <Icon
                            name="trash"
                            size={17}
                        />
                    </button>
                </div>
            </article>
        );
    }


    /* =====================================================
       HOME SUMMARY
       ===================================================== */

    function HomeSummary() {
        const cards = [
            {
                label:
                    'Monthly Income',
                amount:
                income,
                icon:
                    'income' as const,
                className:
                    'income'
            },
            {
                label:
                    'Monthly Expense',
                amount:
                expenses,
                icon:
                    'expense' as const,
                className:
                    'expense'
            },
            {
                label:
                    'Available',
                amount:
                balance,
                icon:
                    'wallet' as const,
                className:
                    'available'
            },
            {
                label:
                    "Today's Expense",
                amount:
                todayExpenseTotal,
                icon:
                    'calendar' as const,
                className:
                    'today'
            }
        ];

        return (
            <section className="mhfMetricStrip">
                {cards.map(
                    item => (
                        <div
                            className={
                                `mhfMetric ` +
                                item.className
                            }
                            key={
                                item.label
                            }
                        >
                            <span className="mhfMetricIcon">
                                <Icon
                                    name={
                                        item.icon
                                    }
                                    size={19}
                                />
                            </span>

                            <div>
                                <strong>
                                    {money(
                                        item.amount
                                    )}
                                </strong>

                                <small>
                                    {
                                        item.label
                                    }
                                </small>
                            </div>
                        </div>
                    )
                )}
            </section>
        );
    }


    /* =====================================================
       HOME ANALYTICS
       ===================================================== */

    function HomeAnalytics() {
        const total =
            Math.max(
                income,
                expenses,
                1
            );

        const incomeAngle =
            Math.min(
                360,
                (
                    income /
                    (
                        income +
                        expenses ||
                        1
                    )
                ) * 360
            );

        const cashFlowBackground =
            income +
            expenses >
            0
                ? `conic-gradient(
                    #6ed9bd 0deg ${incomeAngle}deg,
                    #63c8ed ${incomeAngle}deg 360deg
                  )`
                : 'conic-gradient(#dce4e8 0deg 360deg)';

        void total;

        return (
            <section className="mhfAnalyticsGrid">
                <div className="card mhfCashFlowCard">
                    <div className="mhfSectionTitle">
                        <div>
                            <span className="eyebrow">
                                {year} OVERVIEW
                            </span>

                            <h2>
                                Monthly Cash Flow
                            </h2>

                            <p>
                                {monthLabel(
                                    year,
                                    month
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="mhfCashFlowContent">
                        <div
                            className="mhfCashDonut"
                            style={{
                                background:
                                cashFlowBackground
                            }}
                        >
                            <div className="mhfCashDonutInner">
                                <small>
                                    Available
                                </small>

                                <strong>
                                    {money(
                                        balance
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div className="mhfCashLegend">
                            <div>
                                <span className="mhfLegendDot income" />

                                <small>
                                    Income
                                </small>

                                <strong>
                                    {money(
                                        income
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span className="mhfLegendDot expense" />

                                <small>
                                    Expense
                                </small>

                                <strong>
                                    {money(
                                        expenses
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span className="mhfLegendDot available" />

                                <small>
                                    Available
                                </small>

                                <strong>
                                    {money(
                                        balance
                                    )}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mhfCategoryCard">
                    <div className="mhfSectionTitle">
                        <div>
                            <span className="eyebrow">
                                SPENDING MIX
                            </span>

                            <h2>
                                Category Breakdown
                            </h2>
                        </div>
                    </div>

                    <div className="mhfCategoryContent">
                        <div
                            className="mhfCategoryDonut"
                            style={{
                                background:
                                donutBackground
                            }}
                        >
                            <div className="mhfCategoryDonutInner">
                                <strong>
                                    {money(
                                        expenses
                                    )}
                                </strong>

                                <small>
                                    Expenses
                                </small>
                            </div>
                        </div>

                        <div className="mhfCategoryLegend">
                            {categoryBreakdown
                                .map(
                                    item => (
                                        <button
                                            type="button"
                                            key={
                                                item.group
                                            }
                                            onClick={() => {
                                                setExpenseFilter(
                                                    item.group
                                                );

                                                setPage(
                                                    'Expense'
                                                );
                                            }}
                                        >
                                            <span
                                                className="mhfCategoryDot"
                                                style={{
                                                    background:
                                                    item.color
                                                }}
                                            />

                                            <span>
                                                <strong>
                                                    {
                                                        item.group
                                                    }
                                                </strong>

                                                <small>
                                                    {item.percent.toFixed(
                                                        0
                                                    )}
                                                    %
                                                </small>
                                            </span>

                                            <b>
                                                {money(
                                                    item.amount
                                                )}
                                            </b>
                                        </button>
                                    )
                                )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }


    /* =====================================================
       HOME PAGE
       ===================================================== */

    function HomePage() {
        return (
            <>
                <section className="hero homeHero photoHero">
                    <div className="heroCopy homeHeroCopy">
                        <small className="heroDate">
                            {fullDate()}
                        </small>

                        <h1>
                            {greeting()}
                        </h1>

                        <p>
                            A clear view of your
                            home finances.
                        </p>

                        <div className="heroActions">
                            <button
                                type="button"
                                className="primaryAction"
                                onClick={() =>
                                    addExpense()
                                }
                            >
                                + Add Expense
                            </button>

                            <button
                                type="button"
                                className="secondaryAction"
                                onClick={
                                    addIncome
                                }
                            >
                                + Add Income
                            </button>
                        </div>
                    </div>

                    <div
                        className="mhfHomeHeroArt"
                        aria-hidden="true"
                    >
                        <div className="mhfHeroHouse">
                            <Icon
                                name="home"
                                size={58}
                            />
                        </div>

                        <div className="mhfHeroWallet">
                            <Icon
                                name="wallet"
                                size={34}
                            />
                        </div>
                    </div>
                </section>

                <div className="mhfHomeToolbar">
                    <div>
                        <span className="eyebrow">
                            FINANCE OVERVIEW
                        </span>

                        <h2>
                            {monthLabel(
                                year,
                                month
                            )}
                        </h2>
                    </div>

                    <PeriodSelector />
                </div>

                <HomeSummary />

                <HomeAnalytics />

                <section className="mhfHomeLists">
                    <div className="card mhfListCard">
                        <div className="mhfSectionTitle">
                            <div>
                                <span className="eyebrow">
                                    PAYMENTS
                                </span>

                                <h2>
                                    Payments to Watch
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="mhfTextButton"
                                onClick={() =>
                                    setPage(
                                        'Expense'
                                    )
                                }
                            >
                                View all
                            </button>
                        </div>

                        <div className="mhfTransactionList">
                            {attentionBills
                                .slice(
                                    0,
                                    4
                                )
                                .map(
                                    item => (
                                        <CompactTransaction
                                            key={
                                                item.id
                                            }
                                            transaction={
                                                item
                                            }
                                        />
                                    )
                                )}

                            {attentionBills
                                    .length ===
                                0 && (
                                    <div className="emptyState">
                                        No unpaid or
                                        upcoming payments
                                        for this month.
                                    </div>
                                )}
                        </div>
                    </div>

                    <div className="card mhfListCard">
                        <div className="mhfSectionTitle">
                            <div>
                                <span className="eyebrow">
                                    TODAY
                                </span>

                                <h2>
                                    Today's Spending
                                </h2>

                                <p>
                                    {money(
                                        todayExpenseTotal
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="mhfTransactionList">
                            {todayExpenses
                                .slice(
                                    0,
                                    4
                                )
                                .map(
                                    item => (
                                        <CompactTransaction
                                            key={
                                                item.id
                                            }
                                            transaction={
                                                item
                                            }
                                        />
                                    )
                                )}

                            {todayExpenses
                                    .length ===
                                0 && (
                                    <div className="emptyState">
                                        No expenses
                                        recorded today.
                                    </div>
                                )}
                        </div>
                    </div>
                </section>
            </>
        );
    }


    /* =====================================================
       BUDGET
       ===================================================== */

    function BudgetCard() {
        const spentPercent =
            budget > 0
                ? Math.min(
                    100,
                    (
                        expenses /
                        budget
                    ) * 100
                )
                : 0;

        const remaining =
            Math.max(
                0,
                budget -
                expenses
            );

        return (
            <section className="card mhfBudgetCard">
                <div className="mhfSectionTitle">
                    <div>
                        <span className="eyebrow">
                            MONTHLY BUDGET
                        </span>

                        <h2>
                            Budget Progress
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="secondaryAction"
                        onClick={
                            openBudget
                        }
                    >
                        Set Budget
                    </button>
                </div>

                <div className="mhfBudgetBody">
                    <div
                        className="mhfBudgetRing"
                        style={{
                            background:
                                `conic-gradient(
                                    #7c8ff4 0 ${spentPercent}%,
                                    var(--mhf-track) ${spentPercent}% 100%
                                )`
                        }}
                    >
                        <div>
                            <strong>
                                {spentPercent.toFixed(
                                    0
                                )}
                                %
                            </strong>

                            <small>
                                spent
                            </small>
                        </div>
                    </div>

                    <div className="mhfBudgetStats">
                        <div>
                            <small>
                                Budget
                            </small>

                            <strong>
                                {money(
                                    budget
                                )}
                            </strong>
                        </div>

                        <div>
                            <small>
                                Spent
                            </small>

                            <strong>
                                {money(
                                    expenses
                                )}
                            </strong>
                        </div>

                        <div>
                            <small>
                                Remaining
                            </small>

                            <strong>
                                {money(
                                    remaining
                                )}
                            </strong>
                        </div>
                    </div>
                </div>
            </section>
        );
    }


    /* =====================================================
       EXPENSE PAGE
       ===================================================== */

    function ExpensePage() {
        return (
            <>
                <section className="hero expenseHero photoHero">
                    <div className="heroCopy">
                        <span className="eyebrow">
                            EXPENSES
                        </span>

                        <h1>
                            Track your spending
                        </h1>

                        <p>
                            Organize bills,
                            purchases and debt
                            payments in one place.
                        </p>
                    </div>

                    <div className="mhfHeroVisual expense">
                        <Icon
                            name="expense"
                            size={48}
                        />
                    </div>
                </section>

                <div className="mhfPageToolbar">
                    <div>
                        <span className="eyebrow">
                            EXPENSE PERIOD
                        </span>

                        <h2>
                            {monthLabel(
                                year,
                                month
                            )}
                        </h2>
                    </div>

                    <PeriodSelector />
                </div>

                <BudgetCard />

                <section className="card mhfGroupsCard">
                    <div className="mhfSectionTitle">
                        <div>
                            <span className="eyebrow">
                                GROUPS
                            </span>

                            <h2>
                                Expense Groups
                            </h2>
                        </div>
                    </div>

                    <div className="mhfGroupGrid">
                        {expenseGroups
                            .map(
                                group => {
                                    let icon:
                                        'home' |
                                        'user' |
                                        'card' |
                                        'wallet' =
                                        'wallet';

                                    if (
                                        group ===
                                        'Home'
                                    ) {
                                        icon =
                                            'home';
                                    } else if (
                                        group ===
                                        'Personal'
                                    ) {
                                        icon =
                                            'user';
                                    } else if (
                                        group ===
                                        'Credit & Loan'
                                    ) {
                                        icon =
                                            'card';
                                    }

                                    return (
                                        <button
                                            type="button"
                                            key={
                                                group
                                            }
                                            className={
                                                expenseFilter ===
                                                group
                                                    ? 'active'
                                                    : ''
                                            }
                                            onClick={() =>
                                                setExpenseFilter(
                                                    group
                                                )
                                            }
                                        >
                                            <span>
                                                <Icon
                                                    name={
                                                        icon
                                                    }
                                                    size={
                                                        24
                                                    }
                                                />
                                            </span>

                                            <strong>
                                                {
                                                    group
                                                }
                                            </strong>

                                            <small>
                                                {money(
                                                    groupTotals[
                                                        group
                                                        ]
                                                )}
                                            </small>
                                        </button>
                                    );
                                }
                            )}
                    </div>
                </section>

                <section className="card mhfListCard">
                    <div className="mhfSectionTitle mhfTransactionsHeading">
                        <div>
                            <span className="eyebrow">
                                TRANSACTIONS
                            </span>

                            <h2>
                                {expenseFilter ===
                                'All'
                                    ? 'All Expenses'
                                    : expenseFilter}
                            </h2>

                            <p>
                                {filteredExpenses
                                    .length}{' '}
                                recorded
                                expense
                                {filteredExpenses
                                    .length ===
                                1
                                    ? ''
                                    : 's'}
                            </p>
                        </div>

                        <button
                            type="button"
                            className="primaryAction"
                            onClick={() =>
                                addExpense(
                                    expenseFilter ===
                                    'All'
                                        ? null
                                        : expenseFilter
                                )
                            }
                        >
                            + Add Expense
                        </button>
                    </div>

                    {expenseFilter !==
                        'All' && (
                            <button
                                type="button"
                                className="mhfClearFilter"
                                onClick={() =>
                                    setExpenseFilter(
                                        'All'
                                    )
                                }
                            >
                                Show all expenses
                            </button>
                        )}

                    <div className="mhfTransactionList">
                        {filteredExpenses
                            .map(
                                item => (
                                    <CompactTransaction
                                        key={
                                            item.id
                                        }
                                        transaction={
                                            item
                                        }
                                    />
                                )
                            )}

                        {filteredExpenses
                                .length ===
                            0 && (
                                <div className="emptyState">
                                    No expenses found
                                    for this selection.
                                </div>
                            )}
                    </div>
                </section>
            </>
        );
    }


    /* =====================================================
       SAVINGS GOAL
       ===================================================== */

    function GoalCard({
                          name
                      }: {
        name:
            'Personal Savings' |
            'Home Savings';
    }) {
        const existing =
            goals.find(
                item =>
                    item.name ===
                    name
            );

        const [
            saved,
            setSaved
        ] =
            useState(
                existing
                    ?.current_amount ||
                0
            );

        const [
            target,
            setTarget
        ] =
            useState(
                existing
                    ?.goal_amount ||
                0
            );

        useEffect(
            () => {
                setSaved(
                    existing
                        ?.current_amount ||
                    0
                );

                setTarget(
                    existing
                        ?.goal_amount ||
                    0
                );
            },
            [existing]
        );

        const progress =
            target > 0
                ? Math.min(
                    100,
                    (
                        saved /
                        target
                    ) * 100
                )
                : 0;

        async function save() {
            await saveGoal({
                name,
                current_amount:
                    Number(
                        saved
                    ),
                goal_amount:
                    Number(
                        target
                    )
            });
        }

        const home =
            name ===
            'Home Savings';

        return (
            <div className="card mhfGoalCard">
                <div className="mhfGoalArt">
                    <span>
                        <Icon
                            name={
                                home
                                    ? 'home'
                                    : 'wallet'
                            }
                            size={42}
                        />
                    </span>

                    <div>
                        <small>
                            {home
                                ? 'HOME FUND'
                                : 'PERSONAL FUND'}
                        </small>

                        <strong>
                            {name}
                        </strong>
                    </div>
                </div>

                <div className="mhfGoalProgress">
                    <div>
                        <span
                            style={{
                                width:
                                    `${progress}%`
                            }}
                        />
                    </div>

                    <small>
                        {progress.toFixed(
                            0
                        )}
                        % complete
                    </small>
                </div>

                <div className="mhfGoalInputs">
                    <label>
                        Saved

                        <input
                            type="number"
                            min="0"
                            value={saved}
                            onChange={
                                event =>
                                    setSaved(
                                        Number(
                                            event
                                                .target
                                                .value
                                        )
                                    )
                            }
                        />
                    </label>

                    <label>
                        Goal

                        <input
                            type="number"
                            min="0"
                            value={target}
                            onChange={
                                event =>
                                    setTarget(
                                        Number(
                                            event
                                                .target
                                                .value
                                        )
                                    )
                            }
                        />
                    </label>
                </div>

                <button
                    type="button"
                    className="primaryAction"
                    onClick={() =>
                        void save()
                    }
                >
                    Update Savings
                </button>
            </div>
        );
    }


    /* =====================================================
       INCOME PAGE
       ===================================================== */

    function IncomePage() {
        const sourceTotals =
            new Map<
                string,
                number
            >();

        incomeTransactions
            .forEach(
                item => {
                    const source =
                        item.name ||
                        item.category ||
                        'Income';

                    sourceTotals.set(
                        source,
                        (
                            sourceTotals.get(
                                source
                            ) || 0
                        ) +
                        Number(
                            item.amount
                        )
                    );
                }
            );

        const topSources =
            Array.from(
                sourceTotals
                    .entries()
            )
                .sort(
                    (a, b) =>
                        b[1] -
                        a[1]
                )
                .slice(
                    0,
                    4
                );

        const weeks =
            [1, 2, 3, 4, 5]
                .map(
                    week => {
                        const total =
                            incomeTransactions
                                .filter(
                                    item => {
                                        const day =
                                            parseLocalDate(
                                                item.occurred_on
                                            ).getDate();

                                        return (
                                            Math.ceil(
                                                day /
                                                7
                                            ) ===
                                            week
                                        );
                                    }
                                )
                                .reduce(
                                    (
                                        sum,
                                        item
                                    ) =>
                                        sum +
                                        Number(
                                            item.amount
                                        ),
                                    0
                                );

                        return {
                            week,
                            total
                        };
                    }
                );

        const maxWeek =
            Math.max(
                1,
                ...weeks.map(
                    item =>
                        item.total
                )
            );

        return (
            <>
                <section className="hero incomeHero photoHero">
                    <div className="heroCopy">
                        <span className="eyebrow">
                            INCOME & SAVINGS
                        </span>

                        <h1>
                            Money coming in,
                            goals moving forward
                        </h1>

                        <p>
                            Track income sources,
                            deposits and savings
                            progress.
                        </p>
                    </div>

                    <div className="mhfHeroVisual income">
                        <Icon
                            name="income"
                            size={48}
                        />
                    </div>
                </section>

                <div className="mhfPageToolbar">
                    <div>
                        <span className="eyebrow">
                            INCOME PERIOD
                        </span>

                        <h2>
                            {monthLabel(
                                year,
                                month
                            )}
                        </h2>
                    </div>

                    <PeriodSelector />
                </div>

                <section className="mhfIncomeMetrics">
                    <div className="card">
                        <span>
                            <Icon
                                name="income"
                                size={22}
                            />
                        </span>

                        <small>
                            Monthly Income
                        </small>

                        <strong>
                            {money(
                                income
                            )}
                        </strong>
                    </div>

                    <div className="card">
                        <span>
                            <Icon
                                name="wallet"
                                size={22}
                            />
                        </span>

                        <small>
                            Monthly Savings
                        </small>

                        <strong>
                            {money(
                                monthlySavings
                            )}
                        </strong>
                    </div>

                    <div className="card">
                        <span>
                            <Icon
                                name="chart"
                                size={22}
                            />
                        </span>

                        <small>
                            Savings Rate
                        </small>

                        <strong>
                            {savingsRate.toFixed(
                                1
                            )}
                            %
                        </strong>
                    </div>
                </section>

                <section className="mhfIncomeAnalysis">
                    <div className="card">
                        <div className="mhfSectionTitle">
                            <div>
                                <span className="eyebrow">
                                    WEEKLY TRACKER
                                </span>

                                <h2>
                                    Income by Week
                                </h2>
                            </div>
                        </div>

                        <div className="mhfWeeklyChart">
                            {weeks.map(
                                item => (
                                    <div
                                        key={
                                            item.week
                                        }
                                    >
                                        <div>
                                            <span
                                                style={{
                                                    height:
                                                        `${Math.max(
                                                            item.total >
                                                            0
                                                                ? 12
                                                                : 2,
                                                            (
                                                                item.total /
                                                                maxWeek
                                                            ) *
                                                            100
                                                        )}%`
                                                }}
                                            />
                                        </div>

                                        <strong>
                                            W{
                                            item.week
                                        }
                                        </strong>

                                        <small>
                                            {item.total >
                                            0
                                                ? money(
                                                    item.total
                                                )
                                                : '—'}
                                        </small>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="mhfSectionTitle">
                            <div>
                                <span className="eyebrow">
                                    SOURCES
                                </span>

                                <h2>
                                    Income Sources
                                </h2>
                            </div>
                        </div>

                        <div className="mhfSourceList">
                            {topSources.map(
                                (
                                    [
                                        source,
                                        amount
                                    ],
                                    index
                                ) => (
                                    <div
                                        key={
                                            source
                                        }
                                    >
                                        <span
                                            style={{
                                                background:
                                                    categoryColors[
                                                    index %
                                                    categoryColors
                                                        .length
                                                        ]
                                            }}
                                        />

                                        <strong>
                                            {
                                                source
                                            }
                                        </strong>

                                        <b>
                                            {money(
                                                amount
                                            )}
                                        </b>
                                    </div>
                                )
                            )}

                            {topSources
                                    .length ===
                                0 && (
                                    <div className="emptyState">
                                        Add income to
                                        see source
                                        analysis.
                                    </div>
                                )}
                        </div>
                    </div>
                </section>

                <section className="card mhfListCard">
                    <div className="mhfSectionTitle mhfTransactionsHeading">
                        <div>
                            <span className="eyebrow">
                                INCOME RECORDS
                            </span>

                            <h2>
                                Income
                            </h2>

                            <p>
                                {incomeTransactions
                                    .length}{' '}
                                records
                            </p>
                        </div>

                        <button
                            type="button"
                            className="primaryAction"
                            onClick={
                                addIncome
                            }
                        >
                            + Add Income
                        </button>
                    </div>

                    <div className="mhfTransactionList">
                        {incomeTransactions
                            .map(
                                item => (
                                    <CompactTransaction
                                        key={
                                            item.id
                                        }
                                        transaction={
                                            item
                                        }
                                        showStatus={
                                            false
                                        }
                                    />
                                )
                            )}

                        {incomeTransactions
                                .length ===
                            0 && (
                                <div className="emptyState">
                                    No income recorded
                                    for this month.
                                </div>
                            )}
                    </div>
                </section>

                <section className="mhfSavingsSection">
                    <div className="mhfSectionTitle">
                        <div>
                            <span className="eyebrow">
                                SAVINGS
                            </span>

                            <h2>
                                Savings Goals
                            </h2>
                        </div>
                    </div>

                    <div className="mhfSavingsGrid">
                        <GoalCard
                            name="Personal Savings"
                        />

                        <GoalCard
                            name="Home Savings"
                        />
                    </div>
                </section>
            </>
        );
    }


    /* =====================================================
       CALENDAR PAGE
       ===================================================== */

    function CalendarPage() {
        const mode =
            calendarReturnPage;

        const showIncome =
            mode === 'Home' ||
            mode === 'Income';

        const showExpenses =
            mode === 'Home' ||
            mode === 'Expense';

        const firstDay =
            new Date(
                year,
                month - 1,
                1
            ).getDay();

        const daysInMonth =
            new Date(
                year,
                month,
                0
            ).getDate();

        const cells:
            Array<
                number |
                null
            > = [];

        for (
            let index = 0;
            index < firstDay;
            index += 1
        ) {
            cells.push(
                null
            );
        }

        for (
            let day = 1;
            day <= daysInMonth;
            day += 1
        ) {
            cells.push(
                day
            );
        }

        const selectedItems =
            calendarDate
                ? transactions
                    .filter(
                        item => {
                            if (
                                item.kind ===
                                'income'
                            ) {
                                return (
                                    showIncome &&
                                    item.occurred_on ===
                                    calendarDate
                                );
                            }

                            if (
                                !showExpenses
                            ) {
                                return false;
                            }

                            return (
                                item.occurred_on ===
                                calendarDate ||
                                item.due_date ===
                                calendarDate
                            );
                        }
                    )
                : [];

        function dateForDay(
            day: number
        ) {
            return (
                `${year}-` +
                `${String(
                    month
                ).padStart(
                    2,
                    '0'
                )}-` +
                `${String(
                    day
                ).padStart(
                    2,
                    '0'
                )}`
            );
        }

        function markersForDay(
            day: number
        ) {
            const date =
                dateForDay(
                    day
                );

            const expenseItems =
                showExpenses
                    ? expenseTransactions
                        .filter(
                            item =>
                                item.occurred_on ===
                                date ||
                                item.due_date ===
                                date
                        )
                    : [];

            const incomeItems =
                showIncome
                    ? incomeTransactions
                        .filter(
                            item =>
                                item.occurred_on ===
                                date
                        )
                    : [];

            const statuses =
                new Set<
                    DisplayStatus
                >();

            expenseItems
                .forEach(
                    item =>
                        statuses.add(
                            getDisplayStatus(
                                item
                            )
                        )
                );

            return {
                statuses,
                hasIncome:
                    incomeItems
                        .length > 0
            };
        }

        return (
            <>
                <section className="mhfCalendarHero">
                    <div className="mhfCalendarNature">
                        <div className="mhfSun" />

                        <div className="mhfMountain one" />

                        <div className="mhfMountain two" />

                        <div className="mhfNatureCalendar">
                            <Icon
                                name="calendar"
                                size={28}
                            />
                        </div>
                    </div>

                    <div>
                        <span className="eyebrow">
                            {mode ===
                            'Income'
                                ? 'INCOME CALENDAR'
                                : mode ===
                                'Expense'
                                    ? 'EXPENSE CALENDAR'
                                    : 'FINANCE CALENDAR'}
                        </span>

                        <h1>
                            {monthLabel(
                                year,
                                month
                            )}
                        </h1>

                        <p>
                            {mode ===
                            'Home'
                                ? 'Income dates, paid bills, due dates, overdue and upcoming payments together.'
                                : mode ===
                                'Income'
                                    ? 'See when income was received.'
                                    : 'See paid, due, overdue and upcoming expenses.'}
                        </p>
                    </div>
                </section>

                <section className="card mhfCalendarCard">
                    <div className="mhfCalendarTop">
                        <div>
                            <span className="eyebrow">
                                {mode ===
                                'Home'
                                    ? 'FINANCE CALENDAR'
                                    : mode ===
                                    'Income'
                                        ? 'INCOME CALENDAR'
                                        : 'EXPENSE CALENDAR'}
                            </span>

                            <h2>
                                {monthLabel(
                                    year,
                                    month
                                )}
                            </h2>
                        </div>

                        <PeriodSelector />
                    </div>

                    <div className="mhfCalendarLegend">
                        {showExpenses && (
                            <>
                                <span>
                                    <i className="paid" />
                                    Paid
                                </span>

                                <span>
                                    <i className="due" />
                                    Due
                                </span>

                                <span>
                                    <i className="overdue" />
                                    Overdue
                                </span>

                                <span>
                                    <i className="upcoming" />
                                    Upcoming
                                </span>
                            </>
                        )}

                        {showIncome && (
                            <span>
                                <i className="income" />
                                Income
                            </span>
                        )}
                    </div>

                    <div className="mhfWeekdays">
                        {[
                            'SUN',
                            'MON',
                            'TUE',
                            'WED',
                            'THU',
                            'FRI',
                            'SAT'
                        ].map(
                            day => (
                                <span
                                    key={
                                        day
                                    }
                                >
                                    {day}
                                </span>
                            )
                        )}
                    </div>

                    <div className="mhfCalendarGrid">
                        {cells.map(
                            (
                                day,
                                index
                            ) => {
                                if (
                                    day ===
                                    null
                                ) {
                                    return (
                                        <div
                                            className="mhfCalendarBlank"
                                            key={
                                                `blank-${index}`
                                            }
                                        />
                                    );
                                }

                                const date =
                                    dateForDay(
                                        day
                                    );

                                const markers =
                                    markersForDay(
                                        day
                                    );

                                return (
                                    <button
                                        type="button"
                                        key={
                                            date
                                        }
                                        className={
                                            [
                                                calendarDate ===
                                                date
                                                    ? 'selected'
                                                    : '',
                                                date ===
                                                todayString
                                                    ? 'today'
                                                    : ''
                                            ]
                                                .filter(
                                                    Boolean
                                                )
                                                .join(
                                                    ' '
                                                )
                                        }
                                        onClick={() =>
                                            setCalendarDate(
                                                date
                                            )
                                        }
                                    >
                                        <strong>
                                            {
                                                day
                                            }
                                        </strong>

                                        <span className="mhfCalendarDots">
                                            {markers
                                                .statuses
                                                .has(
                                                    'paid'
                                                ) && (
                                                <i className="paid" />
                                            )}

                                            {markers
                                                .statuses
                                                .has(
                                                    'due-today'
                                                ) && (
                                                <i className="due" />
                                            )}

                                            {markers
                                                .statuses
                                                .has(
                                                    'overdue'
                                                ) && (
                                                <i className="overdue" />
                                            )}

                                            {(
                                                markers
                                                    .statuses
                                                    .has(
                                                        'upcoming'
                                                    ) ||
                                                markers
                                                    .statuses
                                                    .has(
                                                        'unpaid'
                                                    )
                                            ) && (
                                                <i className="upcoming" />
                                            )}

                                            {markers
                                                .hasIncome && (
                                                <i className="income" />
                                            )}
                                        </span>
                                    </button>
                                );
                            }
                        )}
                    </div>
                </section>

                {calendarDate && (
                    <section className="card mhfCalendarDetails">
                        <div className="mhfSectionTitle">
                            <div>
                                <span className="eyebrow">
                                    SELECTED DATE
                                </span>

                                <h2>
                                    {longDate(
                                        calendarDate
                                    )}
                                </h2>
                            </div>
                        </div>

                        <div className="mhfTransactionList">
                            {selectedItems
                                .map(
                                    item => (
                                        <CompactTransaction
                                            key={
                                                item.id
                                            }
                                            transaction={
                                                item
                                            }
                                        />
                                    )
                                )}

                            {selectedItems
                                    .length ===
                                0 && (
                                    <div className="emptyState">
                                        No financial
                                        activity on this
                                        date.
                                    </div>
                                )}
                        </div>
                    </section>
                )}
            </>
        );
    }


    /* =====================================================
       REPORTS
       ===================================================== */

    function ReportsView() {
        async function monthly() {
            const [
                start,
                end
            ] =
                range(
                    year,
                    month
                );

            const [
                transactionResult,
                budgetResult
            ] =
                await Promise.all([
                    listTransactions(
                        start,
                        end
                    ),
                    getBudget(
                        start
                    )
                ]);

            printHtml(
                monthlyReportHtml(
                    transactionResult
                        .data || [],
                    year,
                    month,
                    budgetResult
                        .data
                        ?.amount || 0
                )
            );
        }

        async function yearly() {
            const result =
                await listYear(
                    year
                );

            printHtml(
                yearlyReportHtml(
                    result.data ||
                    [],
                    year
                )
            );
        }

        return (
            <>
                <MoreHeader
                    title="Financial Reports"
                    subtitle="Review monthly and yearly financial reports."
                    icon="report"
                />

                <section className="card mhfMoreSection">
                    <div className="mhfSectionTitle">
                        <div>
                            <span className="eyebrow">
                                REPORT PERIOD
                            </span>

                            <h2>
                                Choose a Report
                            </h2>
                        </div>

                        <PeriodSelector />
                    </div>

                    <div className="mhfReportGrid">
                        <button
                            type="button"
                            onClick={() =>
                                void monthly()
                            }
                        >
                            <span>
                                <Icon
                                    name="report"
                                    size={28}
                                />
                            </span>

                            <div>
                                <small>
                                    MONTHLY
                                </small>

                                <strong>
                                    Monthly Financial
                                    Report
                                </strong>

                                <p>
                                    {monthLabel(
                                        year,
                                        month
                                    )}
                                </p>
                            </div>

                            <Icon
                                name="arrow"
                                size={20}
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                void yearly()
                            }
                        >
                            <span>
                                <Icon
                                    name="chart"
                                    size={28}
                                />
                            </span>

                            <div>
                                <small>
                                    YEARLY
                                </small>

                                <strong>
                                    Yearly Financial
                                    Report
                                </strong>

                                <p>
                                    {year}
                                </p>
                            </div>

                            <Icon
                                name="arrow"
                                size={20}
                            />
                        </button>
                    </div>
                </section>
            </>
        );
    }


    /* =====================================================
       BACKUP
       ===================================================== */

    function BackupView() {
        async function downloadBackup() {
            const backup =
                await exportBackup();

            const blob =
                new Blob(
                    [
                        JSON.stringify(
                            backup,
                            null,
                            2
                        )
                    ],
                    {
                        type:
                            'application/json'
                    }
                );

            const url =
                URL.createObjectURL(
                    blob
                );

            const anchor =
                document
                    .createElement(
                        'a'
                    );

            anchor.href =
                url;

            anchor.download =
                `my-home-finance-backup-${localDateString()}.json`;

            document.body
                .appendChild(
                    anchor
                );

            anchor.click();

            anchor.remove();

            URL.revokeObjectURL(
                url
            );
        }


        async function reset() {
            if (
                !window.confirm(
                    'Reset all My Home Finance financial data on this device?'
                )
            ) {
                return;
            }

            if (
                !window.confirm(
                    'This permanently clears your financial data unless you have a backup. Continue?'
                )
            ) {
                return;
            }

            await resetFinanceData();

            setCalendarDate(
                null
            );
        }


        return (
            <>
                <MoreHeader
                    title="Data & Backup"
                    subtitle="Protect, restore and manage your personal finance records."
                    icon="backup"
                />

                <section className="mhfBackupGrid">
                    <div className="card mhfBackupCard">
                        <span>
                            <Icon
                                name="trash"
                                size={27}
                            />
                        </span>

                        <div>
                            <small className="eyebrow">
                                RECOVERY
                            </small>

                            <strong>
                                Recently Deleted
                            </strong>

                            <p>
                                {
                                    deletedTransactions
                                        .length
                                }{' '}
                                item
                                {deletedTransactions
                                    .length ===
                                1
                                    ? ''
                                    : 's'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setMoreView(
                                    'Trash'
                                )
                            }
                        >
                            View
                        </button>
                    </div>

                    <div className="card mhfBackupCard">
                        <span>
                            <Icon
                                name="backup"
                                size={27}
                            />
                        </span>

                        <div>
                            <small className="eyebrow">
                                BACKUP
                            </small>

                            <strong>
                                Export Backup
                            </strong>

                            <p>
                                Download your
                                complete finance
                                data.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                void downloadBackup()
                            }
                        >
                            Download
                        </button>
                    </div>

                    <div className="card mhfBackupCard">
                        <span>
                            <Icon
                                name="backup"
                                size={27}
                            />
                        </span>

                        <div>
                            <small className="eyebrow">
                                RESTORE
                            </small>

                            <strong>
                                Restore Backup
                            </strong>

                            <p>
                                Restore from a My
                                Home Finance JSON
                                backup.
                            </p>
                        </div>

                        <RestoreBackup
                            onDone={() =>
                                void load()
                            }
                        />
                    </div>
                </section>

                <section className="card mhfDangerZone">
                    <span className="eyebrow">
                        DANGER ZONE
                    </span>

                    <h2>
                        Reset Finance Data
                    </h2>

                    <p>
                        Permanently clear the
                        finance data stored on
                        this device.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            void reset()
                        }
                    >
                        Reset All Data
                    </button>
                </section>
            </>
        );
    }


    /* =====================================================
       TRASH
       ===================================================== */

    function TrashView() {
        async function restore(
            item:
            DeletedTransaction
        ) {
            await restoreDeletedTransaction(
                item.transaction.id
            );
        }

        async function permanent(
            item:
            DeletedTransaction
        ) {
            if (
                !window.confirm(
                    `Permanently delete "${item.transaction.name}"?`
                )
            ) {
                return;
            }

            await permanentlyDeleteTransaction(
                item.transaction.id
            );
        }

        async function empty() {
            if (
                deletedTransactions
                    .length ===
                0
            ) {
                return;
            }

            if (
                !window.confirm(
                    'Permanently delete everything in Recently Deleted?'
                )
            ) {
                return;
            }

            await emptyDeletedTransactions();
        }

        return (
            <>
                <MoreHeader
                    title="Recently Deleted"
                    subtitle="Restore deleted records or remove them permanently."
                    icon="trash"
                />

                <section className="card mhfMoreSection">
                    <div className="mhfSectionTitle">
                        <div>
                            <span className="eyebrow">
                                RECOVERY
                            </span>

                            <h2>
                                Deleted Items
                            </h2>
                        </div>

                        {deletedTransactions
                                .length >
                            0 && (
                                <button
                                    type="button"
                                    className="mhfDangerButton"
                                    onClick={() =>
                                        void empty()
                                    }
                                >
                                    Empty
                                </button>
                            )}
                    </div>

                    <div className="mhfTrashList">
                        {deletedTransactions
                            .map(
                                item => (
                                    <article
                                        key={
                                            item
                                                .transaction
                                                .id
                                        }
                                    >
                                        <TransactionIcon
                                            transaction={
                                                item
                                                    .transaction
                                            }
                                        />

                                        <div>
                                            <strong>
                                                {
                                                    item
                                                        .transaction
                                                        .name
                                                }
                                            </strong>

                                            <small>
                                                {money(
                                                    Number(
                                                        item
                                                            .transaction
                                                            .amount
                                                    )
                                                )}
                                            </small>
                                        </div>

                                        <div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void restore(
                                                        item
                                                    )
                                                }
                                            >
                                                Restore
                                            </button>

                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() =>
                                                    void permanent(
                                                        item
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </article>
                                )
                            )}

                        {deletedTransactions
                                .length ===
                            0 && (
                                <div className="emptyState">
                                    Recently Deleted is
                                    empty.
                                </div>
                            )}
                    </div>
                </section>
            </>
        );
    }


    /* =====================================================
       SETTINGS
       ===================================================== */

    function SettingsView() {
        return (
            <>
                <MoreHeader
                    title="Settings"
                    subtitle="Personalize the appearance of My Home Finance."
                    icon="settings"
                />

                <section className="card mhfSettingsCard">
                    <div>
                        <span>
                            <Icon
                                name={
                                    dark
                                        ? 'moon'
                                        : 'sun'
                                }
                                size={24}
                            />
                        </span>

                        <div>
                            <strong>
                                Appearance
                            </strong>

                            <small>
                                {dark
                                    ? 'Dark mode'
                                    : 'Light mode'}
                            </small>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setDark(
                                current =>
                                    !current
                            )
                        }
                    >
                        Switch to{' '}
                        {dark
                            ? 'Light'
                            : 'Dark'}
                    </button>
                </section>
            </>
        );
    }


    /* =====================================================
       MORE
       ===================================================== */

    function MoreHeader({
                            title,
                            subtitle,
                            icon
                        }: {
        title: string;
        subtitle: string;
        icon:
            'report' |
            'backup' |
            'trash' |
            'settings';
    }) {
        return (
            <section className="mhfMoreHeader">
                <button
                    type="button"
                    onClick={() =>
                        setMoreView(
                            'Menu'
                        )
                    }
                >
                    ← Back
                </button>

                <span>
                    <Icon
                        name={icon}
                        size={27}
                    />
                </span>

                <div>
                    <h1>
                        {title}
                    </h1>

                    <p>
                        {subtitle}
                    </p>
                </div>
            </section>
        );
    }


    function MorePage() {
        if (
            moreView ===
            'Reports'
        ) {
            return (
                <ReportsView />
            );
        }

        if (
            moreView ===
            'Backup'
        ) {
            return (
                <BackupView />
            );
        }

        if (
            moreView ===
            'Trash'
        ) {
            return (
                <TrashView />
            );
        }

        if (
            moreView ===
            'Settings'
        ) {
            return (
                <SettingsView />
            );
        }

        return (
            <>
                <section className="hero mhfMoreHero">
                    <span className="eyebrow">
                        MORE
                    </span>

                    <h1>
                        Tools & Settings
                    </h1>

                    <p>
                        Reports, backup,
                        recovery and app
                        preferences.
                    </p>
                </section>

                <section className="mhfMoreMenu">
                    <button
                        type="button"
                        onClick={() =>
                            setMoreView(
                                'Reports'
                            )
                        }
                    >
                        <span>
                            <Icon
                                name="report"
                                size={26}
                            />
                        </span>

                        <div>
                            <strong>
                                Financial Reports
                            </strong>

                            <small>
                                Monthly and yearly
                                reports
                            </small>
                        </div>

                        <Icon
                            name="arrow"
                            size={20}
                        />
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setMoreView(
                                'Backup'
                            )
                        }
                    >
                        <span>
                            <Icon
                                name="backup"
                                size={26}
                            />
                        </span>

                        <div>
                            <strong>
                                Data & Backup
                            </strong>

                            <small>
                                Backup, restore and
                                recovery
                            </small>
                        </div>

                        <Icon
                            name="arrow"
                            size={20}
                        />
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setMoreView(
                                'Settings'
                            )
                        }
                    >
                        <span>
                            <Icon
                                name="settings"
                                size={26}
                            />
                        </span>

                        <div>
                            <strong>
                                Settings
                            </strong>

                            <small>
                                Appearance and app
                                preferences
                            </small>
                        </div>

                        <Icon
                            name="arrow"
                            size={20}
                        />
                    </button>
                </section>
            </>
        );
    }


    /* =====================================================
       DETAILS MODAL
       ===================================================== */

    function TransactionDetailsModal() {
        if (
            !detailTransaction
        ) {
            return null;
        }

        const transaction =
            detailTransaction;

        const displayStatus =
            transaction.kind ===
            'expense'
                ? getDisplayStatus(
                    transaction
                )
                : null;

        const fields = [
            {
                label:
                    transaction.kind ===
                    'income'
                        ? 'Received Date'
                        : 'Expense Date',
                value:
                    longDate(
                        transaction
                            .occurred_on
                    )
            },
            {
                label:
                    transaction.kind ===
                    'income'
                        ? 'Income Source'
                        : 'Group',
                value:
                    transaction.kind ===
                    'income'
                        ? transaction
                            .name
                        : normalizeGroup(
                            transaction
                                .group_name
                        ) ||
                        'Not specified'
            },
            {
                label:
                    transaction.kind ===
                    'income'
                        ? 'Deposited To'
                        : 'Category',
                value:
                    transaction.kind ===
                    'income'
                        ? transaction
                            .merchant ||
                        'Not specified'
                        : transaction
                            .category ||
                        'Not specified'
            },
            {
                label:
                    transaction.kind ===
                    'income'
                        ? 'Received Via'
                        : 'Paid Via',
                value:
                    paymentMethodLabel(
                        transaction
                    )
            }
        ];

        if (
            transaction.kind ===
            'expense'
        ) {
            fields.push({
                label:
                    'Due Date',
                value:
                    transaction
                        .due_date
                        ? longDate(
                            transaction
                                .due_date
                        )
                        : 'Not set'
            });
        }

        if (
            transaction.notes
        ) {
            fields.push({
                label:
                    'Notes',
                value:
                transaction
                    .notes
            });
        }

        return (
            <div
                className="mhfOverlay"
                role="presentation"
                onMouseDown={
                    event => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setDetailTransaction(
                                null
                            );
                        }
                    }
                }
            >
                <section
                    className="mhfDetailsSheet"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Transaction details"
                >
                    <div className="mhfDetailsTop">
                        <div>
                            <span className="eyebrow">
                                {transaction
                                    .kind ===
                                'income'
                                    ? 'INCOME'
                                    : 'EXPENSE'}
                            </span>

                            <h2>
                                {
                                    transaction
                                        .name
                                }
                            </h2>
                        </div>

                        <button
                            type="button"
                            aria-label="Close"
                            onClick={() =>
                                setDetailTransaction(
                                    null
                                )
                            }
                        >
                            ×
                        </button>
                    </div>

                    <div className="mhfDetailsAmount">
                        <small>
                            Amount
                        </small>

                        <strong>
                            {transaction
                                .kind ===
                            'expense'
                                ? '−'
                                : '+'}
                            {money(
                                Number(
                                    transaction
                                        .amount
                                )
                            )}
                        </strong>

                        {displayStatus && (
                            <span
                                className={
                                    statusClass(
                                        displayStatus
                                    )
                                }
                            >
                                {displayStatusLabel(
                                    displayStatus
                                )}
                            </span>
                        )}
                    </div>

                    <div className="mhfDetailsRows">
                        {fields.map(
                            field => (
                                <div
                                    key={
                                        field.label
                                    }
                                >
                                    <small>
                                        {
                                            field.label
                                        }
                                    </small>

                                    <strong>
                                        {
                                            field.value
                                        }
                                    </strong>
                                </div>
                            )
                        )}
                    </div>

                    <div className="mhfDetailsActions">
                        {transaction.kind ===
                            'expense' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        void togglePaid(
                                            transaction
                                        )
                                    }
                                >
                                    <Icon
                                        name={
                                            transaction
                                                .status ===
                                            'paid'
                                                ? 'clock'
                                                : 'check'
                                        }
                                        size={18}
                                    />

                                    {transaction
                                        .status ===
                                    'paid'
                                        ? 'Mark Unpaid'
                                        : 'Mark Paid'}
                                </button>
                            )}

                        <button
                            type="button"
                            onClick={() =>
                                editTransaction(
                                    transaction
                                )
                            }
                        >
                            <Icon
                                name="edit"
                                size={18}
                            />

                            Edit
                        </button>

                        <button
                            type="button"
                            className="danger"
                            onClick={() =>
                                void removeTransaction(
                                    transaction
                                )
                            }
                        >
                            <Icon
                                name="trash"
                                size={18}
                            />

                            Delete
                        </button>
                    </div>
                </section>
            </div>
        );
    }


    /* =====================================================
       BUDGET POPUP
       ===================================================== */

    function BudgetPopup() {
        if (
            !budgetPopupOpen
        ) {
            return null;
        }

        return (
            <div className="mhfOverlay">
                <section
                    className="mhfBudgetPopup"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="mhfDetailsTop">
                        <div>
                            <span className="eyebrow">
                                MONTHLY BUDGET
                            </span>

                            <h2>
                                Set Budget
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setBudgetPopupOpen(
                                    false
                                )
                            }
                        >
                            ×
                        </button>
                    </div>

                    <p>
                        {monthLabel(
                            year,
                            month
                        )}
                    </p>

                    <label>
                        Budget Amount

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                                budgetDraft
                            }
                            onChange={
                                event =>
                                    setBudgetDraft(
                                        event
                                            .target
                                            .value
                                    )
                            }
                        />
                    </label>

                    <div className="mhfPopupActions">
                        <button
                            type="button"
                            onClick={() =>
                                setBudgetPopupOpen(
                                    false
                                )
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="primaryAction"
                            onClick={() =>
                                void saveBudgetAmount()
                            }
                        >
                            Save Budget
                        </button>
                    </div>
                </section>
            </div>
        );
    }


    /* =====================================================
       MAIN
       ===================================================== */

    return (
        <div className="v27">
            <style>
                {`
                :root {
                    --mhf-track: rgba(130, 145, 160, .18);
                }

                .dark {
                    --mhf-track: rgba(255, 255, 255, .09);
                }

                .mhfHomeToolbar,
                .mhfPageToolbar,
                .mhfCalendarTop {
                    display:flex;
                    align-items:flex-end;
                    justify-content:space-between;
                    gap:16px;
                    margin:18px 0 14px;
                }

                .mhfHomeToolbar h2,
                .mhfPageToolbar h2,
                .mhfCalendarTop h2 {
                    margin:4px 0 0;
                    font-size:clamp(1.35rem,4vw,2rem);
                }

                .mhfPeriod {
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                }

                .mhfPeriod select {
                    min-height:40px;
                    border-radius:12px;
                    padding:0 34px 0 12px;
                }

                .mhfHomeHeroArt,
                .mhfHeroVisual {
                    position:relative;
                    min-width:150px;
                    min-height:130px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                }

                .mhfHeroHouse {
                    width:108px;
                    height:108px;
                    border-radius:30px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:rgba(255,255,255,.88);
                    color:#6678e8;
                    box-shadow:0 20px 45px rgba(0,0,0,.15);
                    transform:rotate(-4deg);
                }

                .mhfHeroWallet {
                    position:absolute;
                    right:5px;
                    bottom:4px;
                    width:62px;
                    height:62px;
                    border-radius:20px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:white;
                    background:linear-gradient(145deg,#54c9c1,#5e82ef);
                    box-shadow:0 14px 30px rgba(0,0,0,.18);
                }

                .mhfHeroVisual {
                    border-radius:32px;
                    color:white;
                }

                .mhfHeroVisual.expense {
                    background:linear-gradient(145deg,#ff9c69,#f27687);
                }

                .mhfHeroVisual.income {
                    background:linear-gradient(145deg,#5ccdb9,#6989f0);
                }

                .mhfMetricStrip {
                    display:grid;
                    grid-template-columns:repeat(4,minmax(0,1fr));
                    gap:10px;
                    margin-bottom:16px;
                }

                .mhfMetric {
                    min-height:88px;
                    border-radius:18px;
                    padding:13px;
                    display:flex;
                    gap:11px;
                    align-items:center;
                    color:white;
                    box-shadow:0 10px 24px rgba(0,0,0,.08);
                }

                .mhfMetric.income {
                    background:linear-gradient(135deg,#6c7ce7,#8f83ec);
                }

                .mhfMetric.expense {
                    background:linear-gradient(135deg,#ff9661,#ffbd8b);
                }

                .mhfMetric.available {
                    background:linear-gradient(135deg,#11acc5,#51d5e6);
                }

                .mhfMetric.today {
                    background:linear-gradient(135deg,#5366b8,#7786d3);
                }

                .mhfMetricIcon {
                    width:40px;
                    height:40px;
                    flex:0 0 40px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:50%;
                    background:rgba(255,255,255,.94);
                    color:#5869c7;
                }

                .mhfMetric div {
                    min-width:0;
                }

                .mhfMetric strong,
                .mhfMetric small {
                    display:block;
                }

                .mhfMetric strong {
                    font-size:clamp(.86rem,2vw,1.1rem);
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                }

                .mhfMetric small {
                    margin-top:4px;
                    opacity:.9;
                    font-size:.72rem;
                }

                .mhfAnalyticsGrid,
                .mhfHomeLists,
                .mhfIncomeAnalysis,
                .mhfSavingsGrid {
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:16px;
                    margin-bottom:16px;
                }

                .mhfCashFlowCard,
                .mhfCategoryCard,
                .mhfListCard,
                .mhfBudgetCard,
                .mhfGroupsCard,
                .mhfMoreSection {
                    padding:20px;
                }

                .mhfSectionTitle {
                    display:flex;
                    align-items:flex-start;
                    justify-content:space-between;
                    gap:14px;
                    margin-bottom:16px;
                }

                .mhfSectionTitle h2 {
                    margin:4px 0 0;
                    font-size:1.2rem;
                }

                .mhfSectionTitle p {
                    margin:4px 0 0;
                }

                .mhfCashFlowContent,
                .mhfCategoryContent {
                    display:flex;
                    align-items:center;
                    gap:22px;
                }

                .mhfCashDonut,
                .mhfCategoryDonut,
                .mhfBudgetRing {
                    width:150px;
                    height:150px;
                    flex:0 0 150px;
                    border-radius:50%;
                    padding:17px;
                }

                .mhfCashDonutInner,
                .mhfCategoryDonutInner,
                .mhfBudgetRing > div {
                    width:100%;
                    height:100%;
                    border-radius:50%;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    text-align:center;
                    background:var(--card-bg,#fff);
                }

                .dark .mhfCashDonutInner,
                .dark .mhfCategoryDonutInner,
                .dark .mhfBudgetRing > div {
                    background:#1b1e1c;
                }

                .mhfCashDonutInner strong,
                .mhfCategoryDonutInner strong {
                    font-size:.92rem;
                }

                .mhfCashDonutInner small,
                .mhfCategoryDonutInner small {
                    margin-top:3px;
                    opacity:.7;
                }

                .mhfCashLegend {
                    flex:1;
                    display:grid;
                    gap:10px;
                }

                .mhfCashLegend > div {
                    display:grid;
                    grid-template-columns:10px 1fr auto;
                    align-items:center;
                    gap:8px;
                    padding:8px 0;
                    border-bottom:1px solid rgba(127,140,150,.15);
                }

                .mhfCashLegend strong {
                    font-size:.9rem;
                }

                .mhfLegendDot,
                .mhfCategoryDot {
                    width:9px;
                    height:9px;
                    border-radius:50%;
                }

                .mhfLegendDot.income {
                    background:#6ed9bd;
                }

                .mhfLegendDot.expense {
                    background:#63c8ed;
                }

                .mhfLegendDot.available {
                    background:#7e8df0;
                }

                .mhfCategoryLegend {
                    flex:1;
                    display:grid;
                    gap:4px;
                }

                .mhfCategoryLegend button {
                    width:100%;
                    border:0;
                    background:transparent;
                    display:grid;
                    grid-template-columns:10px 1fr auto;
                    gap:9px;
                    align-items:center;
                    padding:7px 4px;
                    text-align:left;
                    color:inherit;
                    cursor:pointer;
                }

                .mhfCategoryLegend button > span:nth-child(2) {
                    display:flex;
                    gap:6px;
                    align-items:center;
                }

                .mhfCategoryLegend small {
                    opacity:.6;
                }

                .mhfCategoryLegend b {
                    font-size:.82rem;
                }

                .mhfTransactionList {
                    display:grid;
                    gap:10px;
                }

                .mhfTransaction {
                    border:1px solid rgba(127,140,150,.18);
                    border-radius:18px;
                    padding:10px;
                    background:rgba(127,140,150,.045);
                }

                .mhfTransactionMain {
                    width:100%;
                    display:grid;
                    grid-template-columns:46px minmax(0,1fr) auto;
                    gap:11px;
                    align-items:center;
                    border:0;
                    padding:0;
                    background:transparent;
                    color:inherit;
                    text-align:left;
                    cursor:pointer;
                }

                .mhfTransactionIcon {
                    width:46px;
                    height:46px;
                    border-radius:15px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#fff;
                    background:linear-gradient(145deg,#6476df,#4eb9d0);
                }

                .mhfTransactionIcon.home {
                    background:linear-gradient(145deg,#6a8ce8,#61c5d7);
                }

                .mhfTransactionIcon.personal {
                    background:linear-gradient(145deg,#e99a5f,#f3c064);
                }

                .mhfTransactionIcon.credit-and-loan {
                    background:linear-gradient(145deg,#786fdd,#a278dc);
                }

                .mhfTransactionIcon.income {
                    background:linear-gradient(145deg,#4bbd9f,#63d7b8);
                }

                .mhfTransactionCopy {
                    min-width:0;
                }

                .mhfTransactionCopy strong,
                .mhfTransactionCopy small {
                    display:block;
                }

                .mhfTransactionCopy strong {
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                }

                .mhfTransactionCopy small {
                    margin-top:3px;
                    opacity:.65;
                    font-size:.78rem;
                }

                .mhfTransactionAmount {
                    display:flex;
                    flex-direction:column;
                    align-items:flex-end;
                    gap:5px;
                }

                .mhfTransactionAmount strong {
                    font-size:.9rem;
                    white-space:nowrap;
                }

                .mhfTransactionAmount .statusBadge {
                    font-size:.65rem;
                    padding:4px 7px;
                }

                .mhfMiniActions {
                    display:flex;
                    justify-content:flex-end;
                    gap:5px;
                    margin-top:8px;
                }

                .mhfMiniActions button {
                    width:32px;
                    height:30px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:9px;
                    border:1px solid rgba(127,140,150,.18);
                    background:rgba(127,140,150,.07);
                    color:inherit;
                    cursor:pointer;
                }

                .mhfMiniActions button.danger {
                    color:#e96873;
                }

                .mhfTextButton,
                .mhfClearFilter {
                    border:0;
                    background:transparent;
                    color:#7182ef;
                    cursor:pointer;
                    font-weight:700;
                }

                .mhfBudgetBody {
                    display:flex;
                    align-items:center;
                    gap:24px;
                }

                .mhfBudgetRing {
                    width:125px;
                    height:125px;
                    flex-basis:125px;
                    padding:12px;
                }

                .mhfBudgetRing strong,
                .mhfBudgetRing small {
                    display:block;
                }

                .mhfBudgetStats {
                    flex:1;
                    display:grid;
                    grid-template-columns:repeat(3,1fr);
                    gap:10px;
                }

                .mhfBudgetStats > div {
                    padding:12px;
                    border-radius:14px;
                    background:rgba(127,140,150,.07);
                }

                .mhfBudgetStats small,
                .mhfBudgetStats strong {
                    display:block;
                }

                .mhfBudgetStats strong {
                    margin-top:5px;
                    font-size:.92rem;
                }

                .mhfGroupGrid {
                    display:grid;
                    grid-template-columns:repeat(4,1fr);
                    gap:10px;
                }

                .mhfGroupGrid button {
                    min-height:120px;
                    border-radius:18px;
                    border:1px solid rgba(127,140,150,.18);
                    background:rgba(127,140,150,.05);
                    color:inherit;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    gap:8px;
                    cursor:pointer;
                }

                .mhfGroupGrid button.active {
                    border-color:#e8b64f;
                    box-shadow:0 0 0 2px rgba(232,182,79,.18);
                    background:rgba(232,182,79,.09);
                }

                .mhfGroupGrid button > span {
                    width:46px;
                    height:46px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:15px;
                    background:rgba(232,182,79,.14);
                    color:#d79e27;
                }

                .mhfGroupGrid small {
                    opacity:.65;
                }

                .mhfTransactionsHeading {
                    align-items:center;
                }

                .mhfIncomeMetrics {
                    display:grid;
                    grid-template-columns:repeat(3,1fr);
                    gap:12px;
                    margin-bottom:16px;
                }

                .mhfIncomeMetrics .card {
                    padding:16px;
                    display:grid;
                    grid-template-columns:42px 1fr;
                    column-gap:11px;
                    align-items:center;
                }

                .mhfIncomeMetrics .card > span {
                    grid-row:1 / 3;
                    width:42px;
                    height:42px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:14px;
                    color:#fff;
                    background:linear-gradient(145deg,#54c9b0,#6688ed);
                }

                .mhfIncomeMetrics small,
                .mhfIncomeMetrics strong {
                    display:block;
                }

                .mhfWeeklyChart {
                    height:190px;
                    display:flex;
                    align-items:flex-end;
                    justify-content:space-around;
                    gap:10px;
                    padding-top:12px;
                }

                .mhfWeeklyChart > div {
                    flex:1;
                    min-width:0;
                    text-align:center;
                }

                .mhfWeeklyChart > div > div {
                    height:120px;
                    display:flex;
                    align-items:flex-end;
                    justify-content:center;
                    margin-bottom:7px;
                }

                .mhfWeeklyChart > div > div span {
                    width:24px;
                    max-height:100%;
                    border-radius:9px 9px 4px 4px;
                    background:linear-gradient(to top,#6578e8,#61d0c2);
                }

                .mhfWeeklyChart strong,
                .mhfWeeklyChart small {
                    display:block;
                }

                .mhfWeeklyChart small {
                    margin-top:3px;
                    font-size:.65rem;
                    opacity:.6;
                    overflow:hidden;
                    text-overflow:ellipsis;
                }

                .mhfSourceList {
                    display:grid;
                    gap:9px;
                }

                .mhfSourceList > div:not(.emptyState) {
                    display:grid;
                    grid-template-columns:10px 1fr auto;
                    align-items:center;
                    gap:9px;
                    padding:10px 0;
                    border-bottom:1px solid rgba(127,140,150,.14);
                }

                .mhfSourceList > div > span {
                    width:9px;
                    height:9px;
                    border-radius:50%;
                }

                .mhfSavingsSection {
                    margin-top:18px;
                }

                .mhfGoalCard {
                    padding:18px;
                }

                .mhfGoalArt {
                    min-height:90px;
                    padding:15px;
                    border-radius:18px;
                    display:flex;
                    align-items:center;
                    gap:14px;
                    background:linear-gradient(135deg,rgba(102,122,234,.15),rgba(91,207,188,.12));
                }

                .mhfGoalArt > span {
                    width:60px;
                    height:60px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:20px;
                    color:#6578e8;
                    background:rgba(255,255,255,.7);
                }

                .dark .mhfGoalArt > span {
                    background:rgba(255,255,255,.08);
                }

                .mhfGoalArt small,
                .mhfGoalArt strong {
                    display:block;
                }

                .mhfGoalArt strong {
                    margin-top:4px;
                }

                .mhfGoalProgress {
                    margin:15px 0;
                }

                .mhfGoalProgress > div {
                    height:9px;
                    border-radius:99px;
                    overflow:hidden;
                    background:var(--mhf-track);
                }

                .mhfGoalProgress span {
                    display:block;
                    height:100%;
                    border-radius:99px;
                    background:linear-gradient(90deg,#6378ea,#60cfb8);
                }

                .mhfGoalProgress small {
                    display:block;
                    margin-top:5px;
                    opacity:.65;
                }

                .mhfGoalInputs {
                    display:grid;
                    grid-template-columns:1fr 1fr;
                    gap:10px;
                    margin-bottom:12px;
                }

                .mhfGoalInputs label {
                    font-size:.75rem;
                    font-weight:700;
                }

                .mhfGoalInputs input {
                    width:100%;
                    margin-top:5px;
                }

                .mhfCalendarHero {
                    min-height:145px;
                    border-radius:24px;
                    padding:16px;
                    margin-bottom:14px;
                    display:grid;
                    grid-template-columns:180px 1fr;
                    align-items:center;
                    gap:18px;
                    overflow:hidden;
                    border:1px solid rgba(127,140,150,.16);
                    background:linear-gradient(135deg,rgba(98,184,218,.12),rgba(111,206,166,.1));
                }

                .mhfCalendarHero h1 {
                    margin:4px 0;
                    font-size:1.8rem;
                }

                .mhfCalendarHero p {
                    margin:0;
                    max-width:620px;
                    opacity:.7;
                }

                .mhfCalendarNature {
                    position:relative;
                    height:115px;
                    border-radius:18px;
                    overflow:hidden;
                    background:linear-gradient(#7ac8e8 0 48%,#8bc79b 48% 100%);
                }

                .mhfSun {
                    position:absolute;
                    width:30px;
                    height:30px;
                    border-radius:50%;
                    right:20px;
                    top:15px;
                    background:#ffe88c;
                }

                .mhfMountain {
                    position:absolute;
                    width:110px;
                    height:90px;
                    bottom:-38px;
                    transform:rotate(45deg);
                    background:#4f907c;
                }

                .mhfMountain.one {
                    left:-12px;
                }

                .mhfMountain.two {
                    left:60px;
                    background:#6ba184;
                }

                .mhfNatureCalendar {
                    position:absolute;
                    left:15px;
                    bottom:13px;
                    width:46px;
                    height:46px;
                    border-radius:14px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#5269c9;
                    background:rgba(255,255,255,.92);
                    box-shadow:0 8px 20px rgba(0,0,0,.15);
                }

                .mhfCalendarCard,
                .mhfCalendarDetails {
                    padding:18px;
                    margin-bottom:16px;
                }

                .mhfCalendarLegend {
                    display:flex;
                    flex-wrap:wrap;
                    gap:12px;
                    margin-bottom:14px;
                    font-size:.72rem;
                }

                .mhfCalendarLegend span {
                    display:flex;
                    align-items:center;
                    gap:5px;
                }

                .mhfCalendarLegend i,
                .mhfCalendarDots i {
                    width:7px;
                    height:7px;
                    display:inline-block;
                    border-radius:50%;
                }

                .mhfCalendarLegend .paid,
                .mhfCalendarDots .paid {
                    background:#61d6ad;
                }

                .mhfCalendarLegend .due,
                .mhfCalendarDots .due {
                    background:#69ace4;
                }

                .mhfCalendarLegend .overdue,
                .mhfCalendarDots .overdue {
                    background:#ef7781;
                }

                .mhfCalendarLegend .upcoming,
                .mhfCalendarDots .upcoming {
                    background:#e9b954;
                }

                .mhfCalendarLegend .income,
                .mhfCalendarDots .income {
                    background:#9a82ef;
                }

                .mhfWeekdays,
                .mhfCalendarGrid {
                    display:grid;
                    grid-template-columns:repeat(7,1fr);
                    gap:6px;
                }

                .mhfWeekdays {
                    margin-bottom:6px;
                }

                .mhfWeekdays span {
                    text-align:center;
                    font-size:.65rem;
                    font-weight:800;
                    opacity:.55;
                }

                .mhfCalendarGrid button,
                .mhfCalendarBlank {
                    aspect-ratio:1 / .88;
                    min-height:54px;
                    border-radius:12px;
                }

                .mhfCalendarGrid button {
                    position:relative;
                    padding:8px;
                    border:1px solid rgba(127,140,150,.17);
                    background:rgba(127,140,150,.045);
                    color:inherit;
                    text-align:left;
                    cursor:pointer;
                }

                .mhfCalendarGrid button.today {
                    box-shadow:inset 0 0 0 1px #7384ec;
                }

                .mhfCalendarGrid button.selected {
                    background:rgba(115,132,236,.13);
                    border-color:#7384ec;
                }

                .mhfCalendarDots {
                    position:absolute;
                    left:8px;
                    bottom:7px;
                    display:flex;
                    gap:3px;
                    flex-wrap:wrap;
                }

                .mhfOverlay {
                    position:fixed;
                    inset:0;
                    z-index:1000;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:18px;
                    background:rgba(5,10,12,.62);
                    backdrop-filter:blur(12px);
                }

                .mhfDetailsSheet,
                .mhfBudgetPopup {
                    width:min(480px,100%);
                    max-height:88vh;
                    overflow:auto;
                    border-radius:26px;
                    padding:22px;
                    background:var(--card-bg,#fff);
                    color:inherit;
                    box-shadow:0 28px 80px rgba(0,0,0,.3);
                }

                .dark .mhfDetailsSheet,
                .dark .mhfBudgetPopup {
                    background:#191d1b;
                }

                .mhfDetailsTop {
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:12px;
                }

                .mhfDetailsTop h2 {
                    margin:4px 0 0;
                    font-size:1.55rem;
                }

                .mhfDetailsTop > button {
                    width:36px;
                    height:36px;
                    border-radius:50%;
                    border:0;
                    background:rgba(127,140,150,.12);
                    color:inherit;
                    font-size:1.3rem;
                    cursor:pointer;
                }

                .mhfDetailsAmount {
                    margin:20px 0 10px;
                    padding:18px 0;
                    border-top:1px solid rgba(127,140,150,.15);
                    border-bottom:1px solid rgba(127,140,150,.15);
                    display:grid;
                    grid-template-columns:1fr auto;
                    align-items:center;
                    gap:7px;
                }

                .mhfDetailsAmount small {
                    grid-column:1;
                    opacity:.6;
                }

                .mhfDetailsAmount strong {
                    grid-column:1;
                    font-size:1.8rem;
                }

                .mhfDetailsAmount .statusBadge {
                    grid-column:2;
                    grid-row:1 / 3;
                }

                .mhfDetailsRows {
                    display:grid;
                }

                .mhfDetailsRows > div {
                    display:grid;
                    grid-template-columns:130px 1fr;
                    gap:14px;
                    padding:13px 0;
                    border-bottom:1px solid rgba(127,140,150,.13);
                }

                .mhfDetailsRows small {
                    opacity:.6;
                }

                .mhfDetailsRows strong {
                    text-align:right;
                    overflow-wrap:anywhere;
                }

                .mhfDetailsActions {
                    display:flex;
                    gap:8px;
                    margin-top:18px;
                }

                .mhfDetailsActions button {
                    min-height:42px;
                    flex:1;
                    border-radius:12px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:6px;
                    cursor:pointer;
                }

                .mhfDetailsActions .danger {
                    color:#e56872;
                }

                .mhfBudgetPopup > p {
                    opacity:.7;
                }

                .mhfBudgetPopup label {
                    display:block;
                    font-weight:700;
                    margin-top:18px;
                }

                .mhfBudgetPopup input {
                    width:100%;
                    margin-top:7px;
                }

                .mhfPopupActions {
                    display:flex;
                    justify-content:flex-end;
                    gap:8px;
                    margin-top:18px;
                }

                .mhfMoreHero {
                    min-height:180px;
                    display:flex;
                    flex-direction:column;
                    justify-content:center;
                }

                .mhfMoreMenu {
                    display:grid;
                    gap:10px;
                }

                .mhfMoreMenu > button {
                    display:grid;
                    grid-template-columns:52px 1fr auto;
                    align-items:center;
                    gap:13px;
                    width:100%;
                    padding:14px;
                    border-radius:18px;
                    border:1px solid rgba(127,140,150,.16);
                    background:var(--card-bg,#fff);
                    color:inherit;
                    text-align:left;
                    cursor:pointer;
                }

                .dark .mhfMoreMenu > button {
                    background:#1c201e;
                }

                .mhfMoreMenu > button > span,
                .mhfMoreHeader > span,
                .mhfBackupCard > span {
                    width:52px;
                    height:52px;
                    border-radius:16px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#6b7de7;
                    background:rgba(107,125,231,.12);
                }

                .mhfMoreMenu strong,
                .mhfMoreMenu small {
                    display:block;
                }

                .mhfMoreMenu small {
                    margin-top:4px;
                    opacity:.6;
                }

                .mhfMoreHeader {
                    display:grid;
                    grid-template-columns:auto 58px 1fr;
                    align-items:center;
                    gap:13px;
                    margin-bottom:18px;
                    padding:18px;
                    border-radius:22px;
                    background:rgba(127,140,150,.07);
                }

                .mhfMoreHeader > button {
                    grid-column:1 / -1;
                    justify-self:start;
                    border:0;
                    background:transparent;
                    color:#7182ef;
                    cursor:pointer;
                }

                .mhfMoreHeader h1 {
                    margin:0;
                }

                .mhfMoreHeader p {
                    margin:5px 0 0;
                    opacity:.65;
                }

                .mhfReportGrid,
                .mhfBackupGrid {
                    display:grid;
                    grid-template-columns:repeat(2,1fr);
                    gap:12px;
                }

                .mhfReportGrid > button {
                    min-height:120px;
                    display:grid;
                    grid-template-columns:48px 1fr auto;
                    gap:12px;
                    align-items:center;
                    padding:15px;
                    border-radius:18px;
                    border:1px solid rgba(127,140,150,.16);
                    background:rgba(127,140,150,.05);
                    color:inherit;
                    text-align:left;
                    cursor:pointer;
                }

                .mhfReportGrid > button > span {
                    width:48px;
                    height:48px;
                    border-radius:15px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#6679e8;
                    background:rgba(102,121,232,.12);
                }

                .mhfReportGrid small,
                .mhfReportGrid strong,
                .mhfReportGrid p {
                    display:block;
                    margin:0;
                }

                .mhfReportGrid p {
                    margin-top:5px;
                    opacity:.6;
                }

                .mhfBackupGrid {
                    margin-bottom:16px;
                }

                .mhfBackupCard {
                    padding:17px;
                    display:grid;
                    grid-template-columns:52px 1fr;
                    gap:12px;
                }

                .mhfBackupCard > button,
                .mhfBackupCard > div:last-child {
                    grid-column:1 / -1;
                }

                .mhfBackupCard strong {
                    display:block;
                    margin-top:4px;
                }

                .mhfBackupCard p {
                    margin:4px 0 0;
                    opacity:.65;
                }

                .mhfDangerZone {
                    padding:20px;
                }

                .mhfDangerZone button,
                .mhfDangerButton {
                    color:#e45f6c;
                }

                .mhfTrashList {
                    display:grid;
                    gap:9px;
                }

                .mhfTrashList article {
                    display:grid;
                    grid-template-columns:46px 1fr auto;
                    align-items:center;
                    gap:11px;
                    padding:11px;
                    border-radius:16px;
                    background:rgba(127,140,150,.05);
                }

                .mhfTrashList article > div:nth-child(2) strong,
                .mhfTrashList article > div:nth-child(2) small {
                    display:block;
                }

                .mhfTrashList article > div:last-child {
                    display:flex;
                    gap:6px;
                }

                .mhfTrashList .danger {
                    color:#e45f6c;
                }

                .mhfSettingsCard {
                    padding:18px;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:14px;
                }

                .mhfSettingsCard > div {
                    display:flex;
                    align-items:center;
                    gap:12px;
                }

                .mhfSettingsCard > div > span {
                    width:48px;
                    height:48px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:15px;
                    color:#687be8;
                    background:rgba(104,123,232,.12);
                }

                .mhfSettingsCard strong,
                .mhfSettingsCard small {
                    display:block;
                }

                .mhfSettingsCard small {
                    margin-top:3px;
                    opacity:.6;
                }

                @media (max-width: 760px) {
                    .mhfMetricStrip {
                        grid-template-columns:1fr 1fr;
                    }

                    .mhfAnalyticsGrid,
                    .mhfHomeLists,
                    .mhfIncomeAnalysis,
                    .mhfSavingsGrid,
                    .mhfReportGrid,
                    .mhfBackupGrid {
                        grid-template-columns:1fr;
                    }

                    .mhfHomeToolbar,
                    .mhfPageToolbar,
                    .mhfCalendarTop {
                        align-items:flex-start;
                        flex-direction:column;
                    }

                    .mhfPeriod {
                        width:100%;
                    }

                    .mhfPeriod select {
                        flex:1;
                        min-width:0;
                    }

                    .mhfCashFlowContent,
                    .mhfCategoryContent {
                        gap:14px;
                    }

                    .mhfCashDonut,
                    .mhfCategoryDonut {
                        width:125px;
                        height:125px;
                        flex-basis:125px;
                        padding:14px;
                    }

                    .mhfGroupGrid {
                        grid-template-columns:1fr 1fr;
                    }

                    .mhfIncomeMetrics {
                        grid-template-columns:1fr;
                    }

                    .mhfBudgetStats {
                        grid-template-columns:1fr;
                    }

                    .mhfCalendarHero {
                        grid-template-columns:120px 1fr;
                        min-height:120px;
                        padding:12px;
                    }

                    .mhfCalendarNature {
                        height:92px;
                    }

                    .mhfCalendarHero h1 {
                        font-size:1.35rem;
                    }

                    .mhfCalendarHero p {
                        font-size:.78rem;
                    }

                    .mhfCalendarGrid button,
                    .mhfCalendarBlank {
                        min-height:48px;
                        border-radius:9px;
                    }

                    .mhfCalendarGrid button {
                        padding:6px;
                    }
                }

                @media (max-width: 520px) {
                    .mhfHomeHeroArt {
                        min-width:105px;
                        min-height:105px;
                    }

                    .mhfHeroHouse {
                        width:82px;
                        height:82px;
                    }

                    .mhfHeroWallet {
                        width:48px;
                        height:48px;
                    }

                    .mhfMetric {
                        min-height:78px;
                        padding:10px;
                    }

                    .mhfMetricIcon {
                        width:34px;
                        height:34px;
                        flex-basis:34px;
                    }

                    .mhfMetric strong {
                        font-size:.78rem;
                    }

                    .mhfMetric small {
                        font-size:.62rem;
                    }

                    .mhfCashFlowCard,
                    .mhfCategoryCard,
                    .mhfListCard,
                    .mhfBudgetCard,
                    .mhfGroupsCard,
                    .mhfMoreSection {
                        padding:14px;
                    }

                    .mhfCashFlowContent,
                    .mhfCategoryContent {
                        align-items:flex-start;
                    }

                    .mhfCashDonut,
                    .mhfCategoryDonut {
                        width:105px;
                        height:105px;
                        flex-basis:105px;
                        padding:11px;
                    }

                    .mhfCashDonutInner strong,
                    .mhfCategoryDonutInner strong {
                        font-size:.72rem;
                    }

                    .mhfCashLegend > div {
                        grid-template-columns:8px 1fr;
                        gap:6px;
                    }

                    .mhfCashLegend strong {
                        grid-column:2;
                        font-size:.72rem;
                    }

                    .mhfCategoryLegend button {
                        grid-template-columns:8px 1fr;
                        gap:6px;
                    }

                    .mhfCategoryLegend button b {
                        grid-column:2;
                        font-size:.7rem;
                    }

                    .mhfTransactionMain {
                        grid-template-columns:42px minmax(0,1fr) auto;
                        gap:8px;
                    }

                    .mhfTransactionIcon {
                        width:42px;
                        height:42px;
                    }

                    .mhfTransactionCopy strong {
                        font-size:.86rem;
                    }

                    .mhfTransactionCopy small {
                        font-size:.68rem;
                    }

                    .mhfTransactionAmount strong {
                        font-size:.78rem;
                    }

                    .mhfBudgetBody {
                        align-items:flex-start;
                        gap:13px;
                    }

                    .mhfBudgetRing {
                        width:100px;
                        height:100px;
                        flex-basis:100px;
                    }

                    .mhfGroupGrid button {
                        min-height:105px;
                    }

                    .mhfTransactionsHeading {
                        align-items:flex-start;
                        flex-direction:column;
                    }

                    .mhfTransactionsHeading .primaryAction {
                        width:100%;
                    }

                    .mhfCalendarHero {
                        grid-template-columns:95px 1fr;
                        gap:10px;
                    }

                    .mhfCalendarNature {
                        height:80px;
                    }

                    .mhfNatureCalendar {
                        width:36px;
                        height:36px;
                        left:8px;
                        bottom:8px;
                    }

                    .mhfCalendarHero h1 {
                        font-size:1.15rem;
                    }

                    .mhfCalendarHero p {
                        display:none;
                    }

                    .mhfWeekdays,
                    .mhfCalendarGrid {
                        gap:4px;
                    }

                    .mhfCalendarGrid button,
                    .mhfCalendarBlank {
                        min-height:42px;
                    }

                    .mhfCalendarGrid button strong {
                        font-size:.75rem;
                    }

                    .mhfCalendarDots {
                        left:5px;
                        bottom:5px;
                    }

                    .mhfCalendarDots i {
                        width:5px;
                        height:5px;
                    }

                    .mhfDetailsRows > div {
                        grid-template-columns:105px 1fr;
                        gap:10px;
                    }

                    .mhfDetailsActions {
                        flex-wrap:wrap;
                    }

                    .mhfDetailsActions button {
                        min-width:calc(50% - 4px);
                    }

                    .mhfGoalInputs {
                        grid-template-columns:1fr;
                    }

                    .mhfSettingsCard {
                        align-items:flex-start;
                        flex-direction:column;
                    }

                    .mhfSettingsCard > button {
                        width:100%;
                    }
                }
                `}
            </style>

            <main className="workspace">
                <header className="top">
                    <button
                        type="button"
                        className="brandName"
                        onClick={() => {
                            setPage(
                                'Home'
                            );

                            setMoreView(
                                'Menu'
                            );
                        }}
                    >
                        <span className="brandMark">
                            <Icon
                                name="home"
                                size={27}
                            />
                        </span>

                        <span className="brandText">
                            <strong>
                                My Home Finance
                            </strong>

                            <small>
                                Personal Finance
                            </small>
                        </span>
                    </button>

                    {(page ===
                        'Home' ||
                        page ===
                        'Expense' ||
                        page ===
                        'Income') && (
                        <button
                            type="button"
                            className="headerCalendar"
                            onClick={
                                openCalendar
                            }
                        >
                            <span className="headerCalendarIcon">
                                <Icon
                                    name="calendar"
                                    size={21}
                                />
                            </span>

                            <span className="headerCalendarText">
                                <small>
                                    {page ===
                                    'Income'
                                        ? 'INCOME'
                                        : page ===
                                        'Expense'
                                            ? 'EXPENSE'
                                            : 'FINANCE'}
                                </small>

                                <strong>
                                    {shortDate(
                                        todayString
                                    )}
                                </strong>
                            </span>
                        </button>
                    )}
                </header>

                {page ===
                    'Home' && (
                        <HomePage />
                    )}

                {page ===
                    'Expense' && (
                        <ExpensePage />
                    )}

                {page ===
                    'Income' && (
                        <IncomePage />
                    )}

                {page ===
                    'Calendar' && (
                        <CalendarPage />
                    )}

                {page ===
                    'More' && (
                        <MorePage />
                    )}
            </main>

            <nav
                className="bottomNav"
                aria-label="Primary navigation"
            >
                <button
                    type="button"
                    className={
                        page ===
                        'Home'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setPage(
                            'Home'
                        );

                        setMoreView(
                            'Menu'
                        );
                    }}
                >
                    <span>
                        <Icon
                            name="home"
                            size={21}
                        />
                    </span>

                    <small>
                        Home
                    </small>
                </button>

                <button
                    type="button"
                    className={
                        page ===
                        'Expense'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setPage(
                            'Expense'
                        );

                        setMoreView(
                            'Menu'
                        );
                    }}
                >
                    <span>
                        <Icon
                            name="expense"
                            size={21}
                        />
                    </span>

                    <small>
                        Expense
                    </small>
                </button>

                <button
                    type="button"
                    className={
                        page ===
                        'Income'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setPage(
                            'Income'
                        );

                        setMoreView(
                            'Menu'
                        );
                    }}
                >
                    <span>
                        <Icon
                            name="income"
                            size={21}
                        />
                    </span>

                    <small>
                        Income & Savings
                    </small>
                </button>

                <button
                    type="button"
                    className={
                        page ===
                        'More'
                            ? 'active'
                            : ''
                    }
                    onClick={() => {
                        setPage(
                            'More'
                        );

                        setMoreView(
                            'Menu'
                        );
                    }}
                >
                    <span>
                        <Icon
                            name="more"
                            size={21}
                        />
                    </span>

                    <small>
                        More
                    </small>
                </button>
            </nav>

            {modalKind && (
                <TransactionModal
                    kind={
                        modalKind
                    }
                    initial={
                        editing
                    }
                    initialGroup={
                        modalKind ===
                        'expense'
                            ? modalExpenseGroup
                            : null
                    }
                    onClose={() => {
                        setModalKind(
                            null
                        );

                        setEditing(
                            undefined
                        );

                        setModalExpenseGroup(
                            null
                        );
                    }}
                    onSaved={() => {
                        setModalKind(
                            null
                        );

                        setEditing(
                            undefined
                        );

                        setModalExpenseGroup(
                            null
                        );

                        setExpenseFilter(
                            'All'
                        );

                        void load();
                    }}
                />
            )}

            <TransactionDetailsModal />

            <BudgetPopup />
        </div>
    );
}