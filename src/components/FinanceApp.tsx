import {
    type ChangeEvent,
    type CSSProperties,
    type PointerEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import type {
    DeletedTransaction,
    DisplayStatus,
    ExpenseGroup,
    Goal,
    RecurringRule,
    ScheduledRecurringOccurrence,
    SavingsContribution,
    SavingsTrack,
    Transaction
} from '../lib/data';

import {
    addTransaction,
    deleteTransaction,
    dismissHomeActivity,
    displayStatusLabel,
    emptyDeletedTransactions,
    exportBackup,
    exportFilteredData,
    getBudget,
    getDisplayStatus,
    listDeletedTransactions,
    listDismissedHomeActivities,
    listGoals,
    listRecurringRules,
    listScheduledRecurringOccurrences,
    listSavingsContributions,
    listActionablePayments,
    listTransactions,
    listYear,
    localDateString,
    materializeDueRecurringRecords,
    permanentlyDeleteTransaction,
    range,
    resetFinanceData,
    selectivelyResetFinanceData,
    restoreDeletedTransaction,
    saveGoal,
    setBudget,
    setCategoryBudgets,
    subscribe,
    updateTransaction,
    upsertSavingsContribution,
    upsertRecurringRule,
    deleteRecurringRule
} from '../lib/data';

import TransactionModal from './TransactionModal';
import RestoreBackup from './RestoreBackup';
import { defaultCategories, incomeSources } from './TransactionModal';

import {
    monthlyReportHtml,
    printHtml,
    yearlyReportHtml
} from '../lib/reports';

import {
    addHeroImage,
    clearAllHeroImages,
    clearHeroImageCollection,
    listHeroImages,
    removeHeroImage,
    updateHeroImagePosition,
    updateHeroImagePresentation,
    DEFAULT_HERO_PRESENTATION,
    type HeroImage,
    type HeroPresentation,
    type HeroPage,
    type HeroTarget,
    type HeroPositionX,
    type HeroPositionY,
    type HeroTheme
} from '../lib/heroImages';


/* =========================================================
   TYPES
   ========================================================= */

type Page =
    | 'Home'
    | 'Expense'
    | 'Income'
    | 'Savings'
    | 'Calendar'
    | 'More';

type CalendarReturnPage =
    | 'Home'
    | 'Expense'
    | 'Income'
    | 'Savings';

type MoreView =
    | 'Menu'
    | 'Reports'
    | 'Backup'
    | 'Trash'
    | 'Settings'
    | 'HeroStudio'
    | 'BackupExport'
    | 'Automation';

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

const heroAssets = {
    home: [
        'assets/heroes/home/home-01.webp',
        'assets/heroes/home/home-02.webp',
        'assets/heroes/home/home-03.webp',
        'assets/heroes/home/home-04.webp'
    ],
    expense: [
        'assets/heroes/expense/expense-01.webp',
        'assets/heroes/expense/expense-02.webp',
        'assets/heroes/expense/expense-03.webp',
        'assets/heroes/expense/expense-04.webp'
    ],
    income: [
        'assets/heroes/income-savings/income-savings-01.webp',
        'assets/heroes/income-savings/income-savings-02.webp',
        'assets/heroes/income-savings/income-savings-03.webp',
        'assets/heroes/income-savings/income-savings-04.webp'
    ],
    more: [
        'assets/heroes/more/more-01.webp',
        'assets/heroes/more/more-02.webp',
        'assets/heroes/more/more-03.webp',
        'assets/heroes/more/more-04.webp'
    ],
    calendar: {
        Home: 'assets/heroes/calendar/home-calendar.webp',
        Expense: 'assets/heroes/calendar/expense-calendar.webp',
        Income: 'assets/heroes/calendar/income-savings-calendar.webp',
        Savings: 'assets/heroes/calendar/income-savings-calendar.webp'
    }
} as const;

type HeroAsset = {
    url: string;
    position_x?: HeroPositionX;
    position_y?: HeroPositionY;
    presentation?: HeroImage['presentation'];
};

type HeroTextPosition = 'left' | 'center' | 'right';
type HeroTextSize = 'small' | 'medium' | 'large';
type HeroCopySettings = Partial<Record<HeroPage, {
    title?: string;
    subtitle?: string;
    text_position?: Partial<Record<'mobile' | 'desktop', HeroTextPosition>>;
    text_size?: Partial<Record<'mobile' | 'desktop', HeroTextSize>>;
    title_position?: Partial<Record<'mobile' | 'desktop', HeroTextPosition>>;
    title_size?: Partial<Record<'mobile' | 'desktop', HeroTextSize>>;
    subtitle_position?: Partial<Record<'mobile' | 'desktop', HeroTextPosition>>;
    subtitle_size?: Partial<Record<'mobile' | 'desktop', HeroTextSize>>;
}>>;

const defaultHeroCopy: Record<HeroPage, { title: string; subtitle: string }> = {
    Home: { title: '', subtitle: 'Your home, your financial rhythm.' },
    Expense: { title: 'Manage Your Expenses', subtitle: 'Track today. Build a better tomorrow.' },
    Income: { title: 'Money coming in, goals moving forward', subtitle: 'Track income sources, deposits and savings progress.' },
    Savings: { title: 'Build the funds that support your future', subtitle: 'Track personal and home savings with clear monthly progress.' },
    More: { title: 'Tools & Settings', subtitle: 'Reports, backup, recovery and app preferences.' }
};

// A shared neutral overlay protects readability without recoloring photos.
const HERO_TEXT_OVERLAY = 'linear-gradient(90deg,rgba(0,0,0,.46) 0%,rgba(0,0,0,.20) 43%,rgba(0,0,0,.03) 76%)';


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


function dailyHeroAsset<T>(
    assets: readonly T[],
    today = new Date()
): T {
    const dayIndex = Math.floor(
        Date.UTC(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        ) / 86_400_000
    );

    return assets[
        dayIndex % assets.length
    ];
}


function heroBackground(
    asset: string | HeroAsset,
    overlay: string
) {
    const image = typeof asset === 'string' ? { url: asset } : asset;
    return {
        backgroundImage: `${overlay}, url("${image.url}")`,
        backgroundPosition: image.position_x || image.position_y
            ? `${image.position_x || 'center'} ${image.position_y || 'center'}`
            : undefined,
        '--mhf-hero-mobile-size': image.presentation ? (image.presentation.mobile.fit ? 'contain' : `${image.presentation.mobile.scale * 100}% auto`) : undefined,
        '--mhf-hero-mobile-position': image.presentation ? `${image.presentation.mobile.position_x}% ${image.presentation.mobile.position_y}%` : undefined,
        '--mhf-hero-desktop-size': image.presentation ? (image.presentation.desktop.fit ? 'contain' : `${image.presentation.desktop.scale * 100}% auto`) : undefined,
        '--mhf-hero-desktop-position': image.presentation ? `${image.presentation.desktop.position_x}% ${image.presentation.desktop.position_y}%` : undefined
    } as CSSProperties;
}


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
        | 'camera'
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

        case 'camera':
            return (
                <svg {...common}>
                    <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
                    <circle cx="12" cy="13" r="3.5" />
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

    // Calendar exploration is deliberately separate from the current-month
    // dashboard state used by Home, Expense, Income and Savings.
    const [calendarYear, setCalendarYear] = useState(now.getFullYear());
    const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
    const [calendarPeriodPickerOpen, setCalendarPeriodPickerOpen] = useState(false);
    const [calendarTransactions, setCalendarTransactions] = useState<Transaction[]>([]);
    const [scheduledCalendarOccurrences, setScheduledCalendarOccurrences] = useState<ScheduledRecurringOccurrence[]>([]);

    const [
        transactions,
        setTransactions
    ] =
        useState<Transaction[]>([]);

    const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);

    let yearTransactions: Transaction[],
        setYearTransactions: (value: (((prevState: Transaction[]) => Transaction[]) | Transaction[])) => void;
    [
        yearTransactions,
        setYearTransactions
    ] = useState<Transaction[]>([]);

    const [actionablePayments, setActionablePayments] =
        useState<Transaction[]>([]);

    const [
        deletedTransactions,
        setDeletedTransactions
    ] =
        useState<
            DeletedTransaction[]
        >([]);

    const [goals, setGoals] =
        useState<Goal[]>([]);

    const [savingsContributions, setSavingsContributions] =
        useState<SavingsContribution[]>([]);

    const [recurringRules, setRecurringRules] =
        useState<RecurringRule[]>([]);

    const [incomeDrillDown, setIncomeDrillDown] =
        useState<'income' | 'savings' | null>(null);

    const [weeklyIncomeDetail, setWeeklyIncomeDetail] =
        useState<number | null>(null);

    const [incomeRecordsOpen, setIncomeRecordsOpen] =
        useState(true);

    const [savingsTrackOpen, setSavingsTrackOpen] =
        useState<SavingsTrack | null>(null);

    const [budget, setBudgetValue] =
        useState(0);

    const [categoryBudgets, setCategoryBudgetsValue] =
        useState<Partial<Record<ExpenseGroup, number>>>({});

    const [dismissedActivityIds, setDismissedActivityIds] =
        useState<string[]>([]);

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

    const [categoryBudgetPopupOpen, setCategoryBudgetPopupOpen] =
        useState(false);

    const [periodPickerOpen, setPeriodPickerOpen] =
        useState(false);

    const todaySpendingRef =
        useRef<HTMLDivElement>(null);

    const [todayExpensesOpen, setTodayExpensesOpen] = useState(false);

    const [categoryBudgetDrafts, setCategoryBudgetDrafts] =
        useState<Record<ExpenseGroup, string>>({
            Home: '',
            Personal: '',
            'Credit & Loan': '',
            Others: ''
        });

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

    const [previousExpenseTotal, setPreviousExpenseTotal] = useState(0);
    const [copySelection, setCopySelection] = useState<string[]>([]);
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copyMode, setCopyMode] = useState<'copy' | 'move'>('copy');
    const [copyYear, setCopyYear] = useState(year);
    const [copyMonth, setCopyMonth] = useState(month);
    const [copyDestinations, setCopyDestinations] = useState<Array<{ year: number; month: number }>>([]);

    const expenseListRef = useRef<HTMLElement>(null);
    const copyWorkflowRef = useRef<HTMLButtonElement>(null);
    const receiptInputRef = useRef<HTMLInputElement>(null);
    const [receiptPhoto, setReceiptPhoto] = useState<{ name: string; previewUrl: string } | null>(null);
    const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

    const [dark, setDark] =
        useState(
            () =>
                localStorage.getItem(
                    'mhf-theme'
                ) === 'dark'
        );

    const [customHeroAssets, setCustomHeroAssets] =
        useState<Partial<Record<HeroPage, HeroAsset[]>>>({});
    const [customCalendarHeroAssets, setCustomCalendarHeroAssets] =
        useState<Partial<Record<HeroPage, HeroAsset[]>>>({});

    const [heroCopySettings, setHeroCopySettings] = useState<HeroCopySettings>(() => {
        try {
            return JSON.parse(localStorage.getItem('mhf-hero-copy-settings-v1') || '{}') as HeroCopySettings;
        } catch {
            return {};
        }
    });

    const [heroRotationSettings, setHeroRotationSettings] = useState<Partial<Record<HeroPage, number>>>(() => {
        const legacy = Number(localStorage.getItem('mhf-hero-slideshow-seconds') || 0);
        try {
            const saved = JSON.parse(localStorage.getItem('mhf-hero-rotation-settings-v1') || '{}') as Partial<Record<HeroPage, number>>;
            return Object.keys(saved).length > 0 ? saved : {
                Home: legacy, Expense: legacy, Income: legacy, Savings: legacy, More: legacy
            };
        } catch {
            return { Home: legacy, Expense: legacy, Income: legacy, Savings: legacy, More: legacy };
        }
    });

    const [heroSlide, setHeroSlide] = useState(0);
    // Keep Hero Studio's editing context above the nested view component. Image
    // persistence refreshes re-render FinanceApp, and these controls must never
    // fall back to Home/Main Page/Light as a side effect of that refresh.
    const [heroStudioPage, setHeroStudioPage] = useState<HeroPage>('Home');
    const [heroStudioTarget, setHeroStudioTarget] = useState<HeroTarget>('main');
    const [heroStudioTheme, setHeroStudioTheme] = useState<HeroTheme>('light');
    const [heroStudioDevice, setHeroStudioDevice] = useState<'mobile' | 'desktop'>('mobile');

    const refreshCustomHeroAssets = useCallback(async () => {
        const theme: HeroTheme = dark ? 'dark' : 'light';
        const pages: HeroPage[] = ['Home', 'Expense', 'Income', 'Savings', 'More'];
        const entries = await Promise.all(pages.map(async page => [
            page,
            (await listHeroImages(page, theme, 'main')).map(item => ({
                url: URL.createObjectURL(item.blob),
                position_x: item.position_x,
                position_y: item.position_y,
                presentation: item.presentation
            }))
        ] as const));
        setCustomHeroAssets(Object.fromEntries(entries));
        const calendarEntries = await Promise.all(pages.map(async page => [
            page,
            (await listHeroImages(page, theme, 'calendar')).map(item => ({
                url: URL.createObjectURL(item.blob),
                position_x: item.position_x,
                position_y: item.position_y,
                presentation: item.presentation
            }))
        ] as const));
        setCustomCalendarHeroAssets(Object.fromEntries(calendarEntries));
    }, [dark]);

    function pageHeroAsset(page: HeroPage, defaults: readonly string[]) {
        const selected = customHeroAssets[page];
        const collection: readonly HeroAsset[] = selected && selected.length > 0
            ? selected
            : defaults.map(url => ({ url }));
        return (heroRotationSettings[page] || 0) > 0 && collection.length > 1
            ? collection[heroSlide % collection.length]
            : dailyHeroAsset(collection);
    }

    function calendarHeroAsset(pageName: HeroPage, fallback: string) {
        const collection = customCalendarHeroAssets[pageName];
        return collection && collection.length > 0 ? dailyHeroAsset(collection) : { url: fallback };
    }

    function heroCopy(pageName: HeroPage) {
        const saved = heroCopySettings[pageName];
        const defaults = defaultHeroCopy[pageName];
        return {
            title: pageName === 'Home' ? defaults.title : saved?.title?.trim() || defaults.title,
            subtitle: saved?.subtitle?.trim() || defaults.subtitle
        };
    }

    function heroTextClass(pageName: HeroPage) {
        return 'heroCopy';
    }

    function heroCopyPartClass(pageName: HeroPage, part: 'title' | 'subtitle') {
        const saved = heroCopySettings[pageName];
        const legacyPosition = saved?.text_position;
        const legacySize = saved?.text_size;
        const positions = part === 'title' ? saved?.title_position || legacyPosition : saved?.subtitle_position || legacyPosition;
        const sizes = part === 'title' ? saved?.title_size || legacySize : saved?.subtitle_size || legacySize;
        return `mhfHero${part === 'title' ? 'Title' : 'Subtitle'} mhfHeroTextPosition--mobile-${positions?.mobile || 'left'} mhfHeroTextPosition--desktop-${positions?.desktop || positions?.mobile || 'left'} mhfHeroTextSize--mobile-${sizes?.mobile || 'medium'} mhfHeroTextSize--desktop-${sizes?.desktop || sizes?.mobile || 'medium'}`;
    }


    /* =====================================================
       LOAD
       ===================================================== */

    const load =
        useCallback(
            async () => {
                await materializeDueRecurringRecords();
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
                    todayTransactionResult,
                    goalResult,
                    savingsContributionResult,
                    budgetResult,
                    yearResult,
                    deletedResult,
                    dismissedActivityResult,
                    actionablePaymentsResult,
                    recurringRulesResult
                ] =
                    await Promise.all([
                        listTransactions(
                            start,
                            end
                        ),
                        listTransactions(todayString, todayString),
                        listGoals(),
                        listSavingsContributions(),
                        getBudget(start),
                        listYear(year),
                        listDeletedTransactions(),
                        listDismissedHomeActivities(),
                        listActionablePayments(),
                        listRecurringRules()
                    ]);

                setTransactions(
                    transactionResult
                        .data || []
                );

                setTodayTransactions(todayTransactionResult.data || []);

                setGoals(
                    goalResult
                        .data || []
                );

                setSavingsContributions(
                    savingsContributionResult.data || []
                );

                setRecurringRules(
                    recurringRulesResult.data || []
                );

                setBudgetValue(
                    budgetResult
                        .data
                        ?.amount || 0
                );

                setCategoryBudgetsValue(
                    budgetResult
                        .data
                        ?.category_amounts || {}
                );

                setDismissedActivityIds(
                    dismissedActivityResult.data || []
                );

                setYearTransactions(
                    yearResult
                        .data || []
                );

                setDeletedTransactions(
                    deletedResult
                        .data || []
                );

                setActionablePayments(
                    actionablePaymentsResult.data || []
                );
            },
            [
                year,
                month,
                todayString
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

    useEffect(() => {
        if (page !== 'Calendar') return;
        const [start, end] = range(calendarYear, calendarMonth);
        void Promise.all([
            listTransactions(start, end),
            listScheduledRecurringOccurrences(start, end)
        ]).then(([transactionResult, scheduledResult]) => {
            setCalendarTransactions(transactionResult.data || []);
            setScheduledCalendarOccurrences(scheduledResult.data || []);
        });
    }, [page, calendarYear, calendarMonth, transactions, recurringRules]);

    useEffect(() => {
        if (page !== 'Home' && page !== 'Expense' && page !== 'Income' && page !== 'Savings') return;
        const current = new Date();
        const currentYear = current.getFullYear();
        const currentMonth = current.getMonth() + 1;
        if (year !== currentYear) setYear(currentYear);
        if (month !== currentMonth) setMonth(currentMonth);
    }, [page, year, month]);

    useEffect(() => {
        const previous = new Date(year, month - 2, 1);
        const [start, end] = range(previous.getFullYear(), previous.getMonth() + 1);
        void listTransactions(start, end).then(result => {
            setPreviousExpenseTotal((result.data || [])
                .filter(item => item.kind === 'expense')
                .reduce((total, item) => total + Number(item.amount), 0));
        });
    }, [year, month]);

    useEffect(() => {
        setCopySelection([]);
        setCopyYear(year);
        setCopyMonth(month);
        setCopyDestinations([]);
    }, [year, month]);


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

    useEffect(() => {
        void refreshCustomHeroAssets();
    }, [refreshCustomHeroAssets]);

    useEffect(() => {
        try {
            localStorage.setItem('mhf-hero-rotation-settings-v1', JSON.stringify(heroRotationSettings));
        } catch {
            // The Settings screen reports user-triggered persistence failures.
        }
        const activeHeroPage: HeroPage | null = page === 'Calendar' ? null : page;
        const seconds = activeHeroPage ? heroRotationSettings[activeHeroPage] || 0 : 0;
        if (seconds <= 0) return;
        const interval = window.setInterval(() => setHeroSlide(current => current + 1), seconds * 1000);
        return () => window.clearInterval(interval);
    }, [heroRotationSettings, page]);


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
        useMemo(
            () => savingsContributions
                .filter(
                    item => item.month_start === `${year}-${String(month).padStart(2, '0')}-01`
                )
                .reduce(
                    (total, item) => total + Number(item.amount),
                    0
                ),
            [savingsContributions, year, month]
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
                todayTransactions
                    .filter(
                        item => item.kind === 'expense'
                    ),
            [
                todayTransactions
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

    const annualCashFlow =
        useMemo(
            () => Array.from({ length: 12 }, (_, index) => {
                const currentMonth = index + 1;
                const monthTransactions = yearTransactions.filter(item => {
                    const [, transactionMonth] = item.occurred_on.split('-').map(Number);
                    return transactionMonth === currentMonth;
                });
                const monthlyIncome = monthTransactions
                    .filter(item => item.kind === 'income')
                    .reduce((total, item) => total + Number(item.amount), 0);
                const monthlyExpense = monthTransactions
                    .filter(item => item.kind === 'expense')
                    .reduce((total, item) => total + Number(item.amount), 0);

                return {
                    month: currentMonth,
                    label: monthName(currentMonth).slice(0, 3),
                    income: monthlyIncome,
                    expense: monthlyExpense,
                    available: monthlyIncome - monthlyExpense
                };
            }),
            [yearTransactions]
        );

    const visibleTodayExpenses =
        todayExpenses.filter(
            item => !dismissedActivityIds.includes(item.id)
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
                    ...actionablePayments
                ]
                    .filter(
                        item => {
                            const paymentDate = item.due_date || item.occurred_on;
                            return getDisplayStatus(item) !== 'paid' && paymentDate.startsWith(`${year}-${String(month).padStart(2, '0')}-`);
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
            [actionablePayments, year, month]
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

    const weeklyExpenseData =
        useMemo(() => Array.from({ length: 7 }, (_, index) => {
            const day = index + 1;
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const groups = expenseGroups.reduce((totals, group) => ({ ...totals, [group]: 0 }), {} as Record<ExpenseGroup, number>);
            expenseTransactions.filter(item => item.occurred_on === date).forEach(item => {
                const group = normalizeGroup(item.group_name);
                if (group) groups[group] += Number(item.amount);
            });
            const amount = Object.values(groups).reduce((total, value) => total + value, 0);
            const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(year, month - 1, day).getDay()];
            return { day, label: `${weekday} ${day}`, amount, groups };
        }), [expenseTransactions, year, month]);

    const weeklyExpenseTotal = weeklyExpenseData.reduce((total, item) => total + item.amount, 0);
    const weeklyExpenseMax = Math.max(1, ...weeklyExpenseData.map(item => item.amount));

    const budgetPercent = budget > 0 ? Math.min(100, (expenses / budget) * 100) : 0;
    const expenseChange = previousExpenseTotal > 0
        ? ((expenses - previousExpenseTotal) / previousExpenseTotal) * 100
        : null;


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

    function clearReceiptPhoto() {
        setReceiptPhoto(current => {
            if (current) URL.revokeObjectURL(current.previewUrl);
            return null;
        });
        if (receiptInputRef.current) receiptInputRef.current.value = '';
    }

    function openReceiptPicker() {
        receiptInputRef.current?.click();
    }

    function selectReceiptPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            window.alert('Choose an image file for the receipt preview.');
            event.target.value = '';
            return;
        }
        setReceiptPhoto(current => {
            if (current) URL.revokeObjectURL(current.previewUrl);
            return { name: file.name, previewUrl: URL.createObjectURL(file) };
        });
        event.target.value = '';
        setReceiptPreviewOpen(true);
    }

    function continueFromReceiptPhoto() {
        setReceiptPreviewOpen(false);
        addExpense(expenseFilter === 'All' ? null : expenseFilter);
    }

    function showAllExpenses() {
        const scrollTop = window.scrollY;
        setExpenseFilter('All');
        window.requestAnimationFrame(() => window.scrollTo({ top: scrollTop, behavior: 'auto' }));
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

    function selectExpenseForCopy(transactionId: string) {
        setCopySelection(current => current.includes(transactionId)
            ? current.filter(id => id !== transactionId)
            : [...current, transactionId]);
        window.setTimeout(() => copyWorkflowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    }

    function setCurrentFinancialPeriod() {
        const current = new Date();
        setYear(current.getFullYear());
        setMonth(current.getMonth() + 1);
    }

    function dateInDestinationPeriod(sourceDate: string | null, destinationYear = copyYear, destinationMonth = copyMonth): string | null {
        if (!sourceDate) return null;
        const sourceDay = Number(sourceDate.split('-')[2]);
        const lastDay = new Date(destinationYear, destinationMonth, 0).getDate();
        return `${destinationYear}-${String(destinationMonth).padStart(2, '0')}-${String(Math.min(sourceDay, lastDay)).padStart(2, '0')}`;
    }

    function toggleCopyDestinationMonth(destinationMonth: number) {
        setCopyDestinations(current => {
            const exists = current.some(item => item.year === copyYear && item.month === destinationMonth);
            const next = exists
                ? current.filter(item => item.year !== copyYear || item.month !== destinationMonth)
                : [...current, { year: copyYear, month: destinationMonth }];
            return next.sort((a, b) => a.year - b.year || a.month - b.month);
        });
    }

    async function applyCopyOrMove() {
        const selected = expenseTransactions.filter(item => copySelection.includes(item.id));
        if (selected.length === 0) {
            window.alert('Select one or more expenses first.');
            return;
        }

        const destinations = copyMode === 'copy' ? copyDestinations : [{ year: copyYear, month: copyMonth }];
        if (destinations.length === 0) {
            window.alert('Add one or more destination periods before copying.');
            return;
        }

        let createdOrMoved = 0;
        for (const destinationPeriod of destinations) {
            const [destinationStart, destinationEnd] = range(destinationPeriod.year, destinationPeriod.month);
            const destinationResult = await listTransactions(destinationStart, destinationEnd);
            const destination = destinationResult.data || [];
            for (const source of selected) {
                const occurredOn = dateInDestinationPeriod(source.occurred_on, destinationPeriod.year, destinationPeriod.month) || source.occurred_on;
                const dueDate = dateInDestinationPeriod(source.due_date, destinationPeriod.year, destinationPeriod.month);
                const sameOriginalPeriod = source.occurred_on.slice(0, 7) === `${destinationPeriod.year}-${String(destinationPeriod.month).padStart(2, '0')}`;
                const duplicate = sameOriginalPeriod || destination.some(item =>
                    item.kind === 'expense' && item.name === source.name &&
                    item.group_name === source.group_name && item.category === source.category &&
                    Number(item.amount) === Number(source.amount) && item.occurred_on === occurredOn
                );
                if (duplicate) continue;
                if (copyMode === 'move') {
                await updateTransaction(source.id, { occurred_on: occurredOn, due_date: dueDate });
                } else {
                await addTransaction({
                    occurred_on: occurredOn,
                    kind: 'expense',
                    group_name: source.group_name,
                    category: source.category,
                    name: source.name,
                    merchant: source.merchant,
                    amount: Number(source.amount),
                    status: source.status,
                    payment_method: source.payment_method,
                    due_date: dueDate,
                    notes: source.notes
                });
                }
                createdOrMoved += 1;
            }
        }

        if (createdOrMoved === 0) {
            window.alert('No expenses were copied or moved. Matching records in the original or destination period were skipped.');
            return;
        }

        setCopySelection([]);
        setCopyDialogOpen(false);
        setCopyDestinations([]);
        await load();
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
                'Savings'
                    ? 'Savings'
                    : page ===
                'Expense'
                    ? 'Expense'
                    : 'Home';

        setCalendarReturnPage(
            source
        );

        const current = new Date();
        setCalendarYear(Math.min(2065, Math.max(2026, current.getFullYear())));
        setCalendarMonth(current.getMonth() + 1);

        setCalendarDate(
            null
        );

        setCalendarPeriodPickerOpen(false);

        setPage(
            'Calendar'
        );
    }


    function returnFromCalendar() {
        setCalendarPeriodPickerOpen(false);
        setCalendarDate(
            null
        );
        setPage(calendarReturnPage);
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


    function openCategoryBudgets() {
        setCategoryBudgetDrafts(
            expenseGroups.reduce(
                (drafts, group) => ({
                    ...drafts,
                    [group]: categoryBudgets[group] === undefined
                        ? ''
                        : String(categoryBudgets[group])
                }),
                {} as Record<ExpenseGroup, string>
            )
        );
        setCategoryBudgetPopupOpen(true);
    }


    async function saveCategoryBudgetAmounts() {
        const amounts = expenseGroups.reduce(
            (result, group) => {
                const value = categoryBudgetDrafts[group].trim();
                if (value !== '') {
                    result[group] = Number(value);
                }
                return result;
            },
            {} as Partial<Record<ExpenseGroup, number>>
        );

        if (Object.values(amounts).some(value => !Number.isFinite(value) || value < 0)) {
            window.alert('Each category budget must be zero or greater.');
            return;
        }

        const [start] = range(year, month);
        const result = await setCategoryBudgets(start, amounts);
        if (result.error) {
            window.alert(result.error.message);
            return;
        }

        setCategoryBudgetsValue(result.data?.category_amounts || {});
        setCategoryBudgetPopupOpen(false);
    }


    async function dismissTodayActivity(transaction: Transaction) {
        const result = await dismissHomeActivity(transaction.id);
        if (result.error) {
            window.alert(result.error.message);
            return;
        }
        setDismissedActivityIds(current => [...current, transaction.id]);
    }


    /* =====================================================
       PERIOD SELECTOR
       ===================================================== */

    function PeriodSelector({ compact = false, label = 'Finance Overview', minYear = 2016, maxYear = 2050, selectedYear = year, selectedMonth = month, onSelectPeriod }: { compact?: boolean; label?: string; minYear?: number; maxYear?: number; selectedYear?: number; selectedMonth?: number; onSelectPeriod?: (nextYear: number, nextMonth: number) => void }) {
        const current = new Date();
        const currentYear = Math.min(maxYear, Math.max(minYear, current.getFullYear()));
        const years = Array.from(
            { length: maxYear - minYear + 1 },
            (_, index) => minYear + index
        );

        if (!compact) {
            return <div className="mhfPeriod"><select aria-label="Reporting month and year" value={`${selectedYear}-${selectedMonth}`} onChange={event => {
                const [nextYear, nextMonth] = event.target.value.split('-').map(Number);
                if (onSelectPeriod) onSelectPeriod(nextYear, nextMonth);
                else { setYear(nextYear); setMonth(nextMonth); }
            }}>
                {years.flatMap(selectedYear => Array.from({ length: 12 }, (_, index) => index + 1).map(selectedMonth => <option key={`${selectedYear}-${selectedMonth}`} value={`${selectedYear}-${selectedMonth}`}>{monthLabel(selectedYear, selectedMonth)}</option>))}
            </select></div>;
        }

        return (
            <>
                <button
                    type="button"
                    className="mhfPeriodTrigger"
                    aria-haspopup="dialog"
                    aria-expanded={periodPickerOpen}
                    onClick={() => setPeriodPickerOpen(true)}
                >
                    <span className="mhfPeriodLabel">{monthLabel(selectedYear, selectedMonth)}</span>
                    <span className="mhfPeriodChevron" aria-hidden="true">
                        <svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
                    </span>
                </button>

                {periodPickerOpen && <div className="mhfOverlay" onMouseDown={event => {
                    if (event.target === event.currentTarget) setPeriodPickerOpen(false);
                }}>
                    <section className="mhfPeriodSheet" role="dialog" aria-modal="true" aria-label="Select reporting period">
                        <div className="mhfDetailsTop"><div><span className="eyebrow">{label}</span><h2>Select period</h2></div><button type="button" aria-label="Close" onClick={() => setPeriodPickerOpen(false)}>×</button></div>
                        <label>Year
                            <select value={selectedYear} onChange={event => onSelectPeriod ? onSelectPeriod(Number(event.target.value), selectedMonth) : setYear(Number(event.target.value))}>
                                {years.map(value => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </label>
                        <div className="mhfMonthGrid">
                            {Array.from({ length: 12 }, (_, index) => index + 1).map(value => <button key={value} type="button" className={value === selectedMonth ? 'active' : ''} onClick={() => { if (onSelectPeriod) onSelectPeriod(selectedYear, value); else setMonth(value); setPeriodPickerOpen(false); }}>{monthName(value).slice(0, 3)}</button>)}
                        </div>
                        <button type="button" className="mhfTextButton" onClick={() => { if (onSelectPeriod) onSelectPeriod(currentYear, current.getMonth() + 1); else { setYear(currentYear); setMonth(current.getMonth() + 1); } setPeriodPickerOpen(false); }}>This Month</button>
                    </section>
                </div>}
            </>
        );
    }

    function CurrentDateContext() {
        return <p className="mhfCurrentDateContext" aria-label="Current date">{fullDate()}</p>;
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
            const source = transaction.name.toLowerCase();
            const incomeIcon = source.includes('uber') || source.includes('lyft')
                ? 'wallet'
                : source.includes('salary') || source.includes('bonus')
                    ? 'bank'
                    : source.includes('interest') || source.includes('investment')
                        ? 'chart'
                        : 'income';
            return (
                <span className="mhfTransactionIcon income">
                    <Icon
                        name={incomeIcon}
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
                                    showStatus = true,
                                    homeMode = false,
                                    compactExpenseMode = false,
                                    compactIncomeMode = false,
                                    onDismiss
                                }: {
        transaction:
            Transaction;
        showStatus?: boolean;
        homeMode?: boolean;
        compactExpenseMode?: boolean;
        compactIncomeMode?: boolean;
        onDismiss?: () => void;
    }) {
        const displayStatus =
            transaction.kind ===
            'expense'
                ? getDisplayStatus(
                    transaction
                )
                : null;

        return (
            <article className={`${homeMode ? 'mhfTransaction mhfHomeRow' : 'mhfTransaction'}${compactExpenseMode ? ' mhfExpenseCompactTransaction' : ''}${compactIncomeMode ? ' mhfIncomeCompactTransaction' : ''}`}>
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
                        <Icon name={compactIncomeMode ? 'arrow' : 'eye'} size={17} />
                    </button>

                    {!homeMode && !compactExpenseMode && !compactIncomeMode && transaction.kind ===
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

                    {!homeMode && !compactExpenseMode && !compactIncomeMode && <button
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
                    </button>}

                    {!homeMode && !compactExpenseMode && !compactIncomeMode && <button
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
                    </button>}

                    {homeMode && onDismiss && <button
                        type="button"
                        title="Dismiss from Home"
                        aria-label="Dismiss from Home"
                        onClick={onDismiss}
                    >
                        <Icon name="trash" size={17} />
                    </button>}
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
        const values = annualCashFlow.flatMap(item => [
            item.income,
            item.expense,
            item.available
        ]);
        const maxValue = Math.max(1, ...values.map(value => Math.abs(value)));
        const selectedCashFlow = annualCashFlow[month - 1];
        const barHeight = (value: number) => `${Math.max(3, Math.round((Math.abs(value) / maxValue) * 100))}%`;

        const categoryStatus = (group: ExpenseGroup) => {
            const planned = categoryBudgets[group] || 0;
            const spent = groupTotals[group];
            const percent = planned > 0 ? (spent / planned) * 100 : 0;
            if (planned <= 0) return { planned, spent, percent, label: 'No budget', tone: 'neutral' };
            if (percent >= 100) return { planned, spent, percent, label: 'Over Budget', tone: 'over' };
            if (percent >= 90) return { planned, spent, percent, label: 'Near Limit', tone: 'near' };
            if (percent >= 75) return { planned, spent, percent, label: 'Watch', tone: 'watch' };
            return { planned, spent, percent, label: 'On Track', tone: 'on-track' };
        };

        const budgetStatuses = expenseGroups.map(group => ({
            group,
            ...categoryStatus(group)
        }));
        const overBudget = budgetStatuses.find(item => item.tone === 'over');
        const approaching = budgetStatuses.find(item => item.tone === 'near' || item.tone === 'watch');
        const largest = [...categoryBreakdown].sort((a, b) => b.amount - a.amount)[0];
        const insight = overBudget
            ? `${overBudget.group} is ${money(overBudget.spent - overBudget.planned)} over its ${monthName(month)} budget.`
            : approaching
                ? `${approaching.group} has used ${Math.round(approaching.percent)}% of its planned amount.`
                : expenses > 0
                    ? `${largest.group} is your largest spending category at ${money(largest.amount)} this month.`
                    : `No expenses recorded for ${monthName(month)} yet.`;

        return (
            <section className="mhfHomeAnalysis">
                <div className="card mhfCashFlowCard mhfAnnualChartCard">
                    <div className="mhfSectionTitle">
                        <div>
                            <span className="eyebrow">{year} OVERVIEW</span>
                            <h2>Monthly Cash Flow</h2>
                        </div>
                    </div>

                    <div className="mhfChartLegend" aria-label="Cash flow series">
                        <span><i className="income" />Income</span>
                        <span><i className="expense" />Expense</span>
                        <span><i className="available" />Available</span>
                    </div>

                    <div className="mhfCashFlowViewport" aria-label={`${year} grouped monthly cash flow`}>
                        <div className="mhfCashFlowBars">
                            {annualCashFlow.map(item => <button key={item.month} type="button" className={item.month === month ? 'selected' : ''} aria-label={`${monthName(item.month)}: income ${money(item.income)}, expense ${money(item.expense)}, available ${money(item.available)}`}>
                                <span className="mhfCashFlowBarGroup" aria-hidden="true">
                                    <i className="income" style={{ height: barHeight(item.income) }} />
                                    <i className="expense" style={{ height: barHeight(item.expense) }} />
                                    <i className={item.available < 0 ? 'available negative' : 'available'} style={{ height: barHeight(item.available) }} />
                                </span>
                                <small>{item.label}</small>
                            </button>)}
                        </div>
                    </div>

                    <div className="mhfChartTooltip" aria-live="polite">
                        <button type="button" onClick={() => setPage('Income')}><small>Income</small><strong>{money(selectedCashFlow.income)}</strong></button>
                        <button type="button" onClick={() => setPage('Expense')}><small>Expense</small><strong>{money(selectedCashFlow.expense)}</strong></button>
                        <button type="button" onClick={() => setPage('Income')}><small>Available</small><strong>{money(selectedCashFlow.available)}</strong></button>
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
                                                    {item.group}
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

                <section className="mhfBudgetInsight" aria-live="polite">
                    <span aria-hidden="true">💡</span>
                    <div><small>BUDGET INSIGHT</small><p>{insight}</p></div>
                </section>
            </section>
        );
    }


    /* =====================================================
       HOME PAGE
       ===================================================== */

    function HomePage() {
        return (
            <>
                <section
                    className="hero homeHero photoHero"
                    style={heroBackground(
                        pageHeroAsset('Home', heroAssets.home),
                        HERO_TEXT_OVERLAY
                    )}
                >
                    <div className={`${heroTextClass('Home')} homeHeroCopy`}>
                        <small className="heroDate">
                            {fullDate()}
                        </small>

                        <h1 className={heroCopyPartClass('Home', 'title')}>
                            {greeting()}
                        </h1>

                        <p className={heroCopyPartClass('Home', 'subtitle')}>{heroCopy('Home').subtitle}</p>
                    </div>

                </section>

                <div className="mhfHomeToolbar">
                    <div>
                        <span className="eyebrow">
                            FINANCE OVERVIEW
                        </span>
                        <strong className="mhfHomeCurrentPeriod">{monthLabel(year, month)}</strong>
                    </div>
                </div>

                <section className={`mhfTodayExpense${todayExpensesOpen ? ' open' : ''}`} ref={todaySpendingRef}>
                    <button type="button" className="mhfTodayExpenseTrigger" aria-expanded={todayExpensesOpen} onClick={() => setTodayExpensesOpen(current => !current)}>
                        <span className="mhfTodayExpenseGauge" aria-hidden="true"><i /></span>
                        <span><small>TODAY’S EXPENSE · {shortDate(todayString)}</small><strong>{money(todayExpenseTotal)}</strong></span>
                        <span className="mhfTodayExpenseChevron" aria-hidden="true">⌄</span>
                    </button>
                    {todayExpensesOpen && <div className="mhfTodayExpenseRecords">
                        <div className="mhfTransactionList">
                            {visibleTodayExpenses.map(item => <CompactTransaction key={item.id} transaction={item} showStatus={false} homeMode onDismiss={() => void dismissTodayActivity(item)} />)}
                            {visibleTodayExpenses.length === 0 && <div className="emptyState">No expenses to show today.</div>}
                        </div>
                    </div>}
                </section>

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
                                            homeMode
                                        />
                                    )
                                )}

                            {attentionBills
                                    .length ===
                                0 && (
                                    <div className="emptyState">
                                        No actionable payments right now.
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
                <section
                    className="mhfExpensePhotoHero"
                    style={heroBackground(
                        pageHeroAsset('Expense', heroAssets.expense),
                        HERO_TEXT_OVERLAY
                    )}
                >
                    <div className={heroTextClass('Expense')}><h2 className={heroCopyPartClass('Expense', 'title')}>{heroCopy('Expense').title}</h2><p className={heroCopyPartClass('Expense', 'subtitle')}>{heroCopy('Expense').subtitle}</p></div>
                </section>

                <CurrentDateContext />

                <section className="mhfExpenseSummary">
                    <button type="button" className="mhfExpenseSummaryCard budget" onClick={openBudget}>
                        <span className="mhfSummaryIcon"><Icon name="wallet" size={16} /></span><div><small>MONTHLY BUDGET</small><strong>{money(budget)}</strong><span>{budget > 0 ? `${budgetPercent.toFixed(0)}% used` : 'Set budget'}</span><i><b style={{ width: `${budgetPercent}%` }} /></i></div>
                    </button>
                    <div className="mhfExpenseSummaryCard total">
                        <span className="mhfSummaryIcon"><Icon name="chart" size={16} /></span><div><small>TOTAL EXPENSES</small><strong>{money(expenses)}</strong><span>{expenseChange === null ? 'No prior-month comparison' : `${expenseChange <= 0 ? '↓' : '↑'} ${Math.abs(expenseChange).toFixed(0)}% vs last month`}</span></div>
                    </div>
                </section>

                <section className="card mhfExpenseWeeklyCard">
                    <div className="mhfSectionTitle"><div><span className="eyebrow">WEEKLY EXPENSES</span><h2>Week 1 · {monthName(month).slice(0, 3)} 1–{Math.min(7, new Date(year, month, 0).getDate())}</h2></div><strong>{money(weeklyExpenseTotal)}</strong></div>
                    <div className="mhfWeeklyBars">{weeklyExpenseData.map(item => <div key={item.day}><span className="mhfWeeklyStack" style={{ height: `${(item.amount / weeklyExpenseMax) * 100}%` }} title={`${item.label}: ${money(item.amount)}`}>{expenseGroups.map(group => item.amount > 0 && item.groups[group] > 0 ? <i key={group} className={`mhfWeeklySegment ${group.toLowerCase().replaceAll(' ', '-').replace('&', 'and')}`} style={{ flexBasis: `${(item.groups[group] / item.amount) * 100}%` }} /> : null)}</span><small>{item.label}</small></div>)}</div>
                    <div className="mhfWeeklyLegend" aria-label="Weekly expense category legend">{expenseGroups.map(group => <span key={group} className={group.toLowerCase().replaceAll(' ', '-').replace('&', 'and')}><i />{group}</span>)}</div>
                </section>

                <section className="card mhfGroupsCard">
                    <div className="mhfSectionTitle"><div><span className="eyebrow">EXPENSE GROUPS</span><h2>Where your money went</h2></div></div>
                    <div className="mhfGroupGrid">
                        {expenseGroups.map(group => {
                            const icon = group === 'Home' ? 'home' : group === 'Personal' ? 'user' : group === 'Credit & Loan' ? 'card' : 'wallet';
                            const percent = expenses > 0 ? (groupTotals[group] / expenses) * 100 : 0;
                            return <button type="button" key={group} className={expenseFilter === group ? 'active' : ''} onClick={() => setExpenseFilter(group)}><span><Icon name={icon} size={21} /></span><strong>{group}</strong><small>{money(groupTotals[group])}</small><em>{percent.toFixed(0)}%</em></button>;
                        })}
                    </div>
                </section>

                <section className="mhfExpenseActionRow" aria-label="Expense list actions">
                    <button type="button" className={expenseFilter === 'All' ? 'active' : ''} onClick={showAllExpenses}>All</button>
                    <button type="button" className="mhfReceiptButton" onClick={openReceiptPicker}><Icon name="camera" size={17} /><span>Receipt Photo</span></button>
                </section>

                <input ref={receiptInputRef} className="mhfReceiptInput" type="file" accept="image/*" capture="environment" onChange={selectReceiptPhoto} aria-label="Choose a receipt photo" />

                {receiptPreviewOpen && receiptPhoto && <div className="mhfOverlay" onMouseDown={event => { if (event.target === event.currentTarget) { clearReceiptPhoto(); setReceiptPreviewOpen(false); } }}><section className="mhfDetailsSheet mhfReceiptPreviewSheet" role="dialog" aria-modal="true" aria-label="Review receipt photo"><div className="mhfDetailsTop"><div><span className="eyebrow">RECEIPT PHOTO</span><h2>Review photo</h2></div><button type="button" aria-label="Cancel receipt photo" onClick={() => { clearReceiptPhoto(); setReceiptPreviewOpen(false); }}>×</button></div><img src={receiptPhoto.previewUrl} alt="Selected receipt preview" /><p>{receiptPhoto.name}</p><small>Nothing has been added yet. Enter and confirm the expense details manually.</small><div className="mhfReceiptPreviewActions"><button type="button" className="secondaryAction" onClick={openReceiptPicker}>Replace</button><button type="button" className="secondaryAction" onClick={() => { clearReceiptPhoto(); setReceiptPreviewOpen(false); }}>Remove</button><button type="button" className="primaryAction" onClick={continueFromReceiptPhoto}>Continue to Add Expense</button></div></section></div>}

                <section className="card mhfListCard" ref={expenseListRef}>
                    <div className="mhfSectionTitle mhfTransactionsHeading">
                        <div>
                            <span className="eyebrow">EXPENSE LIST</span>
                            <h2>{expenseFilter === 'All' ? 'All Expenses' : expenseFilter}</h2>
                            <p>{filteredExpenses.length} recorded expense{filteredExpenses.length === 1 ? '' : 's'}</p>
                        </div>
                        {filteredExpenses.length > 0 && <label className="mhfSelectAllExpenses"><input type="checkbox" checked={filteredExpenses.every(item => copySelection.includes(item.id))} onChange={() => setCopySelection(current => {
                            const ids = filteredExpenses.map(item => item.id);
                            return ids.every(id => current.includes(id))
                                ? current.filter(id => !ids.includes(id))
                                : Array.from(new Set([...current, ...ids]));
                        })} /> Select all</label>}
                        {copySelection.length > 0 && <button ref={copyWorkflowRef} type="button" className="secondaryAction" onClick={() => { setCopyMode('copy'); setCopyDialogOpen(true); }}>Copy / Move ({copySelection.length})</button>}
                    </div>
                    <div className="mhfTransactionList">
                        {filteredExpenses.map(item => <div className="mhfExpenseRow" key={item.id}><label><input type="checkbox" checked={copySelection.includes(item.id)} onChange={() => selectExpenseForCopy(item.id)} aria-label={`Select ${item.name} for copy or move`} /></label><CompactTransaction transaction={item} compactExpenseMode /></div>)}
                        {filteredExpenses.length === 0 && <div className="emptyState">No expenses found for this selection.</div>}
                    </div>
                </section>

                {copyDialogOpen && <div className="mhfOverlay" onMouseDown={event => { if (event.target === event.currentTarget) setCopyDialogOpen(false); }}><section className="mhfDetailsSheet mhfCopySheet" role="dialog" aria-modal="true" aria-label="Copy or move expenses"><div className="mhfDetailsTop"><div><span className="eyebrow">MONTHLY WORKFLOW</span><h2>{copyMode === 'copy' ? 'Copy expenses' : 'Move expenses'}</h2></div><button type="button" onClick={() => setCopyDialogOpen(false)}>×</button></div><p>{copySelection.length} selected. {copyMode === 'copy' ? 'Select months directly for each year. Originals remain unchanged.' : 'Choose one destination period. Moving relocates the selected records.'}</p><div className="mhfCopyMode"><button type="button" className={copyMode === 'copy' ? 'active' : ''} onClick={() => setCopyMode('copy')}>Copy</button><button type="button" className={copyMode === 'move' ? 'active' : ''} onClick={() => setCopyMode('move')}>Move</button></div>{copyMode === 'copy' ? <><label>Year<select value={copyYear} onChange={event => setCopyYear(Number(event.target.value))}>{Array.from({ length: 40 }, (_, index) => 2026 + index).map(value => <option value={value} key={value}>{value}</option>)}</select></label><div className="mhfCopyMonthGrid" role="group" aria-label={`Copy destinations for ${copyYear}`}>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => { const originalPeriod = copyYear === year && value === month; const selectedDestination = copyDestinations.some(item => item.year === copyYear && item.month === value); return <button key={value} type="button" className={selectedDestination ? 'active' : ''} onClick={() => toggleCopyDestinationMonth(value)} aria-pressed={selectedDestination} disabled={originalPeriod}>{monthName(value).slice(0, 3)}</button>; })}</div><div className="mhfCopyDestinations" aria-label="Selected copy destinations">{copyDestinations.length === 0 ? <small>No destination months selected yet.</small> : <><small>Selected: {copyDestinations.length} month{copyDestinations.length === 1 ? '' : 's'}</small>{copyDestinations.map(destination => <button key={`${destination.year}-${destination.month}`} type="button" onClick={() => setCopyDestinations(current => current.filter(item => item.year !== destination.year || item.month !== destination.month))}>{monthLabel(destination.year, destination.month)} ×</button>)}</>}</div></> : <div className="mhfCopyDestination"><label>Destination year<select value={copyYear} onChange={event => setCopyYear(Number(event.target.value))}>{Array.from({ length: 40 }, (_, index) => 2026 + index).map(value => <option value={value} key={value}>{value}</option>)}</select></label><label>Destination month<select value={copyMonth} onChange={event => setCopyMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option value={value} key={value}>{monthName(value)}</option>)}</select></label></div>}<button type="button" className="primaryAction" disabled={copyMode === 'copy' && copyDestinations.length === 0} onClick={() => void applyCopyOrMove()}>{copyMode === 'copy' ? `Copy to ${copyDestinations.length} month${copyDestinations.length === 1 ? '' : 's'}` : 'Move selected expenses'}</button></section></div>}
            </>
        );
    }


    /* =====================================================
       SAVINGS GOAL
       ===================================================== */

    function savingsForTrack(track: SavingsTrack) {
        const goal = goals.find(item => item.name === track);
        const contributions = savingsContributions.filter(item => item.track === track);
        const base = Number(goal?.base_amount ?? goal?.current_amount ?? 0);

        return {
            goal,
            contributions,
            current: base + contributions.reduce((total, item) => total + Number(item.amount), 0),
            yearly: contributions.filter(item => item.month_start.startsWith(`${year}-`)).reduce((total, item) => total + Number(item.amount), 0)
        };
    }

    function SavingsSummaryCard({ track }: { track: SavingsTrack }) {
        const summary = savingsForTrack(track);
        const progress = summary.goal && summary.goal.goal_amount > 0
            ? Math.min(100, (summary.current / summary.goal.goal_amount) * 100)
            : 0;
        const home = track === 'Home Savings';

        return (
            <button type="button" className="mhfSavingsSummaryCard" onClick={() => setSavingsTrackOpen(track)}>
                <span><Icon name={home ? 'home' : 'wallet'} size={18} /></span>
                <div><small>{home ? 'HOME FUND' : 'PERSONAL FUND'}</small><strong>{track}</strong><b>{money(summary.current)} / {money(summary.goal?.goal_amount || 0)}</b><i><em style={{ width: `${progress}%` }} /></i><p>{progress.toFixed(0)}% complete</p></div>
                <Icon name="arrow" size={17} />
            </button>
        );
    }

    function SavingsManagementModal({ track }: { track: SavingsTrack }) {
        const summary = savingsForTrack(track);
        const [goalDraft, setGoalDraft] = useState(String(summary.goal?.goal_amount || ''));
        const [contributionYear, setContributionYear] = useState(year);
        const [contributionMonth, setContributionMonth] = useState(month);
        const [contributionDraft, setContributionDraft] = useState('');
        const [notesDraft, setNotesDraft] = useState('');
        const monthStart = `${contributionYear}-${String(contributionMonth).padStart(2, '0')}-01`;
        const existingContribution = summary.contributions.find(item => item.month_start === monthStart);
        const progress = summary.goal && summary.goal.goal_amount > 0 ? Math.min(100, (summary.current / summary.goal.goal_amount) * 100) : 0;

        useEffect(() => {
            setGoalDraft(String(summary.goal?.goal_amount || ''));
        }, [track, summary.goal?.goal_amount]);

        useEffect(() => {
            const manualAmount = existingContribution
                ? existingContribution.manual_amount ?? Math.max(0, existingContribution.amount - (existingContribution.recurring_amount || 0))
                : '';
            setContributionDraft(String(manualAmount));
            setNotesDraft(existingContribution?.notes || '');
        }, [track, monthStart, existingContribution?.id]);

        async function saveGoalAmount() {
            const goalAmount = Number(goalDraft);
            if (!Number.isFinite(goalAmount) || goalAmount < 0) {
                window.alert('Enter a valid savings goal.');
                return;
            }
            const result = await saveGoal({
                name: track,
                current_amount: summary.goal?.current_amount || 0,
                goal_amount: goalAmount
            });
            if (result.error) window.alert(result.error.message);
        }

        async function saveContribution() {
            const amount = Number(contributionDraft);
            if (!Number.isFinite(amount) || amount < 0) {
                window.alert('Enter a valid monthly contribution.');
                return;
            }
            const result = await upsertSavingsContribution({ track, month_start: monthStart, amount, notes: notesDraft });
            if (result.error) window.alert(result.error.message);
        }

        return (
            <div className="mhfOverlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSavingsTrackOpen(null); }}>
                <section className="mhfDetailsSheet mhfSavingsSheet" role="dialog" aria-modal="true" aria-label={`${track} management`}>
                    <div className="mhfDetailsTop"><div><span className="eyebrow">SAVINGS MANAGEMENT</span><h2>{track}</h2></div><button type="button" aria-label="Close" onClick={() => setSavingsTrackOpen(null)}>×</button></div>
                    <div className="mhfSavingsBalance"><small>Current Saved</small><strong>{money(summary.current)}</strong><span>{progress.toFixed(1)}% of {money(summary.goal?.goal_amount || 0)} goal</span><i><b style={{ width: `${progress}%` }} /></i></div>
                    <div className="mhfSavingsForm"><label>Savings Goal<input type="number" min="0" inputMode="decimal" value={goalDraft} onChange={event => setGoalDraft(event.target.value)} /></label><button type="button" className="secondaryAction" onClick={() => void saveGoalAmount()}>Update Goal</button></div>
                    <section className="mhfSavingsContribution"><span className="eyebrow">MONTHLY CONTRIBUTION</span><div><label>Year<select value={contributionYear} onChange={event => setContributionYear(Number(event.target.value))}>{Array.from({ length: 35 }, (_, index) => 2016 + index).map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>Month<select value={contributionMonth} onChange={event => setContributionMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{monthName(value)}</option>)}</select></label></div><label>Manual amount<input type="number" min="0" inputMode="decimal" value={contributionDraft} onChange={event => setContributionDraft(event.target.value)} /></label>{existingContribution?.recurring_amount ? <small>Recurring contribution: {money(existingContribution.recurring_amount)} · Total: {money(existingContribution.amount)}</small> : null}<label>Notes <small>(optional)</small><input value={notesDraft} onChange={event => setNotesDraft(event.target.value)} /></label><button type="button" className="primaryAction" onClick={() => void saveContribution()}>{existingContribution ? 'Update Monthly Contribution' : 'Add Monthly Contribution'}</button></section>
                    <section className="mhfSavingsHistory"><div><span className="eyebrow">{year} HISTORY</span><strong>Saved During {year}: {money(summary.yearly)}</strong></div>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => { const item = summary.contributions.find(contribution => contribution.month_start === `${year}-${String(value).padStart(2, '0')}-01`); return <div key={value}><span>{monthName(value)}</span><b>{item ? money(item.amount) : '—'}</b></div>; })}</section>
                </section>
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

        const daysInSelectedMonth =
            new Date(
                year,
                month,
                0
            ).getDate();

        const shortSelectedMonth =
            new Date(
                year,
                month - 1,
                1
            ).toLocaleString(
                'en-US',
                { month: 'short' }
            );

        const weeks =
            [1, 2, 3, 4, 5]
                .map(
                    week => {
                        const startDay =
                            (week - 1) *
                            7 +
                            1;

                        const endDay =
                            Math.min(
                                week * 7,
                                daysInSelectedMonth
                            );

                        const records =
                            incomeTransactions.filter(
                                item => {
                                    const day =
                                        parseLocalDate(
                                            item.occurred_on
                                        ).getDate();

                                    return day >= startDay &&
                                        day <= endDay;
                                }
                            );

                        const sources =
                            new Map<string, number>();

                        records.forEach(
                            item => {
                                const source =
                                    item.name ||
                                    item.category ||
                                    'Income';

                                sources.set(
                                    source,
                                    (sources.get(source) || 0) +
                                    Number(item.amount)
                                );
                            }
                        );

                        return {
                            week,
                            startDay,
                            endDay,
                            records,
                            sources: Array.from(
                                sources.entries()
                            ).sort(
                                (a, b) => b[1] - a[1]
                            ),
                            total: records.reduce(
                                (sum, item) =>
                                    sum + Number(item.amount),
                                0
                            )
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

        const selectedWeek =
            weeklyIncomeDetail === null
                ? null
                : weeks.find(
                    item => item.week ===
                        weeklyIncomeDetail
                ) || null;

        const weeklyRange = (
            item: typeof weeks[number],
            includeYear = false
        ) => `${shortSelectedMonth} ${item.startDay}–${item.endDay}${
            includeYear ? `, ${year}` : ''
        }`;

        const allSources = Array.from(sourceTotals.entries()).sort((a, b) => b[1] - a[1]);
        const personalSavings = savingsForTrack('Personal Savings');
        const homeSavings = savingsForTrack('Home Savings');
        const selectedSavingsMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        const monthlyPersonalSavings = savingsContributions.find(item => item.track === 'Personal Savings' && item.month_start === selectedSavingsMonth)?.amount || 0;
        const monthlyHomeSavings = savingsContributions.find(item => item.track === 'Home Savings' && item.month_start === selectedSavingsMonth)?.amount || 0;

        return (
            <>
                <section
                    className="hero incomeHero photoHero"
                    style={heroBackground(
                        pageHeroAsset('Income', heroAssets.income),
                        HERO_TEXT_OVERLAY
                    )}
                >
                    <div className={heroTextClass('Income')}>
                        <span className="eyebrow">
                            INCOME & SAVINGS
                        </span>

                        <h1 className={heroCopyPartClass('Income', 'title')}>{heroCopy('Income').title}</h1>

                        <p className={heroCopyPartClass('Income', 'subtitle')}>{heroCopy('Income').subtitle}</p>
                    </div>

                </section>

                <CurrentDateContext />

                <section className="card mhfIncomeOverview">
                    <span className="eyebrow">INCOME OVERVIEW</span>

                    <div className="mhfIncomeOverviewTop">
                        <div
                            className="mhfIncomeOverviewRing"
                            style={{
                                background: `conic-gradient(#45b996 0 ${Math.min(Math.max(savingsRate, 0), 100)}%, var(--surface-soft) ${Math.min(Math.max(savingsRate, 0), 100)}% 100%)`
                            }}
                            aria-label={`${savingsRate.toFixed(1)} percent savings rate`}
                        >
                            <div>
                                <strong>{savingsRate.toFixed(1)}%</strong>
                                <small>Saved</small>
                            </div>
                        </div>

                        <div className="mhfIncomeOverviewStats">
                            <button type="button" onClick={() => setIncomeDrillDown('income')}>
                                <small>Income</small>
                                <strong>{money(income)}</strong>
                                <span>View sources</span>
                            </button>

                            <button type="button" onClick={() => setIncomeDrillDown('savings')}>
                                <small>Savings</small>
                                <strong>{money(monthlySavings)}</strong>
                                <span>View breakdown</span>
                            </button>

                            <div>
                                <small>Savings Rate</small>
                                <strong>{savingsRate.toFixed(1)}%</strong>
                                <span>{income > 0 ? 'Monthly savings ÷ income' : 'No income this month'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mhfIncomeOverviewWeeks">
                        <span className="eyebrow">WEEKLY INCOME</span>

                        <div>
                            {weeks.map(item => <button
                                type="button"
                                key={item.week}
                                aria-label={`View Week ${item.week}, ${weeklyRange(item, true)} income details`}
                                onClick={() => setWeeklyIncomeDetail(item.week)}
                            >
                                <i>
                                    <b
                                        className={`week-${item.week}`}
                                        style={{
                                            height: `${Math.max(
                                                item.total > 0 ? 12 : 2,
                                                (item.total / maxWeek) * 100
                                            )}%`
                                        }}
                                    />
                                </i>
                                <strong>W{item.week}</strong>
                                <small>{weeklyRange(item)}</small>
                                <em>{item.total > 0 ? money(item.total) : '$0'}</em>
                            </button>)}
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

                        <div className="mhfIncomeRecordActions">
                            <button type="button" className="mhfIncomeCollapse" aria-expanded={incomeRecordsOpen} onClick={() => setIncomeRecordsOpen(current => !current)}>
                                {incomeRecordsOpen ? '⌃' : '⌄'}
                            </button>
                            <button
                                type="button"
                                className="primaryAction mhfAddIncomeButton"
                                onClick={addIncome}
                            >
                                + Add Income
                            </button>
                        </div>
                    </div>

                    {incomeRecordsOpen && <div className="mhfTransactionList">
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
                                        compactIncomeMode
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
                    </div>}
                </section>

                {incomeDrillDown && <div className="mhfOverlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setIncomeDrillDown(null); }}><section className="mhfDetailsSheet mhfIncomeDrilldown" role="dialog" aria-modal="true" aria-label={incomeDrillDown === 'income' ? 'Income sources' : 'Savings breakdown'}><div className="mhfDetailsTop"><div><span className="eyebrow">{incomeDrillDown === 'income' ? 'INCOME SOURCES' : 'SAVINGS BREAKDOWN'}</span><h2>{monthLabel(year, month)}</h2></div><button type="button" aria-label="Close" onClick={() => setIncomeDrillDown(null)}>×</button></div>{incomeDrillDown === 'income' ? <><div className="mhfIncomeDrillRows">{allSources.map(([source, amount], index) => <div key={source}><span style={{ background: categoryColors[index % categoryColors.length] }} /><strong>{source}</strong><b>{money(amount)}</b></div>)}{allSources.length === 0 && <div className="emptyState">No income sources in this period.</div>}</div><div className="mhfIncomeDrillTotal"><span>Total</span><strong>{money(income)}</strong></div></> : <><div className="mhfIncomeDrillRows"><div><span className="personal" /><strong>Personal Savings</strong><b>{money(monthlyPersonalSavings)}</b></div><div><span className="home" /><strong>Home Savings</strong><b>{money(monthlyHomeSavings)}</b></div></div><div className="mhfIncomeDrillTotal"><span>Total</span><strong>{money(monthlySavings)}</strong></div></>}</section></div>}

                {selectedWeek && <div className="mhfOverlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setWeeklyIncomeDetail(null); }}><section className="mhfDetailsSheet mhfIncomeDrilldown" role="dialog" aria-modal="true" aria-label={`Week ${selectedWeek.week} income details`}><div className="mhfDetailsTop"><div><span className="eyebrow">WEEK {selectedWeek.week} INCOME</span><h2>{weeklyRange(selectedWeek, true)}</h2></div><button type="button" aria-label="Close" onClick={() => setWeeklyIncomeDetail(null)}>×</button></div>{selectedWeek.sources.length > 0 ? <><div className="mhfIncomeDrillRows">{selectedWeek.sources.map(([source, amount], index) => <div key={source}><span style={{ background: categoryColors[index % categoryColors.length] }} /><strong>{source}</strong><b>{money(amount)}</b></div>)}</div><div className="mhfIncomeDrillTotal"><span>Total</span><strong>{money(selectedWeek.total)}</strong></div></> : <div className="emptyState">No income recorded for {weeklyRange(selectedWeek)}.</div>}</section></div>}

                {savingsTrackOpen && <SavingsManagementModal track={savingsTrackOpen} />}
            </>
        );
    }


    /* =====================================================
       SAVINGS PAGE
       ===================================================== */

    function SavingsPage() {
        const personalSavings = savingsForTrack('Personal Savings');
        const homeSavings = savingsForTrack('Home Savings');
        const totalYearly = personalSavings.yearly + homeSavings.yearly;
        const totalCurrent = personalSavings.current + homeSavings.current;

        return <>
            <section
                className="hero incomeHero photoHero mhfSavingsHero"
                style={heroBackground(
                    pageHeroAsset('Savings', heroAssets.income),
                    HERO_TEXT_OVERLAY
                )}
            >
                <div className={heroTextClass('Savings')}>
                    <span className="eyebrow">SAVINGS</span>
                    <h1 className={heroCopyPartClass('Savings', 'title')}>{heroCopy('Savings').title}</h1>
                    <p className={heroCopyPartClass('Savings', 'subtitle')}>{heroCopy('Savings').subtitle}</p>
                </div>
            </section>

            <CurrentDateContext />

            <section className="card mhfSavingsPageOverview">
                <span className="eyebrow">SAVINGS OVERVIEW</span>
                <div>
                    <span><small>Current Saved</small><strong>{money(totalCurrent)}</strong></span>
                    <span><small>Saved in {year}</small><strong>{money(totalYearly)}</strong></span>
                    <span><small>This Month</small><strong>{money(
                        savingsContributions.filter(item => item.month_start === `${year}-${String(month).padStart(2, '0')}-01`).reduce((sum, item) => sum + item.amount, 0)
                    )}</strong></span>
                </div>
            </section>

            <section className="mhfSavingsSection mhfSavingsPageSection">
                <div className="mhfSectionTitle">
                    <div><span className="eyebrow">SAVINGS TRACKS</span><h2>Personal and home goals</h2></div>
                    <strong>{year} total: {money(totalYearly)}</strong>
                </div>
                <div className="mhfYearlySavings" aria-label={`${year} savings totals`}><span><small>PERSONAL</small><strong>{money(personalSavings.yearly)}</strong></span><span><small>HOME</small><strong>{money(homeSavings.yearly)}</strong></span><span><small>TOTAL {year}</small><strong>{money(totalYearly)}</strong></span></div>
                <div className="mhfSavingsSummaryGrid">
                    <SavingsSummaryCard track="Personal Savings" />
                    <SavingsSummaryCard track="Home Savings" />
                </div>
            </section>

            {savingsTrackOpen && <SavingsManagementModal track={savingsTrackOpen} />}
        </>;
    }


    /* =====================================================
       CALENDAR PAGE
       ===================================================== */

    function CalendarPeriodPicker({ onSelectPeriod }: { onSelectPeriod: (nextYear: number, nextMonth: number) => void }) {
        const years = Array.from({ length: 2065 - 2026 + 1 }, (_, index) => 2026 + index);
        const applyCalendarPeriod = (nextYear: number, nextMonth: number) => {
            onSelectPeriod(nextYear, nextMonth);
        };

        return <>
            <button
                type="button"
                className={`mhfPeriodTrigger mhfCalendarPeriodTrigger${calendarPeriodPickerOpen ? ' open' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={calendarPeriodPickerOpen}
                aria-controls="finance-calendar-period-picker"
                onClick={() => setCalendarPeriodPickerOpen(open => !open)}
            >
                <span className="mhfPeriodLabel">{monthLabel(calendarYear, calendarMonth)}</span>
                <span className="mhfPeriodChevron" aria-hidden="true">
                    <svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
                </span>
            </button>

            {calendarPeriodPickerOpen && <div className="mhfOverlay" onMouseDown={event => {
                if (event.target === event.currentTarget) setCalendarPeriodPickerOpen(false);
            }}>
                <section id="finance-calendar-period-picker" className="mhfPeriodSheet" role="dialog" aria-modal="true" aria-label="Select Finance Calendar period">
                    <div className="mhfDetailsTop"><div><span className="eyebrow">FINANCE CALENDAR</span><h2>Select period</h2></div><button type="button" aria-label="Close" onClick={() => setCalendarPeriodPickerOpen(false)}>×</button></div>
                    <div className="mhfCalendarPeriodFields">
                        <label>Month
                            <select aria-label="Calendar month" value={calendarMonth} onChange={event => applyCalendarPeriod(calendarYear, Number(event.target.value))}>
                                {Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{monthName(value)}</option>)}
                            </select>
                        </label>
                        <label>Year
                            <select aria-label="Calendar year" value={calendarYear} onChange={event => applyCalendarPeriod(Number(event.target.value), calendarMonth)}>
                                {years.map(value => <option key={value} value={value}>{value}</option>)}
                            </select>
                        </label>
                    </div>
                    <button type="button" className="mhfTextButton" onClick={() => setCalendarPeriodPickerOpen(false)}>Done</button>
                </section>
            </div>}
        </>;
    }

    function CalendarPage() {
        const [calendarStatus, setCalendarStatus] = useState<'due' | 'upcoming' | 'overdue' | 'all' | null>(null);
        const [calendarActivityFilter, setCalendarActivityFilter] = useState<'all' | 'expenses' | 'income' | 'savings'>('all');
        const mode =
            calendarReturnPage;
        const hasHomeStatusDashboard = mode === 'Home';

        const calendarReturnLabel =
            mode === 'Income'
                ? 'Income & Savings'
                : mode;

        const showIncome =
            mode === 'Home' ||
            mode === 'Income';

        const showExpenses =
            mode === 'Home' ||
            mode === 'Expense';

        const firstDay =
            new Date(
                calendarYear,
                calendarMonth - 1,
                1
            ).getDay();

        const daysInMonth =
            new Date(
                calendarYear,
                calendarMonth,
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
                ? calendarTransactions
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

        const selectedSavingsContributions =
            mode === 'Savings' && calendarDate
                ? savingsContributions.filter(item => item.month_start === `${calendarDate.slice(0, 7)}-01`)
                : [];

        const scheduledItemsForDate = calendarDate
            ? scheduledCalendarOccurrences.filter(item => item.occurred_on === calendarDate)
            : [];

        const calendarExpenseTransactions = calendarTransactions.filter(item => item.kind === 'expense');
        const calendarIncomeTransactions = calendarTransactions.filter(item => item.kind === 'income');
        const statusItems = calendarExpenseTransactions.filter(item => {
            const status = getDisplayStatus(item);
            return calendarStatus === 'due' ? status === 'due-today'
                : calendarStatus === 'overdue' ? status === 'overdue'
                    : calendarStatus === 'upcoming' ? status === 'upcoming' || status === 'unpaid'
                        : false;
        });
        const statusCounts = {
            due: calendarExpenseTransactions.filter(item => getDisplayStatus(item) === 'due-today').length,
            upcoming: calendarExpenseTransactions.filter(item => { const status = getDisplayStatus(item); return status === 'upcoming' || status === 'unpaid'; }).length,
            overdue: calendarExpenseTransactions.filter(item => getDisplayStatus(item) === 'overdue').length
        };
        const scheduledUpcomingItems = scheduledCalendarOccurrences.filter(item => item.kind === 'expense');
        const calendarActivityTransactions = calendarTransactions.filter(item =>
            calendarActivityFilter === 'all' ||
            (calendarActivityFilter === 'expenses' && item.kind === 'expense') ||
            (calendarActivityFilter === 'income' && item.kind === 'income')
        );
        const calendarActivitySavings = calendarActivityFilter === 'all' || calendarActivityFilter === 'savings'
            ? savingsContributions.filter(item => item.month_start === `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-01`)
            : [];

        function dateForDay(
            day: number
        ) {
            return (
                `${calendarYear}-` +
                `${String(
                    calendarMonth
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
                    ? calendarExpenseTransactions
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
                    ? calendarIncomeTransactions
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

            const savingsItems =
                mode === 'Savings'
                    ? savingsContributions.filter(item => item.month_start === `${date.slice(0, 7)}-01`)
                    : [];

            const scheduledItems = scheduledCalendarOccurrences.filter(item => item.occurred_on === date);

            return {
                statuses,
                hasIncome:
                    incomeItems.length > 0,
                hasSavings:
                    savingsItems.length > 0,
                hasScheduled: scheduledItems.length > 0
            };
        }

        return (
            <>
                <section
                    className="mhfCalendarHero mhfCalendarPhotoHero"
                    style={heroBackground(
                        calendarHeroAsset(mode, heroAssets.calendar[mode]),
                        HERO_TEXT_OVERLAY
                    )}
                >
                    <button
                        type="button"
                        className="mhfCalendarBack"
                        onClick={returnFromCalendar}
                    >
                        <Icon name="arrow" size={16} />
                        <span>Back to {calendarReturnLabel}</span>
                    </button>

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

                        {mode !== 'Home' && <h1>Finance Calendar</h1>}

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

                <section className={`card mhfCalendarCard${hasHomeStatusDashboard ? ' mhfHomeCalendarCard' : ''}`}>
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

                        </div>

                        <CalendarPeriodPicker onSelectPeriod={(nextYear, nextMonth) => {
                            setCalendarYear(nextYear);
                            setCalendarMonth(nextMonth);
                            setCalendarDate(null);
                            setCalendarStatus(null);
                        }} />
                    </div>

                    {hasHomeStatusDashboard && <div className="mhfCalendarLegend mhfCalendarStatusChips">
                                <button type="button" className={calendarStatus === 'due' ? 'active due' : 'due'} onClick={() => setCalendarStatus(current => current === 'due' ? null : 'due')}>
                                    <i className="due" />
                                    Due {statusCounts.due}
                                </button>
                                <button type="button" className={calendarStatus === 'upcoming' ? 'active upcoming' : 'upcoming'} onClick={() => setCalendarStatus(current => current === 'upcoming' ? null : 'upcoming')}>
                                    <i className="upcoming" />
                                    Upcoming {statusCounts.upcoming}
                                </button>
                                <button type="button" className={calendarStatus === 'overdue' ? 'active overdue' : 'overdue'} onClick={() => setCalendarStatus(current => current === 'overdue' ? null : 'overdue')}>
                                    <i className="overdue" />
                                    Overdue {statusCounts.overdue}
                                </button>
                                <button type="button" className={calendarStatus === 'all' ? 'active activity' : 'activity'} onClick={() => setCalendarStatus(current => current === 'all' ? null : 'all')}>
                                    <i className="activity" />
                                    All Activity
                                </button>
                    </div>}

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
                                            {hasHomeStatusDashboard && markers
                                                .statuses
                                                .has(
                                                    'due-today'
                                                ) && (
                                                <i className="due" />
                                            )}

                                            {hasHomeStatusDashboard && markers
                                                .statuses
                                                .has(
                                                    'overdue'
                                                ) && (
                                                <i className="overdue" />
                                            )}

                                            {hasHomeStatusDashboard && (
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
                                            {!hasHomeStatusDashboard && mode === 'Expense' && markers.statuses.has('paid') && <i className="paid" />}
                                            {!hasHomeStatusDashboard && mode === 'Expense' && markers.statuses.has('due-today') && <i className="due" />}
                                            {!hasHomeStatusDashboard && mode === 'Expense' && markers.statuses.has('overdue') && <i className="overdue" />}
                                            {!hasHomeStatusDashboard && mode === 'Expense' && (markers.statuses.has('upcoming') || markers.statuses.has('unpaid')) && <i className="upcoming" />}
                                            {!hasHomeStatusDashboard && mode === 'Income' && markers.hasIncome && <i className="income" />}
                                            {!hasHomeStatusDashboard && mode === 'Savings' && markers.hasSavings && <i className="savings" />}
                                            {markers.hasScheduled && <i className="upcoming" title="Scheduled" />}
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
                            {selectedSavingsContributions.map(item => <article className="mhfCalendarSavingsActivity" key={item.id}><div><strong>{item.track}</strong><small>{item.notes || `Savings activity for ${monthLabel(calendarYear, calendarMonth)}`}</small></div><b>{money(item.amount)}</b></article>)}
                            {scheduledItemsForDate.map(item => <article className="mhfCalendarScheduledActivity" key={item.id}><div><span className="eyebrow">SCHEDULED</span><strong>{item.name}</strong><small>{item.kind === 'savings' ? item.savings_track : item.category || item.kind}</small></div><b>{money(item.amount)}</b></article>)}

                            {selectedItems.length === 0 && selectedSavingsContributions.length === 0 && scheduledItemsForDate.length === 0 && (
                                    <div className="emptyState">
                                        No financial
                                        activity on this
                                        date.
                                    </div>
                                )}
                        </div>
                    </section>
                )}

                {hasHomeStatusDashboard && calendarStatus && <section className="card mhfCalendarDetails"><div className="mhfSectionTitle"><div><span className="eyebrow">{calendarStatus === 'all' ? 'ALL ACTIVITY' : calendarStatus.toUpperCase()} · {monthLabel(calendarYear, calendarMonth)}</span><h2>{calendarStatus === 'all' ? 'Financial activity' : calendarStatus === 'due' ? 'Due payments' : calendarStatus === 'upcoming' ? 'Upcoming payments' : 'Overdue payments'}</h2></div></div>{calendarStatus === 'all' && <div className="mhfCalendarActivityFilters" role="group" aria-label="Calendar activity type"><button type="button" className={calendarActivityFilter === 'all' ? 'active' : ''} onClick={() => setCalendarActivityFilter('all')}>All</button><button type="button" className={calendarActivityFilter === 'expenses' ? 'active' : ''} onClick={() => setCalendarActivityFilter('expenses')}>Expenses</button><button type="button" className={calendarActivityFilter === 'income' ? 'active' : ''} onClick={() => setCalendarActivityFilter('income')}>Income</button><button type="button" className={calendarActivityFilter === 'savings' ? 'active' : ''} onClick={() => setCalendarActivityFilter('savings')}>Savings</button></div>}<div className="mhfTransactionList">{calendarStatus === 'all' ? <>{calendarActivityTransactions.map(item => <CompactTransaction key={item.id} transaction={item} />)}{calendarActivitySavings.map(item => <article className="mhfCalendarSavingsActivity" key={item.id}><div><strong>{item.track}</strong><small>{item.notes || 'Savings contribution'}</small></div><b>{money(item.amount)}</b></article>)}{scheduledCalendarOccurrences.filter(item => calendarActivityFilter === 'all' || (calendarActivityFilter === 'expenses' && item.kind === 'expense') || (calendarActivityFilter === 'income' && item.kind === 'income') || (calendarActivityFilter === 'savings' && item.kind === 'savings')).map(item => <article className="mhfCalendarScheduledActivity" key={item.id}><div><span className="eyebrow">SCHEDULED · {shortDate(item.occurred_on)}</span><strong>{item.name}</strong><small>{item.kind === 'savings' ? item.savings_track : item.category || item.kind}</small></div><b>{money(item.amount)}</b></article>)}{calendarActivityTransactions.length === 0 && calendarActivitySavings.length === 0 && scheduledCalendarOccurrences.length === 0 && <div className="emptyState">No financial activity in this month.</div>}</> : <>{statusItems.map(item => <CompactTransaction key={item.id} transaction={item} />)}{calendarStatus === 'upcoming' && scheduledUpcomingItems.map(item => <article className="mhfCalendarScheduledActivity" key={item.id}><div><span className="eyebrow">SCHEDULED · {shortDate(item.occurred_on)}</span><strong>{item.name}</strong><small>{item.category || 'Expense'}</small></div><b>{money(item.amount)}</b></article>)}{statusItems.length === 0 && !(calendarStatus === 'upcoming' && scheduledUpcomingItems.length > 0) && <div className="emptyState">No {calendarStatus} payments in this month.</div>}</>}</div></section>}
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

                        <div className="mhfReportPeriods">
                            <PeriodSelector compact label="Report period" />
                        </div>
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
        const [resetOpen, setResetOpen] = useState(false);
        const [resetType, setResetType] = useState<'income' | 'expense' | 'savings' | 'goals' | 'recurring'>('income');
        const [resetScope, setResetScope] = useState<'all' | 'year' | 'month' | 'day'>('all');
        const [resetDay, setResetDay] = useState(new Date().getDate());
        const [resetReview, setResetReview] = useState(false);
        const resetSupportsPeriod = resetType === 'income' || resetType === 'expense' || resetType === 'savings';
        async function reset() {
            if (
                !window.confirm(
                    'Reset all My Home Finance financial data on this device?'
                )
            ) {
                return;
            }

            if (
                window.prompt('Type RESET to permanently remove all local finance data. Export a backup first.') !== 'RESET'
            ) {
                return;
            }

            await resetFinanceData();

            setCalendarDate(
                null
            );
        }

        async function selectiveReset() {
            await selectivelyResetFinanceData({
                kinds: resetType === 'income' || resetType === 'expense' ? [resetType] : undefined,
                savings: resetType === 'savings', goals: resetType === 'goals', recurringRules: resetType === 'recurring',
                year: resetScope === 'all' ? undefined : year,
                month: resetScope === 'month' || resetScope === 'day' ? month : undefined,
                day: resetScope === 'day' ? resetDay : undefined
            });
            await load();
            setResetReview(false); setResetOpen(false);
        }


        return (
            <>
                <MoreHeader
                    title="Data & Backup"
                    subtitle="Protect, restore and manage your personal finance records."
                    icon="backup"
                    compact
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
                                Backup Data
                            </strong>

                            <p>
                                Export complete or
                                selected-period data.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMoreView('BackupExport')}
                        >
                            Open
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

                    <div className="mhfResetActions">
                        <button type="button" className="mhfResetAction" onClick={() => setResetOpen(true)}><strong>Selective Reset</strong><small>Choose the data type and period to clear.</small><span>→</span></button>
                        <button type="button" className="mhfResetAction danger" onClick={() => void reset()}><strong>Reset Everything</strong><small>Permanently clear all supported finance data.</small><span>→</span></button>
                    </div>
                </section>
                {resetOpen && <div className="mhfOverlay" onMouseDown={event => { if (event.target === event.currentTarget) setResetOpen(false); }}><section className="mhfDetailsSheet mhfSelectiveReset" role="dialog" aria-modal="true"><div className="mhfDetailsTop"><div><span className="eyebrow">SELECTIVELY RESET DATA</span><h2>Choose data and scope</h2></div><button type="button" onClick={() => setResetOpen(false)}>×</button></div><label>Data type<select value={resetType} onChange={event => { setResetType(event.target.value as typeof resetType); setResetScope('all'); }}><option value="income">Income</option><option value="expense">Expenses</option><option value="savings">Savings</option><option value="goals">Goals</option><option value="recurring">Recurring Rules</option></select></label><label>Scope<select value={resetScope} disabled={!resetSupportsPeriod} onChange={event => setResetScope(event.target.value as typeof resetScope)}><option value="all">All Time</option>{resetSupportsPeriod && <><option value="year">Specific Year</option><option value="month">Specific Month</option><option value="day">Specific Day</option></>}</select></label>{!resetSupportsPeriod && <small>Goals and recurring rules are safely reset only as all-time records.</small>}{resetScope !== 'all' && <label>Year<select value={year} onChange={event => setYear(Number(event.target.value))}>{Array.from({ length: 35 }, (_, index) => 2016 + index).map(value => <option key={value}>{value}</option>)}</select></label>}{(resetScope === 'month' || resetScope === 'day') && <label>Month<select value={month} onChange={event => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{monthName(value)}</option>)}</select></label>}{resetScope === 'day' && <label>Day<select value={resetDay} onChange={event => setResetDay(Number(event.target.value))}>{Array.from({ length: new Date(year, month, 0).getDate() }, (_, index) => index + 1).map(value => <option key={value}>{value}</option>)}</select></label>}<button type="button" className="primaryAction" onClick={() => setResetReview(true)}>Review reset</button>{resetReview && <div className="mhfResetReview"><strong>You are about to delete:</strong><span>{resetType} · {resetScope === 'all' ? 'All Time' : resetScope === 'year' ? year : `${monthName(month)} ${year}${resetScope === 'day' ? ` · day ${resetDay}` : ''}`}</span><p>This action cannot be undone without a backup.</p><div><button type="button" onClick={() => setResetReview(false)}>Cancel</button><button type="button" className="danger" onClick={() => void selectiveReset()}>Reset Selected Data</button></div></div>}</section></div>}
            </>
        );
    }


    /* =====================================================
       TRASH
       ===================================================== */

    function BackupExportView() {
        const [exportScope, setExportScope] = useState<'year' | 'month'>('year');
        const years = Array.from({ length: 35 }, (_, index) => 2016 + index);
        function downloadJson(value: unknown, filename: string) {
            const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
            const anchor = document.createElement('a');
            anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
        }
        async function fullBackup() {
            const result = await exportBackup();
            if (result.error || !result.data) { window.alert(result.error?.message || 'Unable to create backup.'); return; }
            downloadJson(result.data, `my-home-finance-backup-${localDateString()}.json`);
        }
        async function filteredExport() {
            const result = await exportFilteredData({ year, month: exportScope === 'month' ? month : undefined });
            if (result.error || !result.data) { window.alert(result.error?.message || 'Unable to export selected data.'); return; }
            const suffix = exportScope === 'month' ? `${year}-${String(month).padStart(2, '0')}` : String(year);
            downloadJson(result.data, `my-home-finance-filtered-data-${suffix}.json`);
        }
        return <><MoreHeader title="Backup Data" subtitle="Export complete recovery backups or selected records." icon="backup" onBack={() => setMoreView('Backup')} />
            <section className="card mhfBackupWorkflow"><span className="eyebrow">FULL BACKUP</span><h2>Complete Finance Backup</h2><p>Canonical Backup v4 for full recovery and Restore Backup.</p><button type="button" className="primaryAction" onClick={() => void fullBackup()}>Download Full Backup</button></section>
            <section className="card mhfBackupWorkflow"><span className="eyebrow">SELECTED PERIOD EXPORT</span><h2>Archive selected data</h2><p>Selected-period exports are reference/archive exports and do not replace a Full Backup. They are not restore-compatible.</p><div className="mhfBackupScope"><label><input type="radio" checked={exportScope === 'year'} onChange={() => setExportScope('year')} /> Full Year</label><label><input type="radio" checked={exportScope === 'month'} onChange={() => setExportScope('month')} /> Specific Month</label></div><div className="mhfExportPeriod"><label>Year<select value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value}>{value}</option>)}</select></label>{exportScope === 'month' && <label>Month<select value={month} onChange={event => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{monthName(value)}</option>)}</select></label>}</div><button type="button" className="secondaryAction" onClick={() => void filteredExport()}>Export Selected Data</button></section>
        </>;
    }

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
                    onBack={() => setMoreView('Backup')}
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

    function HeroStudioView() {
        const heroPage = heroStudioPage;
        const setHeroPage = setHeroStudioPage;
        const heroTarget = heroStudioTarget;
        const setHeroTarget = setHeroStudioTarget;
        const heroTheme = heroStudioTheme;
        const setHeroTheme = setHeroStudioTheme;
        const [images, setImages] = useState<Array<Pick<HeroImage, 'id' | 'presentation'> & { url: string }>>([]);
        const [selectedId, setSelectedId] = useState<string | null>(null);
        const device = heroStudioDevice;
        const setDevice = setHeroStudioDevice;
        const [draft, setDraft] = useState<HeroPresentation>(DEFAULT_HERO_PRESENTATION);
        const [titleDraft, setTitleDraft] = useState('');
        const [subtitle, setSubtitle] = useState('');
        const [titlePositions, setTitlePositions] = useState<Record<'mobile' | 'desktop', HeroTextPosition>>({ mobile: 'left', desktop: 'left' });
        const [titleSizes, setTitleSizes] = useState<Record<'mobile' | 'desktop', HeroTextSize>>({ mobile: 'medium', desktop: 'medium' });
        const [positions, setPositions] = useState<Record<'mobile' | 'desktop', HeroTextPosition>>({ mobile: 'left', desktop: 'left' });
        const [sizes, setSizes] = useState<Record<'mobile' | 'desktop', HeroTextSize>>({ mobile: 'medium', desktop: 'medium' });
        const [feedback, setFeedback] = useState('');
        const dragging = useRef(false);
        const refresh = useCallback(async () => {
            const collection = await listHeroImages(heroPage, heroTheme, heroTarget);
            const next = collection.map(item => ({ id: item.id, presentation: item.presentation, url: URL.createObjectURL(item.blob) }));
            setImages(next);
            setSelectedId(current => next.some(item => item.id === current) ? current : next[0]?.id || null);
        }, [heroPage, heroTheme, heroTarget]);
        useEffect(() => { void refresh(); }, [refresh]);
        useEffect(() => {
            const saved = heroCopySettings[heroPage];
            setTitleDraft(saved?.title || '');
            setSubtitle(saved?.subtitle || '');
            setTitlePositions({ mobile: saved?.title_position?.mobile || saved?.text_position?.mobile || 'left', desktop: saved?.title_position?.desktop || saved?.title_position?.mobile || saved?.text_position?.desktop || saved?.text_position?.mobile || 'left' });
            setTitleSizes({ mobile: saved?.title_size?.mobile || saved?.text_size?.mobile || 'medium', desktop: saved?.title_size?.desktop || saved?.title_size?.mobile || saved?.text_size?.desktop || saved?.text_size?.mobile || 'medium' });
            setPositions({ mobile: saved?.text_position?.mobile || 'left', desktop: saved?.text_position?.desktop || saved?.text_position?.mobile || 'left' });
            setSizes({ mobile: saved?.text_size?.mobile || 'medium', desktop: saved?.text_size?.desktop || saved?.text_size?.mobile || 'medium' });
        }, [heroPage]);
        const selected = images.find(image => image.id === selectedId) || null;
        useEffect(() => { if (selected) setDraft(selected.presentation?.[device] || DEFAULT_HERO_PRESENTATION); }, [selected, device]);
        async function add(event: ChangeEvent<HTMLInputElement>) {
            const file = event.target.files?.[0]; if (!file) return;
            try { await addHeroImage(heroPage, heroTheme, file, heroTarget); await refresh(); await refreshCustomHeroAssets(); setFeedback('✓ Image added and saved'); }
            catch (error) { setFeedback(error instanceof Error ? error.message : 'Unable to save image.'); }
            finally { event.target.value = ''; }
        }
        async function saveLayout() {
            if (!selected) return;
            try { await updateHeroImagePresentation(selected.id, device, draft); await refresh(); await refreshCustomHeroAssets(); setFeedback(`✓ ${device === 'mobile' ? 'Mobile' : 'Desktop'} layout saved`); }
            catch { setFeedback('Unable to save image layout.'); }
        }
        async function remove() { if (!selected || !window.confirm('Remove this custom hero image?')) return; await removeHeroImage(selected.id); await refresh(); await refreshCustomHeroAssets(); setFeedback('Image removed'); }
        async function clearCurrent() { if (!window.confirm(`Remove all ${heroPage} · ${heroTheme} ${heroTarget === 'main' ? 'main page' : 'calendar'} images?`)) return; await clearHeroImageCollection(heroPage, heroTheme, heroTarget); await refresh(); await refreshCustomHeroAssets(); setFeedback('Collection cleared'); }
        async function resetAll() { if (!window.confirm('Remove all custom hero images from this device? Financial data will not be affected.')) return; await clearAllHeroImages(); setSelectedId(null); await refresh(); await refreshCustomHeroAssets(); setFeedback('All custom hero images removed'); }
        function pan(event: PointerEvent<HTMLDivElement>) { if (!dragging.current) return; const rect = event.currentTarget.getBoundingClientRect(); setDraft(current => ({ ...current, fit: false, position_x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), position_y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)) })); }
        function saveText() {
            const current = heroCopySettings[heroPage] || {};
            const next = { ...heroCopySettings, [heroPage]: { ...current, title: heroPage === 'Home' ? undefined : titleDraft, subtitle, title_position: titlePositions, title_size: titleSizes, subtitle_position: positions, subtitle_size: sizes, text_position: positions, text_size: sizes } };
            localStorage.setItem('mhf-hero-copy-settings-v1', JSON.stringify(next)); setHeroCopySettings(next); setFeedback('✓ Hero text saved');
        }
        const previewStyle = selected ? { backgroundImage: `linear-gradient(rgba(15,25,22,.35),rgba(15,25,22,.20)),url("${selected.url}")`, backgroundSize: draft.fit ? 'contain' : `${draft.scale * 100}% auto`, backgroundPosition: `${draft.position_x}% ${draft.position_y}%` } : undefined;
        const defaultSubtitle = defaultHeroCopy[heroPage].subtitle;
        return <>
            <MoreHeader title="Page Image & Text" subtitle="Manage page-specific hero images and supporting text." icon="settings" onBack={() => setMoreView('Settings')} />
            <section className="card mhfHeroStudio">
                <div><span className="eyebrow">HERO STUDIO</span><h2>Page image and text</h2><p>Custom images stay on this device and are not included in Finance Backup v4.</p><small className="mhfHeroRatioHint">Recommended mobile image: 3:2 landscape — for example, 1500 × 1000 px or 1200 × 800 px.</small></div>
                <div className="mhfHeroStudioControls">
                    <label>Page<select value={heroPage} onChange={event => setHeroPage(event.target.value as HeroPage)}>{(['Home', 'Expense', 'Income', 'Savings', 'More'] as HeroPage[]).map(value => <option key={value}>{value}</option>)}</select></label>
                    <label>Image target<select value={heroTarget} onChange={event => setHeroTarget(event.target.value as HeroTarget)}><option value="main">Main Page</option><option value="calendar">Calendar</option></select></label>
                    <label>Theme<select value={heroTheme} onChange={event => setHeroTheme(event.target.value as HeroTheme)}><option value="light">Light</option><option value="dark">Dark</option></select></label>
                    <label>Rotation<select value={heroRotationSettings[heroPage] || 0} disabled={heroTarget === 'calendar'} onChange={event => setHeroRotationSettings(current => ({ ...current, [heroPage]: Number(event.target.value) }))}><option value={0}>Daily</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label>
                </div>
                {feedback && <p className="mhfHeroFeedback" role="status">{feedback}</p>}
                <div className="mhfHeroStudioImages"><div><strong>IMAGES · {heroPage} · {heroTheme} · {heroTarget === 'main' ? 'Main Page' : 'Calendar'}</strong><label className="mhfHeroUpload">+ Add Image<input type="file" accept="image/*" onChange={add} /></label><button type="button" onClick={() => void clearCurrent()} disabled={images.length === 0}>Clear Current Collection</button><button type="button" className="danger" onClick={() => void resetAll()}>Reset All Custom Hero Images</button></div><div className="mhfHeroThumbs">{images.map(image => <button type="button" key={image.id} className={image.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(image.id)}><img src={image.url} alt="Custom hero thumbnail" /></button>)}{images.length === 0 && <small>No custom images for this collection. Built-in defaults are active.</small>}</div></div>
                {selected && <section className="mhfHeroEditor"><div className="mhfHeroEditorTop"><strong>SELECTED IMAGE</strong><div><button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}>Mobile</button><button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}>Desktop</button><button type="button" className="danger" onClick={() => void remove()}>Remove</button></div></div><div className={`mhfHeroCanvas ${device}`} style={previewStyle} onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); pan(event); }} onPointerMove={pan} onPointerUp={() => { dragging.current = false; }}><div className={`mhfHeroPreviewText mhfHeroTextPosition--${positions[device]} mhfHeroTextSize--${sizes[device]}`}><strong>{heroPage === 'Home' ? greeting() : titleDraft || defaultHeroCopy[heroPage].title}</strong><small>{subtitle || defaultSubtitle}</small></div></div><div className="mhfHeroFrameActions"><button type="button" onClick={() => setDraft(current => ({ ...current, fit: true, scale: .85, position_x: 50, position_y: 50 }))}>Fit Image</button><button type="button" onClick={() => setDraft(current => ({ ...current, fit: false, scale: 1, position_x: 50, position_y: 50 }))}>Fill Frame</button></div><div className="mhfHeroZoom"><button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => setDraft(current => ({ ...current, fit: false, scale: Math.max(.65, current.scale - .1) }))}>−</button><input aria-label="Hero image zoom" type="range" min="0.65" max="2" step="0.05" value={draft.scale} onChange={event => setDraft(current => ({ ...current, fit: false, scale: Number(event.target.value) }))} /><button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => setDraft(current => ({ ...current, fit: false, scale: Math.min(2, current.scale + .1) }))}>+</button></div><div className="mhfHeroEditorActions"><button type="button" onClick={() => setDraft(DEFAULT_HERO_PRESENTATION)}>Reset Position</button><button type="button" className="primaryAction" onClick={() => void saveLayout()}>Save Image Layout</button></div></section>}
                {heroTarget === 'main' && <section className="mhfHeroTextStudio"><span className="eyebrow">HERO TEXT & POSITION</span><p>Default title: “{defaultHeroCopy[heroPage].title || greeting()}”<br />Default subtitle: “{defaultSubtitle}”</p>{heroPage === 'Home' && <small>Home’s Good Morning/Afternoon/Evening greeting is system-controlled.</small>}{heroPage !== 'Home' && <><label>Hero Title<input value={titleDraft} maxLength={80} placeholder={defaultHeroCopy[heroPage].title} onChange={event => setTitleDraft(event.target.value)} /></label><div className="mhfHeroStudioControls"><label>{device === 'mobile' ? 'Mobile' : 'Desktop'} title size<select value={titleSizes[device]} onChange={event => setTitleSizes(current => ({ ...current, [device]: event.target.value as HeroTextSize }))}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label><label>{device === 'mobile' ? 'Mobile' : 'Desktop'} title alignment<select value={titlePositions[device]} onChange={event => setTitlePositions(current => ({ ...current, [device]: event.target.value as HeroTextPosition }))}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div></>}<label>Hero Subtitle<input value={subtitle} maxLength={140} placeholder={defaultSubtitle} onChange={event => setSubtitle(event.target.value)} /></label><div className="mhfHeroStudioControls"><label>{device === 'mobile' ? 'Mobile' : 'Desktop'} subtitle size<select value={sizes[device]} onChange={event => setSizes(current => ({ ...current, [device]: event.target.value as HeroTextSize }))}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label><label>{device === 'mobile' ? 'Mobile' : 'Desktop'} subtitle alignment<select value={positions[device]} onChange={event => setPositions(current => ({ ...current, [device]: event.target.value as HeroTextPosition }))}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div><div><button type="button" onClick={saveText}>Save Hero Text</button><button type="button" onClick={() => { setTitleDraft(''); setSubtitle(''); setTitlePositions({ mobile: 'left', desktop: 'left' }); setTitleSizes({ mobile: 'medium', desktop: 'medium' }); setPositions({ mobile: 'left', desktop: 'left' }); setSizes({ mobile: 'medium', desktop: 'medium' }); const current = heroCopySettings[heroPage] || {}; const next = { ...heroCopySettings, [heroPage]: { ...current, title: heroPage === 'Home' ? undefined : '', subtitle: '', title_position: { mobile: 'left', desktop: 'left' }, title_size: { mobile: 'medium', desktop: 'medium' }, subtitle_position: { mobile: 'left', desktop: 'left' }, subtitle_size: { mobile: 'medium', desktop: 'medium' }, text_position: { mobile: 'left', desktop: 'left' }, text_size: { mobile: 'medium', desktop: 'medium' } } }; localStorage.setItem('mhf-hero-copy-settings-v1', JSON.stringify(next)); setHeroCopySettings(next); setFeedback('Default hero text restored'); }}>Use Default</button></div></section>}
            </section>
        </>;
    }

    function LegacyHeroStudioView() {
        const [heroPage, setHeroPage] = useState<HeroPage>('Home');
        const [heroTheme, setHeroTheme] = useState<HeroTheme>('light');
        const [heroTarget, setHeroTarget] = useState<HeroTarget>('main');
        const [images, setImages] = useState<Array<Pick<HeroImage, 'id' | 'presentation'> & { url: string }>>([]);
        const [selectedId, setSelectedId] = useState<string | null>(null);
        const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
        const [draft, setDraft] = useState<HeroPresentation>(DEFAULT_HERO_PRESENTATION);
        const [feedback, setFeedback] = useState('');
        const [subtitle, setSubtitle] = useState('');
        const [textPositions, setTextPositions] = useState<Record<'mobile' | 'desktop', HeroTextPosition>>({ mobile: 'left', desktop: 'left' });
        const dragging = useRef(false);
        const refresh = useCallback(async () => {
            const records = await listHeroImages(heroPage, heroTheme, heroTarget);
            const next = records.map(item => ({ id: item.id, presentation: item.presentation, url: URL.createObjectURL(item.blob) }));
            setImages(next); setSelectedId(current => next.some(item => item.id === current) ? current : next[0]?.id || null);
        }, [heroPage, heroTheme, heroTarget]);
        useEffect(() => { void refresh(); }, [refresh]);
        useEffect(() => {
            const saved = heroCopySettings[heroPage];
            setSubtitle(saved?.subtitle || '');
            setTextPositions({ mobile: saved?.text_position?.mobile || 'left', desktop: saved?.text_position?.desktop || saved?.text_position?.mobile || 'left' });
        }, [heroPage]);
        const selected = images.find(item => item.id === selectedId) || null;
        useEffect(() => { if (!selected) return; setDraft(selected.presentation?.[device] || DEFAULT_HERO_PRESENTATION); }, [selectedId, device, selected?.presentation]);
        const commitFeedback = (message: string) => setFeedback(message);
        async function add(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; try { await addHeroImage(heroPage, heroTheme, file, heroTarget); await refresh(); await refreshCustomHeroAssets(); commitFeedback('✓ Image added and saved'); } catch (error) { commitFeedback(error instanceof Error ? error.message : 'Unable to save image.'); } finally { event.target.value = ''; } }
        async function saveLayout() { if (!selected) return; try { await updateHeroImagePresentation(selected.id, device, draft); await refresh(); await refreshCustomHeroAssets(); commitFeedback(`✓ ${device === 'mobile' ? 'Mobile' : 'Desktop'} layout saved`); } catch { commitFeedback('Unable to save image layout.'); } }
        async function remove() { if (!selected) return; if (!window.confirm('Remove this custom hero image?')) return; await removeHeroImage(selected.id); await refresh(); await refreshCustomHeroAssets(); commitFeedback('Image removed'); }
        async function clearCollection() { if (!window.confirm(`Remove all custom ${heroTarget === 'main' ? 'main page' : 'calendar'} images from ${heroPage} · ${heroTheme}?`)) return; await clearHeroImageCollection(heroPage, heroTheme, heroTarget); await refresh(); await refreshCustomHeroAssets(); commitFeedback('Collection cleared'); }
        async function resetAll() { if (!window.confirm('Reset all custom hero images? Your financial data will not be affected.')) return; try { await clearAllHeroImages(); localStorage.removeItem('mhf-hero-copy-settings-v1'); setHeroCopySettings({}); setSelectedId(null); await refresh(); await refreshCustomHeroAssets(); commitFeedback('All custom hero images and settings removed'); } catch { commitFeedback('Unable to reset custom hero images.'); } }
        function saveText() {
            const current = heroCopySettings[heroPage] || {};
            const next = {
                ...heroCopySettings,
                [heroPage]: {
                    ...current,
                    title: heroPage === 'Home' ? undefined : current.title,
                    subtitle,
                    text_position: { ...current.text_position, ...textPositions }
                }
            };
            localStorage.setItem('mhf-hero-copy-settings-v1', JSON.stringify(next));
            setHeroCopySettings(next);
            commitFeedback('✓ Hero subtitle and text position saved');
        }
        function pan(event: PointerEvent<HTMLDivElement>) { if (!dragging.current) return; const rect = event.currentTarget.getBoundingClientRect(); setDraft(current => ({ ...current, position_x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)), position_y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)) })); }
        const previewStyle = selected ? { backgroundImage: `linear-gradient(rgba(15,25,22,.35),rgba(15,25,22,.20)),url("${selected.url}")`, backgroundSize: draft.fit ? 'contain' : `${draft.scale * 100}% auto`, backgroundPosition: `${draft.position_x}% ${draft.position_y}%` } : undefined;
        return <><MoreHeader title="Page Image & Text" subtitle="Manage page-specific hero images and supporting text." icon="settings" onBack={() => setMoreView('Settings')} />
            <section className="card mhfHeroStudio"><div><span className="eyebrow">HERO STUDIO</span><h2>Page image and text</h2><p>Custom images stay on this device and are not included in Finance Backup v4.</p></div><div className="mhfHeroStudioControls"><label>Page<select value={heroPage} onChange={event => setHeroPage(event.target.value as HeroPage)}>{(['Home','Expense','Income','Savings','More'] as HeroPage[]).map(item => <option key={item}>{item}</option>)}</select></label><label>Theme<select value={heroTheme} onChange={event => setHeroTheme(event.target.value as HeroTheme)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Rotation<select value={heroRotationSettings[heroPage] || 0} onChange={event => setHeroRotationSettings(current => ({ ...current, [heroPage]: Number(event.target.value) }))}><option value={0}>Daily</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label></div>{feedback && <p className="mhfHeroFeedback" role="status">{feedback}</p>}<div className="mhfHeroStudioImages"><div><strong>IMAGES · {heroPage} · {heroTheme}</strong><label className="mhfHeroUpload">+ Add Image<input type="file" accept="image/*" onChange={add} /></label><button type="button" onClick={() => void clearCollection()} disabled={images.length === 0}>Clear {heroPage} · {heroTheme} Images</button><button type="button" className="danger" onClick={() => void resetAll()}>Reset All Custom Hero Images</button></div><div className="mhfHeroThumbs">{images.map(image => <button type="button" key={image.id} className={image.id === selectedId ? 'selected' : ''} onClick={() => setSelectedId(image.id)}><img src={image.url} alt="Custom hero thumbnail" /></button>)}{images.length === 0 && <small>No custom images for {heroPage} · {heroTheme}. Built-in images are active.</small>}</div></div>{selected && <section className="mhfHeroEditor"><div className="mhfHeroEditorTop"><strong>SELECTED IMAGE</strong><div><button type="button" className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')}>Mobile</button><button type="button" className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')}>Desktop</button><button type="button" className="danger" onClick={() => void remove()}>Remove</button></div></div><div className={`mhfHeroCanvas ${device}`} style={previewStyle} onPointerDown={event => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); pan(event); }} onPointerMove={pan} onPointerUp={() => { dragging.current = false; }}><div className={`mhfHeroPreviewText mhfHeroTextPosition--${textPositions[device]}`}><strong>{heroPage === 'Home' ? greeting() : defaultHeroCopy[heroPage].title}</strong><small>{subtitle || defaultHeroCopy[heroPage].subtitle}</small></div></div><div className="mhfHeroZoom"><button type="button" onClick={() => setDraft(current => ({ ...current, scale: Math.max(.85, current.scale - .1) }))}>−</button><input aria-label="Hero image zoom" type="range" min="0.85" max="2" step="0.05" value={draft.scale} onChange={event => setDraft(current => ({ ...current, scale: Number(event.target.value) }))} /><button type="button" onClick={() => setDraft(current => ({ ...current, scale: Math.min(2, current.scale + .1) }))}>+</button></div><div className="mhfHeroEditorActions"><button type="button" onClick={() => setDraft(DEFAULT_HERO_PRESENTATION)}>Reset Position</button><button type="button" className="primaryAction" onClick={() => void saveLayout()}>Save Image Layout</button></div></section>}<section className="mhfHeroTextStudio"><span className="eyebrow">HERO SUBTITLE & POSITION</span><p>Default title: “{defaultHeroCopy[heroPage].title || greeting()}”<br />Default subtitle: “{defaultHeroCopy[heroPage].subtitle}”</p>{heroPage === 'Home' && <small>Home’s Good Morning/Afternoon/Evening greeting is system-controlled.</small>}<label>Hero Subtitle<input value={subtitle} maxLength={140} placeholder={defaultHeroCopy[heroPage].subtitle} onChange={event => setSubtitle(event.target.value)} /></label><label>{device === 'mobile' ? 'Mobile' : 'Desktop'} text placement<select value={textPositions[device]} onChange={event => setTextPositions(current => ({ ...current, [device]: event.target.value as HeroTextPosition }))}><option value="left">Bottom Left</option><option value="center">Bottom Center</option><option value="right">Bottom Right</option></select></label><div><button type="button" onClick={saveText}>Save Subtitle</button><button type="button" onClick={() => { setSubtitle(''); setTextPositions({ mobile: 'left', desktop: 'left' }); const current = heroCopySettings[heroPage] || {}; const next = { ...heroCopySettings, [heroPage]: { ...current, subtitle: '', text_position: { ...current.text_position, mobile: 'left', desktop: 'left' } } }; localStorage.setItem('mhf-hero-copy-settings-v1', JSON.stringify(next)); setHeroCopySettings(next); commitFeedback('Default subtitle restored'); }}>Use Default</button></div></section></section></>;
    }

    function SettingsView() {
        return <><MoreHeader title="Settings" subtitle="Appearance and application preferences." icon="settings" />
            <section className="card mhfAppearance"><span className="eyebrow">APPEARANCE</span><div><button type="button" className={!dark ? 'active' : ''} onClick={() => setDark(false)}>Light</button><button type="button" className={dark ? 'active' : ''} onClick={() => setDark(true)}>Dark</button></div></section>
            <button type="button" className="card mhfUtilityAction" onClick={() => setMoreView('HeroStudio')}><span><Icon name="settings" size={23} /></span><div><strong>Page Image & Text</strong><small>Customize page hero images and supporting text.</small></div><Icon name="arrow" size={19} /></button>
        </>;
    }

    function LegacySettingsView() {
        const [heroPage, setHeroPage] = useState<HeroPage>('Home');
        const [heroTheme, setHeroTheme] = useState<HeroTheme>('light');
        const [managedImages, setManagedImages] = useState<Array<Pick<HeroImage, 'id' | 'position_x' | 'position_y'> & { url: string }>>([]);
        const [feedback, setFeedback] = useState<{ message: string; error?: boolean } | null>(null);
        const [titleDraft, setTitleDraft] = useState('');
        const [subtitleDraft, setSubtitleDraft] = useState('');

        const refreshManagedImages = useCallback(async () => {
            const images = await listHeroImages(heroPage, heroTheme);
            setManagedImages(images.map(item => ({
                id: item.id,
                url: URL.createObjectURL(item.blob),
                position_x: item.position_x,
                position_y: item.position_y
            })));
        }, [heroPage, heroTheme]);

        useEffect(() => { void refreshManagedImages(); }, [refreshManagedImages]);
        useEffect(() => {
            const saved = heroCopySettings[heroPage];
            setTitleDraft(saved?.title || '');
            setSubtitleDraft(saved?.subtitle || '');
        }, [heroPage]);

        function report(message: string, error = false) {
            setFeedback({ message, error });
        }

        async function refreshHeroManagement() {
            await refreshManagedImages();
            await refreshCustomHeroAssets();
        }

        async function selectHeroImage(event: ChangeEvent<HTMLInputElement>) {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                await addHeroImage(heroPage, heroTheme, file);
                await refreshHeroManagement();
                report('Image saved');
            } catch (error) {
                report(error instanceof Error ? error.message : 'Unable to save image.', true);
            } finally {
                event.target.value = '';
            }
        }

        async function removeManagedImage(id: string) {
            try {
                await removeHeroImage(id);
                await refreshHeroManagement();
                report('Image removed');
            } catch (error) {
                report(error instanceof Error ? error.message : 'Unable to remove image.', true);
            }
        }

        async function setPosition(image: typeof managedImages[number], axis: 'x' | 'y', value: HeroPositionX | HeroPositionY) {
            try {
                await updateHeroImagePosition(
                    image.id,
                    axis === 'x' ? value as HeroPositionX : image.position_x || 'center',
                    axis === 'y' ? value as HeroPositionY : image.position_y || 'center'
                );
                await refreshHeroManagement();
                report('Image position saved');
            } catch (error) {
                report(error instanceof Error ? error.message : 'Unable to save image position.', true);
            }
        }

        async function clearCollection() {
            if (!window.confirm(`Clear custom ${heroPage} ${heroTheme} hero images? Built-in default images will remain.`)) return;
            try {
                await clearHeroImageCollection(heroPage, heroTheme);
                await refreshHeroManagement();
                report('Collection cleared');
            } catch (error) {
                report(error instanceof Error ? error.message : 'Unable to clear collection.', true);
            }
        }

        async function resetAllCustomImages() {
            if (window.prompt('Type RESET HERO IMAGES to remove all custom hero images on this device.') !== 'RESET HERO IMAGES') return;
            try {
                await clearAllHeroImages();
                await refreshHeroManagement();
                report('All custom hero images removed');
            } catch (error) {
                report(error instanceof Error ? error.message : 'Unable to reset custom images.', true);
            }
        }

        function saveHeroText() {
            const next = {
                ...heroCopySettings,
                [heroPage]: { title: titleDraft, subtitle: subtitleDraft }
            };
            try {
                localStorage.setItem('mhf-hero-copy-settings-v1', JSON.stringify(next));
                setHeroCopySettings(next);
                report('Settings saved');
            } catch {
                report('Unable to save hero text on this device.', true);
            }
        }

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

                <section className="card mhfHeroSettings">
                    <div><span className="eyebrow">HERO IMAGES</span><h2>Page-specific collections</h2><p>Up to five images per page/theme, stored locally in IndexedDB. Custom images stay on this browser and are not included in JSON finance backups.</p></div>
                    <div className="mhfHeroSettingsControls"><label>Page<select value={heroPage} onChange={event => setHeroPage(event.target.value as HeroPage)}>{(['Home', 'Expense', 'Income', 'Savings', 'More'] as HeroPage[]).map(value => <option key={value}>{value}</option>)}</select></label><label>Theme<select value={heroTheme} onChange={event => setHeroTheme(event.target.value as HeroTheme)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Rotation<select value={heroRotationSettings[heroPage] || 0} onChange={event => { const next = { ...heroRotationSettings, [heroPage]: Number(event.target.value) }; try { localStorage.setItem('mhf-hero-rotation-settings-v1', JSON.stringify(next)); setHeroRotationSettings(next); report('Settings saved'); } catch { report('Unable to save rotation on this device.', true); } }}><option value={0}>Daily</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label><label className="mhfHeroUpload">Add image<input type="file" accept="image/*" onChange={selectHeroImage} /></label></div>
                    {feedback && <p className={`mhfHeroFeedback${feedback.error ? ' error' : ''}`} role="status">{feedback.message}</p>}
                    <div className="mhfHeroCollectionHeading"><strong>{heroPage} · {heroTheme === 'light' ? 'Light' : 'Dark'} collection</strong><div><button type="button" onClick={() => void clearCollection()} disabled={managedImages.length === 0}>Clear current</button><button type="button" className="danger" onClick={() => void resetAllCustomImages()}>Reset all custom images</button></div></div>
                    <div className="mhfHeroImagePreviews">{managedImages.map(image => <article key={image.id}><img src={image.url} alt={`Custom ${heroPage} hero preview`} style={{ objectPosition: `${image.position_x || 'center'} ${image.position_y || 'center'}` }} /><div><strong>{heroPage} · {heroTheme}</strong><button type="button" onClick={() => void removeManagedImage(image.id)}>Remove</button></div><label>Horizontal<select value={image.position_x || 'center'} onChange={event => void setPosition(image, 'x', event.target.value as HeroPositionX)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label>Vertical<select value={image.position_y || 'center'} onChange={event => void setPosition(image, 'y', event.target.value as HeroPositionY)}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label><div className="mhfHeroAspectPreviews"><span style={heroBackground({ url: image.url, position_x: image.position_x, position_y: image.position_y }, 'linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18))')}>Mobile</span><span style={heroBackground({ url: image.url, position_x: image.position_x, position_y: image.position_y }, 'linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.18))')}>Wide</span></div></article>)}{managedImages.length === 0 && <small>No custom images for this page/theme. Built-in page images remain active.</small>}</div>
                    <div className="mhfHeroTextSettings"><span className="eyebrow">HERO TEXT</span><p>Optional page-specific copy. Leave either field blank to use the default application copy.</p><label>Hero Title<input value={titleDraft} maxLength={80} placeholder={defaultHeroCopy[heroPage].title || 'Current greeting'} onChange={event => setTitleDraft(event.target.value)} /></label><label>Hero Subtitle<input value={subtitleDraft} maxLength={140} placeholder={defaultHeroCopy[heroPage].subtitle} onChange={event => setSubtitleDraft(event.target.value)} /></label><button type="button" onClick={saveHeroText}>Save hero text</button></div>
                </section>
            </>
        );
    }


    function AutomationView() {
        const [kind, setKind] = useState<RecurringRule['kind']>('income');
        const [name, setName] = useState('');
        const [amount, setAmount] = useState('');
        const [frequency, setFrequency] = useState<RecurringRule['frequency']>('monthly');
        const [startDate, setStartDate] = useState(localDateString());
        const [ends, setEnds] = useState<'never' | 'date'>('never');
        const [endDate, setEndDate] = useState('');
        const [track, setTrack] = useState<SavingsTrack>('Personal Savings');
        const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup>('Home');
        const [expenseCategory, setExpenseCategory] = useState(defaultCategories.Home[0]);
        const [incomeSource, setIncomeSource] = useState('');
        const [ruleFilter, setRuleFilter] = useState<'all' | RecurringRule['kind']>('all');
        const previewName = kind === 'expense'
            ? name.trim() || expenseCategory
            : kind === 'income'
                ? name.trim() || incomeSource || 'Income rule'
                : name.trim() || `${track} contribution`;

        function nextScheduleDate(value: string, selectedFrequency: RecurringRule['frequency']) {
            const date = new Date(`${value}T12:00:00`);
            if (selectedFrequency === 'monthly' || selectedFrequency === 'yearly') {
                const day = date.getDate();
                date.setDate(1);
                date.setMonth(date.getMonth() + (selectedFrequency === 'yearly' ? 12 : 1));
                date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
            } else {
                date.setDate(date.getDate() + (selectedFrequency === 'weekly' ? 7 : 14));
            }
            return localDateString(date);
        }

        function scheduleLabelFor(selectedFrequency: RecurringRule['frequency'], scheduleDate: string, isExpense = kind === 'expense') {
            const day = Number(scheduleDate.slice(-2));
            if (selectedFrequency === 'yearly') return `Yearly · ${shortDate(scheduleDate)}`;
            if (selectedFrequency === 'monthly') return isExpense ? `Monthly · due every ${day}${day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'}` : `Monthly · day ${day}`;
            return selectedFrequency === 'biweekly' ? 'Biweekly' : 'Weekly';
        }

        const scheduleLabel = scheduleLabelFor(frequency, startDate);
        const previewDates = [startDate, nextScheduleDate(startDate, frequency), nextScheduleDate(nextScheduleDate(startDate, frequency), frequency)]
            .filter(date => ends === 'never' || !endDate || date <= endDate);

        function changeKind(next: RecurringRule['kind']) {
            setKind(next);
            setName('');
            setIncomeSource('');
        }

        function changeExpenseGroup(next: ExpenseGroup) {
            setExpenseGroup(next);
            setExpenseCategory(defaultCategories[next][0]);
        }

        async function saveRule() {
            const result = await upsertRecurringRule({
                kind,
                name: previewName,
                amount: Number(amount),
                frequency,
                start_date: startDate,
                end_date: ends === 'date' ? endDate || null : null,
                next_occurrence: startDate,
                enabled: true,
                group_name: kind === 'expense' ? expenseGroup : null,
                category: kind === 'expense' ? expenseCategory : null,
                merchant: null,
                payment_method: null,
                // A recurring expense is an obligation, not a payment. It remains
                // actionable until the existing Mark as Paid workflow is used.
                status: kind === 'expense' ? 'unpaid' : 'paid',
                due_date: kind === 'expense' ? startDate : null,
                notes: null,
                hours_worked: null,
                savings_track: kind === 'savings' ? track : null
            });
            if (result.error) {
                window.alert(result.error.message);
                return;
            }
            setName('');
            setIncomeSource('');
            setAmount('');
            await load();
        }

        async function toggle(rule: RecurringRule) {
            await upsertRecurringRule({ ...rule, enabled: !rule.enabled });
            await load();
        }

        async function edit(rule: RecurringRule) {
            const nextAmount = window.prompt(`Future ${rule.name} amount`, String(rule.amount));
            if (nextAmount === null) return;
            const nextEnd = window.prompt('Future end date (YYYY-MM-DD), or leave blank for Never', rule.end_date || '');
            if (nextEnd === null) return;
            const result = await upsertRecurringRule({ ...rule, amount: Number(nextAmount), end_date: nextEnd.trim() || null });
            if (result.error) window.alert(result.error.message);
            await load();
        }

        const scheduleEnded = (rule: RecurringRule) => Boolean(rule.end_date && rule.next_occurrence > rule.end_date);

        return <>
            <MoreHeader title="Recurring Finance" subtitle="Set up the money that repeats automatically." icon="clock" />
            <section className="card mhfAutomationForm">
                <span className="eyebrow">NEW RECURRING RULE</span>
                <div><label>Type<select value={kind} onChange={event => changeKind(event.target.value as RecurringRule['kind'])}><option value="expense">Expense</option><option value="income">Income</option><option value="savings">Savings</option></select></label><label>Frequency<select value={frequency} onChange={event => setFrequency(event.target.value as RecurringRule['frequency'])}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label></div>
                {kind === 'expense' && <div><label>Expense group<select value={expenseGroup} onChange={event => changeExpenseGroup(event.target.value as ExpenseGroup)}>{expenseGroups.map(group => <option key={group}>{group}</option>)}</select></label><label>Category<select value={expenseCategory} onChange={event => setExpenseCategory(event.target.value)}>{defaultCategories[expenseGroup].map(category => <option key={category}>{category}</option>)}</select></label></div>}
                {kind === 'income' && <div><label>Income source<select value={incomeSource} onChange={event => setIncomeSource(event.target.value)}><option value="">Choose source</option>{incomeSources.map(source => <option key={source}>{source}</option>)}</select></label><label>Details / source name<input value={name} onChange={event => setName(event.target.value)} placeholder="Salary, rental income, side income" /></label></div>}
                {kind === 'expense' && <label>Description / name<input value={name} onChange={event => setName(event.target.value)} placeholder={expenseCategory} /></label>}
                {kind === 'savings' && <div><label>Savings track<select value={track} onChange={event => setTrack(event.target.value as SavingsTrack)}><option>Personal Savings</option><option>Home Savings</option></select></label><label>Name<input value={name} onChange={event => setName(event.target.value)} placeholder={`${track} contribution`} /></label></div>}
                <div><label>Amount<input type="number" min="0" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} /></label><label>{kind === 'expense' ? 'Due date / schedule' : kind === 'income' ? 'Expected date / schedule' : 'Schedule'}<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label></div>
                <div><label>Ends<select value={ends} onChange={event => setEnds(event.target.value as 'never' | 'date')}><option value="never">Never — until disabled</option><option value="date">On Date</option></select></label>{ends === 'date' && <label>End date<input type="date" min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>}</div>
                <section className="mhfRecurringPreview" aria-live="polite"><span className="eyebrow">SCHEDULE PREVIEW</span><strong>{previewName}</strong><b>{money(Number(amount) || 0)}</b><p>{scheduleLabel}<br />Starts {shortDate(startDate)}<br />{ends === 'date' && endDate ? `Ends ${shortDate(endDate)}` : 'No end date — continues until you disable this recurring rule.'}</p><small>Next expected: {previewDates.map(shortDate).join(' · ')}</small><em>This preview does not create transactions.</em></section>
                <p className="mhfRecurringSchedule">This rule creates future canonical {kind === 'savings' ? 'savings contributions' : `${kind} records`} only; historical records are never rewritten.</p>
                <button type="button" className="primaryAction" onClick={() => void saveRule()}>Create recurring rule</button>
            </section>
            <section className="card mhfAutomationList"><div className="mhfSectionTitle"><div><span className="eyebrow">RECURRING RULES</span><h2>Schedules</h2></div><strong>{recurringRules.filter(rule => rule.enabled && !scheduleEnded(rule)).length} active</strong></div><div className="mhfRecurringFilters"><button type="button" className={ruleFilter === 'all' ? 'active' : ''} onClick={() => setRuleFilter('all')}>All</button><button type="button" className={ruleFilter === 'expense' ? 'active' : ''} onClick={() => setRuleFilter('expense')}>Expenses</button><button type="button" className={ruleFilter === 'income' ? 'active' : ''} onClick={() => setRuleFilter('income')}>Income</button><button type="button" className={ruleFilter === 'savings' ? 'active' : ''} onClick={() => setRuleFilter('savings')}>Savings</button></div>{recurringRules.filter(rule => ruleFilter === 'all' || rule.kind === ruleFilter).map(rule => <article className="mhfRecurringRule" key={rule.id}><div className="mhfRecurringRuleCopy"><span className="eyebrow">{rule.kind === 'expense' ? `EXPENSE · ${rule.group_name || 'Expense'}${rule.category ? ` · ${rule.category}` : ''}` : rule.kind === 'savings' ? `SAVINGS · ${rule.savings_track || 'Savings'}` : 'INCOME'}</span><strong>{rule.name}</strong><b>{money(rule.amount)}</b><dl><div><dt>Schedule</dt><dd>{scheduleLabelFor(rule.frequency, rule.due_date || rule.next_occurrence, rule.kind === 'expense')}</dd></div><div><dt>Start</dt><dd>{shortDate(rule.start_date)}</dd></div><div><dt>End</dt><dd>{rule.end_date ? shortDate(rule.end_date) : 'Never · until disabled'}</dd></div><div><dt>Next</dt><dd>{scheduleEnded(rule) ? 'Schedule ended' : shortDate(rule.next_occurrence)}</dd></div><div><dt>Status</dt><dd>{scheduleEnded(rule) ? 'Ended' : rule.enabled ? 'Active' : 'Paused'}</dd></div></dl></div><div>{!scheduleEnded(rule) && <button type="button" onClick={() => void toggle(rule)}>{rule.enabled ? 'Disable' : 'Enable'}</button>}<button type="button" onClick={() => void edit(rule)}>Edit</button><button type="button" className="danger" onClick={() => void deleteRecurringRule(rule.id).then(load)}>Delete</button></div></article>)}{recurringRules.filter(rule => ruleFilter === 'all' || rule.kind === ruleFilter).length === 0 && <div className="emptyState">No recurring rules in this view.</div>}</section>
        </>;
    }


    /* =====================================================
       MORE
       ===================================================== */

    function MoreHeader({
                            title,
                            subtitle,
                            icon
                            ,compact = true,
                            onBack
                        }: {
        title: string;
        subtitle: string;
        compact?: boolean;
        onBack?: () => void;
        icon:
            'report' |
            'backup' |
            'trash' |
            'settings' |
            'clock';
    }) {
        return (
            <section className={`mhfMoreHeader${compact ? ' mhfMoreHeaderCompact' : ''}`}>
                <button
                    type="button"
                    onClick={() =>
                            (onBack || (() => setMoreView('Menu')))()
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

        if (moreView === 'HeroStudio') {
            return <HeroStudioView />;
        }

        if (moreView === 'BackupExport') {
            return <BackupExportView />;
        }

        if (moreView === 'Automation') {
            return <AutomationView />;
        }

        return (
            <>
                <section
                    className="hero mhfMoreHero"
                    style={heroBackground(
                        pageHeroAsset('More', heroAssets.more),
                        HERO_TEXT_OVERLAY
                    )}
                >
                    <div className={heroTextClass('More')}>
                        <span className="eyebrow">
                            MORE
                        </span>

                        <h1 className={heroCopyPartClass('More', 'title')}>{heroCopy('More').title}</h1>

                        <p className={heroCopyPartClass('More', 'subtitle')}>{heroCopy('More').subtitle}</p>
                    </div>
                </section>

                <CurrentDateContext />

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

                    <button type="button" onClick={() => setMoreView('Automation')}>
                        <span><Icon name="clock" size={26} /></span>
                        <div><strong>Recurring</strong><small>Automate repeating income, expenses and savings</small></div>
                        <Icon name="arrow" size={20} />
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
            transaction.kind === 'income' &&
            transaction.hours_worked != null
        ) {
            fields.push({
                label: 'Hours Worked',
                value: String(transaction.hours_worked)
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

                        {transaction.kind === 'expense' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setExpenseFilter(
                                        normalizeGroup(transaction.group_name) || 'All'
                                    );
                                    setDetailTransaction(null);
                                    setPage('Expense');
                                }}
                            >
                                <Icon name="expense" size={18} />
                                View Full Expense
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


    function CategoryBudgetPopup() {
        if (!categoryBudgetPopupOpen) return null;

        return <div className="mhfOverlay">
            <section className="mhfBudgetPopup" role="dialog" aria-modal="true" aria-label="Set category budgets">
                <div className="mhfDetailsTop">
                    <div><span className="eyebrow">CATEGORY BUDGETS</span><h2>{monthLabel(year, month)}</h2></div>
                    <button type="button" aria-label="Close" onClick={() => setCategoryBudgetPopupOpen(false)}>×</button>
                </div>
                <p>Set a planned amount for any category. Leave a field blank when it has no budget.</p>
                <div className="mhfCategoryBudgetForm">
                    {expenseGroups.map(group => <label key={group}>{group}
                        <input type="number" min="0" step="0.01" value={categoryBudgetDrafts[group]}
                            onChange={event => setCategoryBudgetDrafts(current => ({ ...current, [group]: event.target.value }))} />
                    </label>)}
                </div>
                <div className="mhfPopupActions">
                    <button type="button" onClick={() => setCategoryBudgetPopupOpen(false)}>Cancel</button>
                    <button type="button" className="primaryAction" onClick={() => void saveCategoryBudgetAmounts()}>Save budgets</button>
                </div>
            </section>
        </div>;
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

                .mhfHomeToolbar { margin:12px 0 10px; align-items:center; }
                .mhfPeriodTrigger { display:inline-flex; align-items:center; gap:8px; border:0; padding:3px 0; background:transparent; color:inherit; font-size:1.22rem; font-weight:800; cursor:pointer; }
                .mhfPeriodTrigger:focus-visible { outline:2px solid #7182ef; outline-offset:4px; border-radius:8px; }
                .mhfPeriodChevron { width:24px; height:24px; display:grid; place-items:center; border-radius:8px; color:#6174db; background:rgba(97,116,219,.12); }
                .mhfPeriodChevron svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }
                .mhfPeriodTrigger.open .mhfPeriodChevron svg { transform:rotate(180deg); }
                .mhfPeriodSheet { width:min(360px,calc(100vw - 28px)); padding:18px; border-radius:20px; background:var(--card-bg,#fff); box-shadow:0 20px 55px rgba(0,0,0,.24); }
                .dark .mhfPeriodSheet { background:#1b1e1c; }
                .mhfPeriodSheet label { display:grid; gap:6px; margin:12px 0; font-size:.78rem; font-weight:800; }
                .mhfPeriodSheet select { min-height:40px; border-radius:10px; padding:0 10px; }
                .mhfCalendarPeriodFields { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin:12px 0; }.mhfCalendarPeriodFields label { margin:0; }.mhfCalendarPeriodFields select { width:100%; color:var(--text); background:var(--surface-raised); border:1px solid var(--border-strong); font:inherit; }
                .mhfMonthGrid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:13px; }
                .mhfMonthGrid button { min-height:34px; border:1px solid rgba(127,140,150,.2); border-radius:9px; background:rgba(127,140,150,.06); color:inherit; font-size:.74rem; font-weight:700; }
                .mhfMonthGrid button.active { color:#fff; background:#7182ef; border-color:#7182ef; }
                .mhfTodayExpense { width:100%; display:flex; align-items:center; gap:10px; margin:0 0 10px; padding:8px 11px; border:1px solid rgba(72,190,169,.22); border-radius:14px; background:linear-gradient(105deg,rgba(72,190,169,.10),rgba(124,143,244,.08)); color:inherit; text-align:left; cursor:pointer; }
                .mhfTodayExpenseGauge { width:31px; height:31px; flex:0 0 31px; display:grid; place-items:center; border-radius:50%; background:conic-gradient(#43bba4 0 72%,rgba(127,140,150,.18) 72% 100%); }.mhfTodayExpenseGauge i { width:21px; height:21px; border-radius:50%; background:var(--card-bg,#fff); }.dark .mhfTodayExpenseGauge i { background:#1b1e1c; }
                .mhfTodayExpense small,.mhfTodayExpense strong { display:block; }.mhfTodayExpense small { text-transform:uppercase; letter-spacing:.07em; opacity:.62; font-size:.61rem; font-weight:800; }.mhfTodayExpense strong { margin-top:2px; font-size:.88rem; }.mhfTodayExpenseLink { margin-left:auto; color:#6476df; font-size:.68rem; font-weight:800; white-space:nowrap; }
                .mhfHomeRow { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:7px; padding:7px 8px; border-radius:12px; }
                .mhfHomeRow .mhfTransactionMain { grid-template-columns:34px minmax(0,1fr) auto; gap:8px; }.mhfHomeRow .mhfTransactionIcon { width:34px; height:34px; border-radius:10px; }.mhfHomeRow .mhfTransactionCopy strong { font-size:.82rem; }.mhfHomeRow .mhfTransactionCopy small { margin-top:1px; font-size:.66rem; }.mhfHomeRow .mhfTransactionAmount strong { font-size:.76rem; }.mhfHomeRow .mhfTransactionAmount .statusBadge { font-size:.57rem; padding:3px 5px; }.mhfHomeRow .mhfMiniActions { margin:0; gap:3px; }.mhfHomeRow .mhfMiniActions button { width:26px; height:26px; border:0; background:transparent; }.mhfHomeRow .mhfMiniActions svg { width:15px; height:15px; }
                .mhfHomeLists { gap:12px; margin-bottom:12px; }.mhfHomeLists .mhfListCard { padding:14px; }.mhfHomeLists .mhfSectionTitle { align-items:center; margin-bottom:10px; }.mhfHomeLists .mhfSectionTitle h2 { font-size:1rem; }.mhfHomeLists .mhfSectionTitle p { font-size:.8rem; }.mhfHomeLists .mhfTransactionList { gap:6px; }
                .bottomNav { grid-template-columns:repeat(6,minmax(0,1fr)); min-height:60px; padding:5px 4px; border-radius:18px; column-gap:0; }.bottomNav button { min-height:50px; padding:2px 0; gap:2px; }.bottomNav button span { width:24px; height:24px; border-radius:8px; }.bottomNav button small { font-size:8px; }.bottomNav .mhfQuickExpense span { width:40px; height:40px; margin-top:0; transform:translateY(-6px); font-size:1.5rem; }.bottomNav .mhfQuickExpense small { margin-top:0; }
                .mhfHomeAnalysis { display:grid; gap:16px; margin-bottom:16px; }
                .mhfAnnualChartCard { padding:14px; overflow:hidden; }
                .mhfChartLegend { display:flex; gap:14px; flex-wrap:wrap; font-size:.76rem; font-weight:700; }
                .mhfChartLegend span { display:flex; align-items:center; gap:6px; }
                .mhfChartLegend i { width:9px; height:9px; border-radius:50%; background:#63c8ed; }
                .mhfChartLegend i.income { background:#2eaa78; } .mhfChartLegend i.expense { background:#3989df; } .mhfChartLegend i.available { background:#825ad5; }
                .mhfChartWrap { position:relative; margin-top:7px; }
                .mhfAnnualChart { width:100%; display:block; overflow:visible; }
                .mhfAnnualChart text { fill:currentColor; opacity:.58; font-size:10px; }
                .mhfChartGrid { stroke:currentColor; opacity:.12; stroke-dasharray:3 4; }
                .mhfChartLine { fill:none; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }
                .mhfChartLine.income { stroke:#2eaa78; } .mhfChartLine.expense { stroke:#3989df; } .mhfChartLine.available { stroke:#825ad5; }
                .mhfChartPoint { stroke:var(--card-bg,#fff); stroke-width:1.5; } .mhfChartPoint.income { fill:#2eaa78; } .mhfChartPoint.expense { fill:#3989df; } .mhfChartPoint.available { fill:#825ad5; } .dark .mhfChartPoint { stroke:#1b1e1c; }
                .mhfAnnualChart g.selected .mhfChartPoint.income { filter:drop-shadow(0 0 4px #2eaa78); } .mhfAnnualChart g.selected .mhfChartPoint.expense { filter:drop-shadow(0 0 4px #3989df); } .mhfAnnualChart g.selected .mhfChartPoint.available { filter:drop-shadow(0 0 4px #825ad5); }
                .mhfChartButtons { position:absolute; inset:0 0 18px; display:grid; grid-template-columns:repeat(12,1fr); }
                .mhfChartButtons button { border:0; background:transparent; cursor:pointer; }
                .mhfChartTooltip { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:1px; padding:7px 9px; border-radius:10px; background:rgba(124,143,244,.10); font-size:.69rem; }
                .mhfChartTooltip button { flex:1; min-width:0; border:0; padding:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }.mhfChartTooltip small,.mhfChartTooltip strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfChartTooltip small { opacity:.62; font-size:.61rem; }.mhfChartTooltip strong { margin-top:2px; font-size:.76rem; }
                .mhfChartTooltip button:nth-child(1) strong { color:#21845d; }.mhfChartTooltip button:nth-child(2) strong { color:#2874c4; }.mhfChartTooltip button:nth-child(3) strong { color:#7148bf; }
                .mhfCategoryBudgetHeader { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:18px 0 8px; }
                .mhfCategoryBudgetHeader h3 { margin:0; font-size:.94rem; }
                .mhfCategoryBudgets { display:grid; gap:10px; }
                .mhfCategoryBudget { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:4px 10px; padding:10px; border-radius:12px; background:rgba(127,140,150,.06); }
                .mhfCategoryBudget strong,.mhfCategoryBudget small { display:block; } .mhfCategoryBudget small { margin-top:2px; opacity:.65; font-size:.72rem; }
                .mhfBudgetStatus { align-self:center; font-size:.68rem; } .mhfBudgetStatus.over { color:#df6370; } .mhfBudgetStatus.near { color:#d89120; } .mhfBudgetStatus.watch { color:#b4872a; } .mhfBudgetStatus.on-track { color:#299a79; } .mhfBudgetStatus.neutral { opacity:.55; }
                .mhfBudgetProgress { grid-column:1/-1; height:5px; overflow:hidden; border-radius:999px; background:var(--mhf-track); }
                .mhfBudgetProgress span { display:block; height:100%; border-radius:inherit; background:#8a96a3; } .mhfBudgetProgress span.over { background:#df6370; } .mhfBudgetProgress span.near { background:#e5a63b; } .mhfBudgetProgress span.watch { background:#d9ba56; } .mhfBudgetProgress span.on-track { background:#45b996; }
                .mhfBudgetInsight { display:flex; gap:11px; align-items:flex-start; padding:15px 16px; border-radius:17px; border:1px solid rgba(124,143,244,.22); background:linear-gradient(135deg,rgba(124,143,244,.12),rgba(72,190,169,.08)); }
                .mhfBudgetInsight > span { font-size:1.12rem; } .mhfBudgetInsight small { color:#687be8; font-size:.67rem; font-weight:800; letter-spacing:.08em; } .mhfBudgetInsight p { margin:3px 0 0; font-size:.9rem; line-height:1.35; }
                .mhfCategoryBudgetForm { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                .mhfCategoryBudgetForm label { display:grid; gap:6px; font-size:.82rem; font-weight:700; }
                .mhfCategoryBudgetForm input { min-width:0; padding:10px; border-radius:10px; }
                .bottomNav .mhfQuickExpense { position:relative; color:#fff; }
                .bottomNav .mhfQuickExpense span { width:40px; height:40px; margin-top:0; transform:translateY(-6px); border-radius:50%; display:grid; place-items:center; background:linear-gradient(135deg,#6678e8,#43bba4); box-shadow:0 8px 20px rgba(77,105,202,.35); font-size:1.5rem; line-height:1; }
                .bottomNav .mhfQuickExpense small { margin-top:0; }

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

                .mhfCategoryContent { gap:18px; }
                .mhfCategoryDonut { width:170px; height:170px; flex-basis:170px; padding:18px; }
                .mhfCategoryDonutInner strong { font-size:1rem; }

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
                    gap:1px;
                }

                .mhfCategoryLegend button {
                    position:relative;
                    width:100%;
                    border:0;
                    background:transparent;
                    display:grid;
                    grid-template-columns:10px 1fr auto;
                    gap:9px;
                    align-items:center;
                    padding:5px 4px;
                    text-align:left;
                    color:inherit;
                    cursor:pointer;
                }

                .mhfCategoryLegend button::before { content:""; position:absolute; right:calc(100% + 4px); width:14px; height:1px; border-radius:999px; opacity:.78; transform-origin:right; }
                .mhfCategoryLegend button:nth-child(1)::before { background:#6ed9bd; transform:translateY(-9px) rotate(-15deg); }
                .mhfCategoryLegend button:nth-child(2)::before { background:#66b9ef; transform:translateY(-3px) rotate(-5deg); }
                .mhfCategoryLegend button:nth-child(3)::before { background:#f3c75d; transform:translateY(3px) rotate(5deg); }
                .mhfCategoryLegend button:nth-child(4)::before { background:#f38a93; transform:translateY(9px) rotate(15deg); }

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
                    .mhfAnnualChartCard { padding:16px; }
                    .mhfChartTooltip { gap:7px; font-size:.7rem; }
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

                    .mhfCategoryDonut { width:145px; height:145px; flex-basis:145px; padding:16px; }

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
                    .mhfChartLegend { gap:9px; font-size:.68rem; }
                    .mhfCategoryBudgetForm { grid-template-columns:1fr; }
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

                    .mhfCategoryContent { gap:10px; }
                    .mhfCategoryDonut { width:122px; height:122px; flex-basis:122px; padding:13px; }
                    .mhfCategoryLegend button { padding:4px 1px; }
                    .mhfCategoryLegend button::before { right:calc(100% + 1px); width:8px; opacity:.72; }
                    .mhfCategoryLegend button:nth-child(1)::before { transform:translateY(-6px) rotate(-13deg); }
                    .mhfCategoryLegend button:nth-child(2)::before { transform:translateY(-2px) rotate(-4deg); }
                    .mhfCategoryLegend button:nth-child(3)::before { transform:translateY(2px) rotate(4deg); }
                    .mhfCategoryLegend button:nth-child(4)::before { transform:translateY(6px) rotate(13deg); }

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

                /* Release 2 Expense page */
                .mhfExpenseHeader { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin:18px 0 12px; }
                .mhfExpenseHeader h1 { margin:3px 0; font-size:clamp(1.5rem,5vw,2rem); }
                .mhfExpenseHeader p { margin:0; opacity:.68; font-size:.82rem; }
                .mhfCurrentDate { max-width:128px; min-height:43px; display:flex; align-items:center; gap:6px; padding:7px 9px; border:1px solid rgba(127,140,150,.2); border-radius:13px; color:inherit; background:rgba(127,140,150,.06); font:inherit; font-size:.67rem; text-align:left; cursor:pointer; }
                .mhfExpensePhotoHero { min-height:178px; display:flex; align-items:flex-end; overflow:hidden; padding:19px; border-radius:22px; color:#fff; background:linear-gradient(90deg,rgba(18,42,54,.72),rgba(18,42,54,.16)),url('assets/expense-home-hero-round3.png') center/cover; box-shadow:0 10px 26px rgba(25,48,60,.13); }
                .mhfExpensePhotoHero h2 { margin:0; font-size:1.42rem; }.mhfExpensePhotoHero p { margin:5px 0 0; font-size:.88rem; }
                .mhfExpensePeriod { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:13px 0; }.mhfExpensePeriod .mhfPeriodTrigger { margin:0; }
                .mhfExpenseSummary { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 0 14px; }
                .mhfExpenseSummaryCard { min-width:0; min-height:114px; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; padding:14px; border:1px solid rgba(127,140,150,.16); border-radius:17px; color:inherit; background:var(--card-bg,#fff); text-align:left; }.mhfExpenseSummaryCard.budget { cursor:pointer; }.mhfExpenseSummaryCard.budget:hover { border-color:#6174db; }.mhfExpenseSummaryCard small { font-size:.63rem; font-weight:800; letter-spacing:.07em; opacity:.62; }.mhfExpenseSummaryCard strong { margin:5px 0 3px; font-size:1.1rem; }.mhfExpenseSummaryCard span { min-height:18px; font-size:.69rem; opacity:.68; }.mhfExpenseSummaryCard i { width:100%; height:5px; overflow:hidden; margin-top:8px; border-radius:99px; background:rgba(127,140,150,.16); }.mhfExpenseSummaryCard i b { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#6174db,#56c3af); }
                .mhfExpenseWeeklyCard { margin-bottom:14px; padding:16px; }.mhfExpenseWeeklyCard .mhfSectionTitle { margin-bottom:9px; }.mhfExpenseWeeklyCard .mhfSectionTitle h2 { font-size:1rem; }.mhfExpenseWeeklyCard .mhfSectionTitle > strong { font-size:.9rem; color:#3989df; }.mhfWeeklyBars { height:104px; display:grid; grid-template-columns:repeat(7,1fr); gap:8px; align-items:end; }.mhfWeeklyBars > div { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:6px; }.mhfWeeklyBars span { width:min(23px,100%); min-height:3px; border-radius:7px 7px 3px 3px; background:linear-gradient(#5baaf0,#3989df); }.mhfWeeklyBars small { font-size:.63rem; opacity:.63; }
                .mhfGroupsCard { margin-bottom:12px; }.mhfGroupsCard .mhfSectionTitle { margin-bottom:10px; }.mhfGroupGrid button { position:relative; min-height:105px; align-items:flex-start; padding:11px; text-align:left; }.mhfGroupGrid button > span { margin:0 0 7px; }.mhfGroupGrid button strong { font-size:.74rem; }.mhfGroupGrid button small { margin:4px 0 0; font-size:.69rem; }.mhfGroupGrid button em { position:absolute; top:11px; right:10px; font-size:.62rem; font-style:normal; opacity:.62; }
                .mhfExpenseFilterTabs { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px; padding:0 1px 9px; }.mhfExpenseFilterTabs button { min-width:0; border:1px solid rgba(127,140,150,.18); border-radius:10px; padding:7px 4px; color:inherit; background:rgba(127,140,150,.05); font-size:.65rem; font-weight:700; line-height:1.1; cursor:pointer; }.mhfExpenseFilterTabs button.active { color:#fff; border-color:#6174db; background:#6174db; }
                .mhfExpenseRow { display:grid; grid-template-columns:20px minmax(0,1fr); gap:4px; align-items:start; }.mhfExpenseRow > label { padding-top:12px; }.mhfExpenseRow input { width:15px; height:15px; accent-color:#6174db; }.mhfExpenseRow .mhfTransaction { padding:8px; border-radius:14px; }.mhfExpenseRow .mhfTransactionMain { grid-template-columns:37px minmax(0,1fr) auto; gap:8px; }.mhfExpenseRow .mhfTransactionIcon { width:37px; height:37px; border-radius:11px; }.mhfExpenseRow .mhfTransactionCopy strong { font-size:.8rem; }.mhfExpenseRow .mhfTransactionCopy small { margin-top:1px; font-size:.66rem; }.mhfExpenseRow .mhfTransactionAmount strong { font-size:.77rem; }.mhfExpenseRow .statusBadge { padding:3px 5px; font-size:.57rem; }.mhfExpenseRow .mhfMiniActions { gap:3px; margin-top:5px; }.mhfExpenseRow .mhfMiniActions button { width:28px; height:27px; border:0; }
                .mhfExpenseAddActions { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; margin:14px 0 22px; }.mhfExpenseAddActions .primaryAction { min-height:45px; }.mhfReceiptButton { display:flex; align-items:center; gap:6px; border:1px solid rgba(97,116,219,.3); border-radius:13px; padding:0 12px; color:#5265cb; background:rgba(97,116,219,.08); font:inherit; font-size:.73rem; font-weight:800; cursor:pointer; }
                .mhfCopySheet { display:grid; gap:12px; }.mhfCopySheet p { margin:0; font-size:.82rem; line-height:1.4; }.mhfCopySheet label { display:grid; gap:5px; font-size:.76rem; font-weight:800; }.mhfCopySheet select { min-height:40px; border-radius:10px; padding:0 9px; color:inherit; background:var(--card-bg,#fff); }.mhfCopyMode { display:grid; grid-template-columns:1fr 1fr; gap:7px; }.mhfCopyMode button { min-height:38px; border:1px solid rgba(127,140,150,.2); border-radius:10px; color:inherit; background:transparent; cursor:pointer; }.mhfCopyMode button.active { color:#fff; background:#6174db; border-color:#6174db; }

                /* Release 2 Expense UAT density refinement */
                .mhfExpensePhotoHero { margin-top:8px; min-height:158px; }
                .mhfExpenseSummary { gap:8px; margin-bottom:10px; }
                .mhfExpenseSummaryCard { min-height:82px; padding:10px; border-radius:14px; justify-content:flex-start; }
                .mhfExpenseSummaryCard.budget { border-left:3px solid #45b996; background:linear-gradient(135deg,rgba(69,185,150,.10),rgba(69,185,150,.025)); }
                .mhfExpenseSummaryCard.total { border-left:3px solid #3989df; background:linear-gradient(135deg,rgba(57,137,223,.11),rgba(57,137,223,.025)); }
                .mhfExpenseSummaryCard strong { margin:3px 0 1px; font-size:1rem; }.mhfExpenseSummaryCard span { min-height:15px; font-size:.63rem; }.mhfExpenseSummaryCard i { margin-top:5px; height:4px; }
                .mhfExpenseWeeklyCard { margin-bottom:10px; padding:13px; }.mhfWeeklyBars { height:88px; gap:6px; }.mhfWeeklyBars > div { gap:4px; }.mhfWeeklyBars .mhfWeeklyStack { width:min(21px,100%); min-height:3px; display:flex; flex-direction:column-reverse; overflow:hidden; border-radius:6px 6px 2px 2px; background:rgba(127,140,150,.14); }.mhfWeeklyStack i { width:100%; flex:0 0 auto; }.mhfWeeklyStack i.home { background:#6ed9bd; }.mhfWeeklyStack i.personal { background:#66b9ef; }.mhfWeeklyStack i.credit-and-loan { background:#f3c75d; }.mhfWeeklyStack i.others { background:#f38a93; }
                .mhfGroupsCard { padding:11px 0 9px; overflow:hidden; background:transparent; border:0; box-shadow:none; }.mhfGroupsCard .mhfSectionTitle { padding:0 2px; margin-bottom:7px; }.mhfGroupsCard .mhfSectionTitle h2 { font-size:.95rem; }
                .mhfGroupGrid { grid-template-columns:repeat(4,minmax(0,1fr)); gap:5px; }.mhfGroupGrid button { min-height:74px; padding:7px 5px; border-radius:11px; align-items:center; text-align:center; }.mhfGroupGrid button > span { width:24px; height:24px; margin:0 0 3px; border-radius:8px; }.mhfGroupGrid button > span svg { width:15px; height:15px; }.mhfGroupGrid button strong { width:100%; overflow:hidden; font-size:.61rem; line-height:1.05; text-overflow:ellipsis; white-space:nowrap; }.mhfGroupGrid button small { margin-top:2px; font-size:.58rem; }.mhfGroupGrid button em { top:5px; right:5px; font-size:.5rem; }
                .mhfExpenseFilterTabs { margin-top:2px; padding-bottom:7px; }.mhfExpenseFilterTabs button { min-height:32px; padding:4px 2px; font-size:.59rem; }
                .mhfTransactionList { gap:5px; }.mhfExpenseRow { grid-template-columns:17px minmax(0,1fr); gap:2px; }.mhfExpenseRow > label { padding-top:9px; }.mhfExpenseRow input { width:13px; height:13px; }.mhfExpenseRow .mhfTransaction { padding:5px 6px; border-radius:11px; }.mhfExpenseRow .mhfTransactionMain { grid-template-columns:31px minmax(0,1fr) auto; gap:6px; }.mhfExpenseRow .mhfTransactionIcon { width:31px; height:31px; border-radius:9px; }.mhfExpenseRow .mhfTransactionIcon svg { width:15px; height:15px; }.mhfExpenseRow .mhfTransactionCopy strong { font-size:.73rem; }.mhfExpenseRow .mhfTransactionCopy small { font-size:.6rem; }.mhfExpenseRow .mhfTransactionAmount { gap:2px; }.mhfExpenseRow .mhfTransactionAmount strong { font-size:.7rem; }.mhfExpenseRow .statusBadge { padding:2px 4px; font-size:.5rem; }.mhfExpenseRow .mhfMiniActions { gap:1px; margin-top:2px; }.mhfExpenseRow .mhfMiniActions button { width:27px; height:25px; }.mhfExpenseRow .mhfMiniActions svg { width:14px; height:14px; }
                .mhfCalendarPhotoHero { display:block; min-height:158px; padding:13px 17px 17px; color:#fff; background-position:center; background-size:cover; }.mhfCalendarPhotoHero h1 { margin:4px 0; font-size:1.45rem; }.mhfCalendarPhotoHero p { max-width:290px; margin:0; color:rgba(255,255,255,.88); font-size:.77rem; }.mhfCalendarBack { display:inline-flex; min-height:30px; align-items:center; gap:4px; margin:0 0 7px; border:0; border-radius:8px; padding:4px 7px; color:#fff; background:rgba(4,18,27,.34); font:inherit; font-size:.68rem; font-weight:800; cursor:pointer; }.mhfCalendarBack svg { transform:rotate(180deg); }.mhfCalendarBack:hover { background:rgba(4,18,27,.5); }
                .mhfCalendarTop { align-items:center; justify-content:flex-end; margin:10px 0 8px; }.mhfCalendarTop > div:first-child { display:none; }

                /* Release 2 Expense UAT round 3: one compact action row and dense list rows. */
                .mhfExpenseActionRow { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:6px; align-items:stretch; margin:2px 0 8px; }
                .mhfExpenseActionRow > button { min-height:34px; border:1px solid rgba(97,116,219,.24); border-radius:10px; padding:0 9px; color:inherit; background:rgba(127,140,150,.05); font:inherit; font-size:.67rem; font-weight:800; white-space:nowrap; cursor:pointer; }
                .mhfExpenseActionRow > button.active { color:#fff; border-color:#6174db; background:#6174db; }
                .mhfExpenseActionRow .mhfExpenseAddButton { color:#fff; border-color:#6174db; background:#6174db; }
                .mhfExpenseActionRow .mhfReceiptButton { justify-content:center; min-width:0; padding:0 8px; border-radius:10px; font-size:.65rem; }
                .mhfExpenseRow { grid-template-columns:16px minmax(0,1fr); gap:3px; align-items:center; }
                .mhfExpenseRow > label { display:grid; place-items:center; padding-top:0; }
                .mhfExpenseRow input { width:13px; height:13px; }
                .mhfExpenseRow .mhfExpenseCompactTransaction { display:grid; grid-template-columns:minmax(0,1fr) 27px; align-items:center; gap:3px; min-height:49px; padding:5px 6px; }
                .mhfExpenseRow .mhfExpenseCompactTransaction .mhfTransactionMain { grid-template-columns:29px minmax(0,1fr) auto; gap:6px; min-width:0; }
                .mhfExpenseRow .mhfExpenseCompactTransaction .mhfTransactionIcon { width:29px; height:29px; border-radius:9px; }
                .mhfExpenseRow .mhfExpenseCompactTransaction .mhfTransactionCopy strong { overflow:hidden; font-size:.74rem; text-overflow:ellipsis; white-space:nowrap; }
                .mhfExpenseRow .mhfExpenseCompactTransaction .mhfTransactionCopy small { overflow:hidden; margin-top:1px; font-size:.59rem; line-height:1.1; text-overflow:ellipsis; white-space:nowrap; }
                .mhfExpenseRow .mhfExpenseCompactTransaction .mhfTransactionAmount { gap:1px; }.mhfExpenseRow .mhfExpenseCompactTransaction .mhfTransactionAmount strong { font-size:.71rem; }.mhfExpenseRow .mhfExpenseCompactTransaction .statusBadge { padding:2px 4px; font-size:.49rem; }
                .mhfExpenseRow .mhfExpenseCompactTransaction .mhfMiniActions { margin:0; }.mhfExpenseRow .mhfExpenseCompactTransaction .mhfMiniActions button { width:27px; height:27px; }.mhfExpenseRow .mhfExpenseCompactTransaction .mhfMiniActions svg { width:15px; height:15px; }
                .mhfHomeLists .mhfTransactionList { gap:3px; }.mhfHomeRow { padding:5px 7px; gap:5px; }.mhfHomeRow .mhfTransactionMain { grid-template-columns:30px minmax(0,1fr) auto; gap:6px; }.mhfHomeRow .mhfTransactionIcon { width:30px; height:30px; border-radius:9px; }.mhfHomeRow .mhfMiniActions button { width:24px; height:24px; }

                /* Final Expense polish: explicit stacked bars, compact legend, receipt review. */
                .mhfExpenseSummaryCard { display:grid; grid-template-columns:28px minmax(0,1fr); gap:7px; align-items:center; }.mhfExpenseSummaryCard > div { min-width:0; }.mhfExpenseSummaryCard .mhfSummaryIcon { display:grid; width:28px; height:28px; place-items:center; border-radius:9px; }.mhfExpenseSummaryCard .mhfSummaryIcon svg { stroke:currentColor; fill:none; }.mhfExpenseSummaryCard.budget .mhfSummaryIcon { color:#278b70; background:rgba(69,185,150,.16); }.mhfExpenseSummaryCard.total .mhfSummaryIcon { color:#2d78c6; background:rgba(57,137,223,.15); }.mhfExpenseSummaryCard > div > strong,.mhfExpenseSummaryCard > div > span { display:block; }.mhfExpenseSummaryCard > div > i { display:block; }
                .mhfWeeklyBars .mhfWeeklyStack { display:flex; flex-direction:column-reverse; justify-content:flex-start; overflow:hidden; background:rgba(127,140,150,.14); }.mhfWeeklyBars .mhfWeeklyStack .mhfWeeklySegment { display:block; width:100%; min-height:0; flex-grow:0; flex-shrink:0; border-radius:0; background:none; }.mhfWeeklyBars .mhfWeeklyStack .home { background:#6ed9bd; }.mhfWeeklyBars .mhfWeeklyStack .personal { background:#66b9ef; }.mhfWeeklyBars .mhfWeeklyStack .credit-and-loan { background:#f3c75d; }.mhfWeeklyBars .mhfWeeklyStack .others { background:#f38a93; }
                .mhfWeeklyLegend { display:flex; flex-wrap:wrap; gap:4px 9px; margin-top:8px; }.mhfWeeklyLegend span { display:inline-flex; align-items:center; gap:4px; font-size:.57rem; font-weight:700; white-space:nowrap; opacity:.8; }.mhfWeeklyLegend i { width:7px; height:7px; border-radius:50%; background:currentColor; }.mhfWeeklyLegend .home { color:#278b70; }.mhfWeeklyLegend .personal { color:#3989df; }.mhfWeeklyLegend .credit-and-loan { color:#ba8515; }.mhfWeeklyLegend .others { color:#d85d73; }
                .mhfReceiptInput { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; clip-path:inset(50%); }.mhfReceiptPreviewSheet { display:grid; gap:10px; }.mhfReceiptPreviewSheet > img { width:100%; max-height:280px; object-fit:contain; border-radius:12px; background:rgba(127,140,150,.1); }.mhfReceiptPreviewSheet p,.mhfReceiptPreviewSheet small { margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfReceiptPreviewSheet small { color:var(--text-soft); font-size:.72rem; white-space:normal; line-height:1.35; }.mhfReceiptPreviewActions { display:grid; grid-template-columns:1fr 1fr; gap:7px; }.mhfReceiptPreviewActions .primaryAction { grid-column:1 / -1; }.mhfListCard { overflow-anchor:none; }

                /* Release 2 Income & Savings: compact period, overview, ledger, and records. */
                .mhfIncomePeriod { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:11px 0; }.mhfIncomePeriod .mhfPeriodTrigger { margin:0; font-size:1rem; }
                .mhfMonthlyOverview { margin-bottom:10px; padding:11px; }.mhfMonthlyOverview > div { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; margin-top:6px; }.mhfMonthlyOverview button,.mhfMonthlyOverview > div > div { min-width:0; border:0; border-radius:10px; padding:7px; color:inherit; background:rgba(127,140,150,.07); text-align:left; }.mhfMonthlyOverview button { cursor:pointer; }.mhfMonthlyOverview small,.mhfMonthlyOverview strong,.mhfMonthlyOverview span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfMonthlyOverview small { font-size:.57rem; font-weight:800; letter-spacing:.04em; opacity:.62; text-transform:uppercase; }.mhfMonthlyOverview strong { margin-top:3px; font-size:.83rem; }.mhfMonthlyOverview span { margin-top:2px; font-size:.53rem; opacity:.65; }.mhfMonthlyOverview button:first-child { background:rgba(69,185,150,.11); }.mhfMonthlyOverview button:nth-child(2) { background:rgba(97,116,219,.10); }
                .mhfIncomeWeeklyCard { margin-bottom:8px; padding:10px 11px; }.mhfIncomeWeeklyCard .mhfSectionTitle { margin-bottom:3px; }.mhfIncomeWeeklyCard .mhfWeeklyChart { min-height:70px; height:70px; padding-top:0; }.mhfIncomeWeeklyCard .mhfWeeklyChart > div { gap:2px; }.mhfIncomeWeeklyCard .mhfWeeklyChart small { font-size:.53rem; }.mhfIncomeWeeklyCard .mhfWeeklyChart b { min-height:3px; }
                .mhfIncomeCompactTransaction { display:grid; grid-template-columns:minmax(0,1fr) 27px; align-items:center; gap:3px; min-height:49px; padding:5px 6px; border-radius:11px; }.mhfIncomeCompactTransaction .mhfTransactionMain { grid-template-columns:29px minmax(0,1fr) auto; gap:6px; }.mhfIncomeCompactTransaction .mhfTransactionIcon { width:29px; height:29px; border-radius:9px; }.mhfIncomeCompactTransaction .mhfTransactionCopy strong { font-size:.74rem; }.mhfIncomeCompactTransaction .mhfTransactionCopy small { margin-top:1px; font-size:.59rem; }.mhfIncomeCompactTransaction .mhfTransactionAmount strong { font-size:.72rem; color:#278b70; }.mhfIncomeCompactTransaction .mhfMiniActions { margin:0; }.mhfIncomeCompactTransaction .mhfMiniActions button { width:27px; height:27px; border:0; background:transparent; }.mhfIncomeCompactTransaction .mhfMiniActions svg { width:15px; }
                .mhfSavingsSection { margin:12px 0; }.mhfSavingsSection .mhfSectionTitle { align-items:center; margin-bottom:7px; }.mhfSavingsSection .mhfSectionTitle > strong { font-size:.65rem; color:#278b70; }.mhfSavingsSummaryGrid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }.mhfSavingsSummaryCard { display:grid; grid-template-columns:27px minmax(0,1fr) 15px; align-items:center; gap:6px; min-width:0; border:1px solid rgba(127,140,150,.17); border-radius:12px; padding:8px; color:inherit; background:var(--card-bg,#fff); text-align:left; cursor:pointer; }.mhfSavingsSummaryCard > span { display:grid; width:27px; height:27px; place-items:center; border-radius:8px; color:#278b70; background:rgba(69,185,150,.14); }.mhfSavingsSummaryCard:nth-child(2) > span { color:#6174db; background:rgba(97,116,219,.14); }.mhfSavingsSummaryCard small,.mhfSavingsSummaryCard strong,.mhfSavingsSummaryCard b,.mhfSavingsSummaryCard p { display:block; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfSavingsSummaryCard small { font-size:.5rem; font-weight:800; opacity:.58; }.mhfSavingsSummaryCard strong { font-size:.65rem; }.mhfSavingsSummaryCard b { margin-top:2px; font-size:.6rem; }.mhfSavingsSummaryCard i,.mhfSavingsBalance i { display:block; height:4px; overflow:hidden; margin-top:4px; border-radius:99px; background:rgba(127,140,150,.17); }.mhfSavingsSummaryCard i em,.mhfSavingsBalance i b { display:block; height:100%; border-radius:inherit; background:#45b996; }.mhfSavingsSummaryCard p { margin-top:2px; font-size:.5rem; opacity:.6; }
                .mhfYearlySavings { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; margin:0 0 7px; }.mhfYearlySavings span { min-width:0; padding:6px; border-radius:9px; background:rgba(127,140,150,.06); }.mhfYearlySavings small,.mhfYearlySavings strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfYearlySavings small { font-size:.49rem; font-weight:800; opacity:.6; }.mhfYearlySavings strong { margin-top:2px; font-size:.66rem; }.mhfYearlySavings span:last-child { background:rgba(69,185,150,.11); }
                .mhfIncomeDrillRows { display:grid; gap:6px; margin:13px 0; }.mhfIncomeDrillRows > div { display:grid; grid-template-columns:8px minmax(0,1fr) auto; align-items:center; gap:8px; padding:8px; border-radius:9px; background:rgba(127,140,150,.07); }.mhfIncomeDrillRows > div > span { width:8px; height:8px; border-radius:50%; background:#6174db; }.mhfIncomeDrillRows > div > span.personal { background:#45b996; }.mhfIncomeDrillRows > div > span.home { background:#6174db; }.mhfIncomeDrillRows strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:.78rem; }.mhfIncomeDrillRows b { font-size:.76rem; }.mhfIncomeDrillTotal { display:flex; justify-content:space-between; border-top:1px solid rgba(127,140,150,.18); padding:10px 2px 0; }.mhfSavingsSheet { max-height:min(82vh,680px); overflow:auto; }.mhfSavingsBalance { display:grid; gap:3px; margin:12px 0; padding:10px; border-radius:12px; background:rgba(69,185,150,.10); }.mhfSavingsBalance small { font-size:.65rem; font-weight:800; opacity:.65; text-transform:uppercase; }.mhfSavingsBalance strong { font-size:1.2rem; }.mhfSavingsBalance span { font-size:.7rem; opacity:.7; }.mhfSavingsForm { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:end; gap:7px; }.mhfSavingsForm label,.mhfSavingsContribution label { display:grid; gap:4px; font-size:.7rem; font-weight:800; }.mhfSavingsForm input,.mhfSavingsContribution input,.mhfSavingsContribution select { min-width:0; height:35px; border:1px solid rgba(127,140,150,.25); border-radius:8px; padding:0 8px; color:inherit; background:var(--card-bg,#fff); font:inherit; }.mhfSavingsForm button { min-height:35px; padding:0 9px; }.mhfSavingsContribution { display:grid; gap:7px; margin-top:13px; padding-top:12px; border-top:1px solid rgba(127,140,150,.16); }.mhfSavingsContribution > div { display:grid; grid-template-columns:1fr 1fr; gap:7px; }.mhfSavingsContribution .primaryAction { min-height:37px; }.mhfSavingsHistory { display:grid; gap:3px; margin-top:14px; padding-top:12px; border-top:1px solid rgba(127,140,150,.16); }.mhfSavingsHistory > div { display:flex; justify-content:space-between; gap:12px; padding:4px 2px; font-size:.72rem; }.mhfSavingsHistory > div:first-child { display:grid; gap:2px; padding-bottom:6px; }.mhfSavingsHistory > div:first-child strong { font-size:.77rem; }

                /* Income & Savings UAT: theme-safe controls and compact Add Income action. */
                .mhfAddIncomeButton { min-height:32px; padding:0 9px; border-radius:10px; font-size:.67rem; white-space:nowrap; }
                .mhfSavingsSummaryCard { border-color:var(--border-strong); color:var(--text); background:var(--surface-raised); }.mhfSavingsSummaryCard small { color:var(--text-soft); opacity:1; }.mhfSavingsSummaryCard strong { color:var(--text); }.mhfSavingsSummaryCard b,.mhfSavingsSummaryCard p { color:var(--text-soft); opacity:1; }.mhfSavingsSummaryCard i,.mhfSavingsBalance i { background:var(--border-strong); }
                .mhfSavingsSheet { color:var(--text); background:var(--surface); }.mhfSavingsBalance { color:var(--text); }.mhfSavingsBalance small,.mhfSavingsBalance span { color:var(--text-soft); opacity:1; }.mhfSavingsBalance strong { color:var(--text); }.mhfSavingsForm label,.mhfSavingsContribution label,.mhfSavingsHistory > div,.mhfSavingsHistory > div b,.mhfSavingsHistory > div:first-child strong { color:var(--text); }.mhfSavingsForm input,.mhfSavingsContribution input,.mhfSavingsContribution select { border-color:var(--border-strong); color:var(--text); background:var(--surface-raised); }.mhfSavingsForm input::placeholder,.mhfSavingsContribution input::placeholder { color:var(--text-faint); opacity:1; }.mhfSavingsContribution select option { color:var(--text); background:var(--surface-raised); }.mhfSavingsContribution,.mhfSavingsHistory { border-top-color:var(--border); }

                /* Income overview UAT: one compact monthly summary and weekly view. */
                .mhfIncomeOverview { margin-bottom:10px; padding:10px; }.mhfIncomeOverviewTop { display:grid; grid-template-columns:78px minmax(0,1fr); align-items:center; gap:9px; margin-top:5px; }.mhfIncomeOverviewRing { display:grid; width:78px; height:78px; place-items:center; border-radius:50%; padding:7px; box-sizing:border-box; }.mhfIncomeOverviewRing > div { display:grid; width:100%; height:100%; place-content:center; border-radius:50%; background:var(--surface-raised); text-align:center; }.mhfIncomeOverviewRing strong,.mhfIncomeOverviewRing small { display:block; }.mhfIncomeOverviewRing strong { color:var(--text); font-size:.82rem; }.mhfIncomeOverviewRing small { color:var(--text-soft); font-size:.5rem; font-weight:800; text-transform:uppercase; }.mhfIncomeOverviewStats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px; }.mhfIncomeOverviewStats button,.mhfIncomeOverviewStats > div { min-width:0; min-height:58px; border:0; border-radius:9px; padding:6px; color:var(--text); background:rgba(127,140,150,.07); text-align:left; }.mhfIncomeOverviewStats button { cursor:pointer; }.mhfIncomeOverviewStats button:first-child { background:rgba(69,185,150,.11); }.mhfIncomeOverviewStats button:nth-child(2) { background:rgba(97,116,219,.10); }.mhfIncomeOverviewStats small,.mhfIncomeOverviewStats strong,.mhfIncomeOverviewStats span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfIncomeOverviewStats small { color:var(--text-soft); font-size:.48rem; font-weight:800; text-transform:uppercase; }.mhfIncomeOverviewStats strong { margin-top:2px; color:var(--text); font-size:.72rem; }.mhfIncomeOverviewStats span { margin-top:2px; color:var(--text-soft); font-size:.45rem; }.mhfIncomeOverviewWeeks { margin-top:8px; padding-top:7px; border-top:1px solid var(--border); }.mhfIncomeOverviewWeeks > .eyebrow { display:block; margin-bottom:4px; font-size:.52rem; }.mhfIncomeOverviewWeeks > div { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:4px; }.mhfIncomeOverviewWeeks button { min-width:0; border:0; border-radius:8px; padding:3px 2px 4px; color:var(--text); background:rgba(127,140,150,.06); text-align:center; cursor:pointer; }.mhfIncomeOverviewWeeks button:hover { background:var(--primary-soft); }.mhfIncomeOverviewWeeks i { display:flex; height:34px; align-items:flex-end; justify-content:center; }.mhfIncomeOverviewWeeks i b { display:block; width:min(14px,78%); min-height:2px; border-radius:5px 5px 2px 2px; background:linear-gradient(#71cfae,#45b996); }.mhfIncomeOverviewWeeks strong,.mhfIncomeOverviewWeeks small,.mhfIncomeOverviewWeeks em { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfIncomeOverviewWeeks strong { margin-top:1px; color:var(--text); font-size:.56rem; }.mhfIncomeOverviewWeeks small { color:var(--text-soft); font-size:.43rem; line-height:1.15; }.mhfIncomeOverviewWeeks em { margin-top:1px; color:var(--green); font-size:.46rem; font-style:normal; font-weight:800; }

                /* Next release: Savings destination, automation, and distinct Income week accents. */
                .mhfIncomeOverviewWeeks i b.week-1 { background:linear-gradient(#71cfae,#45b996); }.mhfIncomeOverviewWeeks i b.week-2 { background:linear-gradient(#7aa8ef,#5d83d6); }.mhfIncomeOverviewWeeks i b.week-3 { background:linear-gradient(#e5bd66,#c99236); }.mhfIncomeOverviewWeeks i b.week-4 { background:linear-gradient(#d895d0,#a964a1); }.mhfIncomeOverviewWeeks i b.week-5 { background:linear-gradient(#e28b79,#cb6257); }.mhfIncomeRecordActions { display:flex; align-items:center; gap:5px; }.mhfIncomeCollapse { width:30px; min-height:30px; border:1px solid var(--border-strong); border-radius:9px; color:var(--text); background:var(--surface-raised); font:inherit; cursor:pointer; }.mhfSavingsHero { min-height:154px; }.mhfSavingsPageOverview { margin-bottom:10px; padding:11px; }.mhfSavingsPageOverview > div { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; margin-top:6px; }.mhfSavingsPageOverview > div > span { min-width:0; padding:7px; border-radius:10px; background:rgba(69,185,150,.10); }.mhfSavingsPageOverview small,.mhfSavingsPageOverview strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.mhfSavingsPageOverview small { color:var(--text-soft); font-size:.54rem; font-weight:800; text-transform:uppercase; }.mhfSavingsPageOverview strong { margin-top:3px; color:var(--text); font-size:.78rem; }.mhfSavingsPageSection { margin-top:8px; }.mhfAutomationForm { display:grid; gap:8px; }.mhfAutomationForm > div { display:grid; grid-template-columns:1fr 1fr; gap:7px; }.mhfAutomationForm label { display:grid; gap:4px; color:var(--text); font-size:.72rem; font-weight:800; }.mhfAutomationForm input,.mhfAutomationForm select { min-width:0; height:36px; color:var(--text); background:var(--surface-raised); }.mhfAutomationList { margin-top:10px; }.mhfAutomationList article { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 0; border-top:1px solid var(--border); }.mhfAutomationList article:first-of-type { border-top:0; }.mhfAutomationList strong,.mhfAutomationList small { display:block; }.mhfAutomationList small { color:var(--text-soft); font-size:.66rem; }.mhfAutomationList article > div:last-child { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:4px; }.mhfAutomationList article button { min-height:27px; border:1px solid var(--border-strong); border-radius:8px; padding:0 6px; color:var(--text); background:var(--surface-raised); font:inherit; font-size:.62rem; cursor:pointer; }.mhfAutomationList article button.danger { color:var(--red); }
                .mhfHeroSettings { display:grid; gap:9px; margin-top:10px; }.mhfHeroSettings h2,.mhfHeroSettings p { margin:2px 0; }.mhfHeroSettings p { color:var(--text-soft); font-size:.72rem; line-height:1.4; }.mhfHeroSettingsControls { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }.mhfHeroSettingsControls label { display:grid; gap:3px; color:var(--text); font-size:.67rem; font-weight:800; }.mhfHeroSettingsControls select { min-width:0; height:34px; color:var(--text); background:var(--surface-raised); }.mhfHeroUpload { align-content:end; min-height:34px; border:1px solid var(--border-strong); border-radius:9px; padding:0 8px; color:var(--primary); background:var(--surface-raised); cursor:pointer; }.mhfHeroUpload input { position:absolute; width:1px; height:1px; opacity:0; }.mhfHeroImagePreviews { display:flex; flex-wrap:wrap; gap:7px; }.mhfHeroImagePreviews > div { position:relative; width:76px; }.mhfHeroImagePreviews img { display:block; width:76px; height:52px; border-radius:8px; object-fit:cover; }.mhfHeroImagePreviews button { width:100%; min-height:24px; border:0; color:var(--red); background:transparent; font:inherit; font-size:.59rem; cursor:pointer; }.mhfHeroImagePreviews > small { color:var(--text-soft); font-size:.68rem; }

                /* More/Reports/Settings UAT correction: utility density and resilient hero management. */
                .mhfMoreHeaderCompact { grid-template-columns:auto 40px 1fr; gap:9px; margin-bottom:10px; padding:10px; border-radius:14px; }.mhfMoreHeaderCompact > span { width:40px; height:40px; border-radius:12px; }.mhfMoreHeaderCompact h1 { font-size:1rem; }.mhfMoreHeaderCompact p { margin-top:2px; font-size:.69rem; }.mhfMoreHeaderCompact > button { font-size:.7rem; }
                .mhfReportPeriods { display:flex; align-items:end; gap:7px; }.mhfReportPeriods > div,.mhfReportPeriods > label { display:grid; gap:3px; min-width:0; }.mhfReportPeriods small { color:var(--text-soft); font-size:.53rem; font-weight:800; }.mhfReportPeriods .mhfPeriodTrigger { min-height:32px; padding:0 8px; font-size:.68rem; }.mhfReportPeriods select { width:78px; height:32px; border:1px solid var(--border-strong); border-radius:9px; padding:0 6px; color:var(--text); background:var(--surface-raised); font:inherit; font-weight:800; }
                .mhfMoreHero { min-height:180px; justify-content:flex-end; align-items:flex-start; padding-bottom:16px; }.mhfMoreHero .eyebrow,.mhfMoreHero h1,.mhfMoreHero p { max-width:240px; }.mhfMoreHero h1 { margin:3px 0; font-size:1.15rem; }.mhfMoreHero p { margin:0; padding:4px 7px; border-radius:8px; background:rgba(18,25,22,.38); font-size:.68rem; line-height:1.3; }
                .mhfHeroFeedback { padding:7px 8px; border-radius:8px; color:var(--green); background:var(--green-soft); font-weight:800; }.mhfHeroFeedback.error { color:var(--red); background:var(--red-soft); }.mhfHeroCollectionHeading { display:flex; align-items:center; justify-content:space-between; gap:6px; color:var(--text); font-size:.72rem; }.mhfHeroCollectionHeading > div { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:4px; }.mhfHeroCollectionHeading button,.mhfHeroTextSettings > button { min-height:28px; border:1px solid var(--border-strong); border-radius:8px; padding:0 7px; color:var(--text); background:var(--surface-raised); font:inherit; font-size:.62rem; font-weight:800; cursor:pointer; }.mhfHeroCollectionHeading button:disabled { opacity:.45; cursor:default; }.mhfHeroCollectionHeading button.danger { color:var(--red); }
                .mhfHeroImagePreviews { display:grid; grid-template-columns:repeat(auto-fill,minmax(142px,1fr)); gap:8px; }.mhfHeroImagePreviews > article { display:grid; grid-template-columns:1fr 1fr; gap:5px; padding:6px; border:1px solid var(--border); border-radius:10px; background:var(--surface-soft); }.mhfHeroImagePreviews > article > img { grid-column:1 / -1; width:100%; height:76px; border-radius:7px; object-fit:cover; }.mhfHeroImagePreviews article > div { display:flex; align-items:center; justify-content:space-between; gap:4px; grid-column:1 / -1; }.mhfHeroImagePreviews article strong { color:var(--text); font-size:.56rem; }.mhfHeroImagePreviews article button { width:auto; min-height:22px; padding:0; }.mhfHeroImagePreviews article label { display:grid; gap:2px; color:var(--text-soft); font-size:.52rem; font-weight:800; }.mhfHeroImagePreviews article select { min-width:0; height:27px; border:1px solid var(--border-strong); border-radius:6px; padding:0 3px; color:var(--text); background:var(--surface-raised); font:inherit; font-size:.58rem; }.mhfHeroAspectPreviews { display:grid !important; grid-template-columns:1fr 1.55fr; gap:4px; }.mhfHeroAspectPreviews span { display:grid; min-height:42px; place-items:end start; padding:3px; border-radius:5px; color:#fff; background-size:cover; font-size:.49rem; font-weight:800; }.mhfHeroTextSettings { display:grid; gap:5px; padding-top:8px; border-top:1px solid var(--border); }.mhfHeroTextSettings label { display:grid; gap:3px; color:var(--text); font-size:.67rem; font-weight:800; }.mhfHeroTextSettings input { width:100%; height:34px; border:1px solid var(--border-strong); border-radius:8px; padding:0 8px; color:var(--text); background:var(--surface-raised); font:inherit; }.mhfHeroTextSettings input::placeholder { color:var(--text-faint); opacity:1; }.mhfHeroTextSettings > button { justify-self:start; color:var(--primary); }
                .photoHero,.mhfExpensePhotoHero,.mhfMoreHero { background-size:var(--mhf-hero-desktop-size,cover); background-position:var(--mhf-hero-desktop-position,center); }.mhfAppearance { display:grid; gap:7px; }.mhfAppearance > div { display:flex; gap:5px; }.mhfAppearance button,.mhfHeroEditorTop button,.mhfHeroEditorActions button,.mhfHeroTextStudio button,.mhfHeroStudioImages button { min-height:31px; border:1px solid var(--border-strong); border-radius:9px; padding:0 9px; color:var(--text); background:var(--surface-raised); font:inherit; font-size:.68rem; cursor:pointer; }.mhfAppearance button.active,.mhfHeroEditorTop button.active { color:#fff; border-color:var(--primary); background:var(--primary); }.mhfHeroStudio { display:grid; gap:10px; }.mhfHeroStudio h2,.mhfHeroStudio p { margin:2px 0; }.mhfHeroStudio p,.mhfHeroTextStudio p,.mhfHeroTextStudio small { color:var(--text-soft); font-size:.7rem; line-height:1.4; }.mhfHeroStudioControls { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; }.mhfHeroStudioControls label,.mhfHeroTextStudio label { display:grid; gap:3px; color:var(--text); font-size:.66rem; font-weight:800; }.mhfHeroStudio select,.mhfHeroTextStudio input { min-width:0; height:34px; border:1px solid var(--border-strong); border-radius:8px; padding:0 7px; color:var(--text); background:var(--surface-raised); font:inherit; }.mhfHeroStudioImages { display:grid; gap:7px; padding-top:8px; border-top:1px solid var(--border); }.mhfHeroStudioImages > div:first-child { display:flex; flex-wrap:wrap; align-items:center; gap:5px; }.mhfHeroStudioImages > div:first-child strong { margin-right:auto; font-size:.7rem; }.mhfHeroStudioImages .danger,.mhfHeroEditor .danger { color:var(--red); }.mhfHeroThumbs { display:flex; flex-wrap:wrap; gap:6px; }.mhfHeroThumbs button { width:64px; height:48px; overflow:hidden; padding:0; border-radius:8px; }.mhfHeroThumbs button.selected { outline:2px solid var(--primary); }.mhfHeroThumbs img { width:100%; height:100%; object-fit:cover; }.mhfHeroThumbs small { color:var(--text-soft); font-size:.67rem; }.mhfHeroEditor { display:grid; gap:8px; padding-top:9px; border-top:1px solid var(--border); }.mhfHeroEditorTop,.mhfHeroEditorTop > div,.mhfHeroEditorActions { display:flex; align-items:center; flex-wrap:wrap; gap:5px; }.mhfHeroEditorTop { justify-content:space-between; font-size:.72rem; }.mhfHeroCanvas { position:relative; overflow:hidden; min-height:150px; border-radius:13px; background-repeat:no-repeat; background-color:var(--surface-soft); touch-action:none; cursor:grab; }.mhfHeroCanvas.desktop { min-height:118px; }.mhfHeroCanvas:active { cursor:grabbing; }.mhfHeroCanvas > div { position:absolute; left:10px; bottom:10px; max-width:72%; padding:5px 7px; border-radius:7px; color:#fff; background:rgba(13,20,18,.48); }.mhfHeroCanvas strong,.mhfHeroCanvas small { display:block; }.mhfHeroCanvas strong { font-size:.78rem; }.mhfHeroCanvas small { margin-top:2px; font-size:.58rem; }.mhfHeroZoom { display:grid; grid-template-columns:30px 1fr 30px; gap:6px; align-items:center; }.mhfHeroZoom button { height:30px; border:1px solid var(--border-strong); border-radius:8px; color:var(--text); background:var(--surface-raised); cursor:pointer; }.mhfHeroZoom input { accent-color:var(--primary); }.mhfHeroTextStudio { display:grid; gap:6px; padding-top:9px; border-top:1px solid var(--border); }.mhfHeroTextStudio > div { display:flex; flex-wrap:wrap; gap:5px; }.mhfFilteredExport { display:grid; gap:7px; margin:10px 0; }.mhfFilteredExport h2,.mhfFilteredExport p { margin:0; }.mhfFilteredExport p { color:var(--text-soft); font-size:.7rem; }.mhfFilteredExport > div { display:flex; flex-wrap:wrap; gap:8px; }.mhfExportPeriod label,.mhfSelectiveReset label { display:grid; gap:3px; color:var(--text); font-size:.68rem; font-weight:800; }.mhfExportPeriod select,.mhfSelectiveReset select { height:34px; border:1px solid var(--border-strong); border-radius:8px; color:var(--text); background:var(--surface-raised); }.mhfSelectiveReset { display:grid; gap:8px; }.mhfResetReview { display:grid; gap:5px; padding:9px; border-radius:10px; color:var(--text); background:var(--red-soft); }.mhfResetReview > div { display:flex; gap:6px; }.mhfResetReview button.danger { color:var(--red); }

                @media (max-width:760px) {
                    .photoHero,.mhfExpensePhotoHero,.mhfMoreHero { background-size:var(--mhf-hero-mobile-size,cover); background-position:var(--mhf-hero-mobile-position,center); }
                    .mhfHomeToolbar { display:flex; width:100%; align-items:center; flex-direction:row; justify-content:space-between; }
                    .mhfHomeLists { grid-template-columns:1fr; }
                }

                @media (max-width:390px) {
                    .photoHero,.mhfExpensePhotoHero,.mhfMoreHero { background-size:var(--mhf-hero-mobile-size,cover); background-position:var(--mhf-hero-mobile-position,center); }
                    .mhfExpenseActionRow { gap:4px; }.mhfExpenseActionRow > button { padding:0 7px; font-size:.61rem; }.mhfExpenseActionRow .mhfReceiptButton span { display:none; }
                    .bottomNav { width:calc(100% - 14px); }
                    .bottomNav button small { font-size:8px; }
                    .mhfCategoryDonut { width:108px; height:108px; flex-basis:108px; padding:12px; }
                    .mhfMonthlyOverview { padding:9px; }.mhfMonthlyOverview > div { gap:3px; }.mhfMonthlyOverview button,.mhfMonthlyOverview > div > div { padding:6px 5px; }.mhfMonthlyOverview strong { font-size:.73rem; }.mhfSavingsSummaryCard { grid-template-columns:24px minmax(0,1fr) 12px; padding:6px; }.mhfSavingsSummaryCard > span { width:24px; height:24px; }
                    .mhfIncomeOverview { padding:9px; }.mhfIncomeOverviewTop { grid-template-columns:70px minmax(0,1fr); gap:7px; }.mhfIncomeOverviewRing { width:70px; height:70px; }.mhfIncomeOverviewStats { gap:3px; }.mhfIncomeOverviewStats button,.mhfIncomeOverviewStats > div { min-height:54px; padding:5px 4px; }.mhfIncomeOverviewStats strong { font-size:.66rem; }.mhfIncomeOverviewWeeks > div { gap:3px; }.mhfIncomeOverviewWeeks i { height:31px; }.mhfIncomeOverviewWeeks small { font-size:.4rem; }.mhfIncomeOverviewWeeks em { font-size:.43rem; }
                }
                `}
            </style>

            <style>{`
                .mhfHeroCanvas.desktop { width:min(100%,760px); min-height:220px; margin:0 auto; }
                .mhfHeroCanvas > div.mhfHeroTextPosition--center { right:10px; left:10px; margin:auto; text-align:center; }
                .mhfHeroCanvas > div.mhfHeroTextPosition--right { right:10px; left:auto; text-align:right; }
                .heroCopy.mhfHeroTextPosition--desktop-center { margin-left:auto; margin-right:auto; text-align:center; }
                .heroCopy.mhfHeroTextPosition--desktop-right { margin-left:auto; text-align:right; }
                .mhfUtilityAction { width:100%; display:grid; grid-template-columns:34px minmax(0,1fr) auto; align-items:center; gap:8px; margin-top:8px; border:1px solid var(--border); color:var(--text); text-align:left; cursor:pointer; }
                .mhfUtilityAction > span { display:grid; width:34px; height:34px; place-items:center; border-radius:10px; color:var(--primary); background:var(--primary-soft); }
                .mhfUtilityAction strong,.mhfUtilityAction small { display:block; }.mhfUtilityAction small { margin-top:2px; color:var(--text-soft); font-size:.68rem; }
                .mhfBackupWorkflow { display:grid; gap:7px; margin-bottom:9px; }.mhfBackupWorkflow h2,.mhfBackupWorkflow p { margin:0; }.mhfBackupWorkflow p { color:var(--text-soft); font-size:.72rem; line-height:1.4; }.mhfBackupScope { display:flex; flex-wrap:wrap; gap:9px; font-size:.72rem; }
                .mhfResetActions { display:grid; gap:7px; margin-top:8px; }.mhfResetAction { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:2px 8px; padding:9px; border:1px solid var(--border-strong); border-radius:11px; color:var(--text); background:var(--surface-soft); text-align:left; font:inherit; cursor:pointer; }.mhfResetAction strong { font-size:.76rem; }.mhfResetAction small { color:var(--text-soft); font-size:.65rem; }.mhfResetAction span { grid-row:1 / 3; grid-column:2; align-self:center; }.mhfResetAction.danger { border-color:rgba(216,95,103,.35); color:var(--red); background:var(--red-soft); }.mhfResetAction.danger small { color:inherit; opacity:.8; }
                .mhfHeroFrameActions { display:flex; flex-wrap:wrap; gap:6px; }.mhfHeroFrameActions button { min-height:31px; border:1px solid var(--border-strong); border-radius:9px; padding:0 9px; color:var(--text); background:var(--surface-raised); font:inherit; font-size:.68rem; cursor:pointer; }
                .photoHero,.mhfExpensePhotoHero,.mhfMoreHero,.mhfCalendarPhotoHero { background-repeat:no-repeat; }
                .heroCopy.mhfHeroTextSize--desktop-small p { font-size:.78rem; }.heroCopy.mhfHeroTextSize--desktop-medium p { font-size:1rem; }.heroCopy.mhfHeroTextSize--desktop-large p { font-size:1.2rem; }
                /* Final UAT round 1: give the image frames more useful vertical room. */
                .photoHero { min-height:260px; }.homeHero { min-height:270px; }.mhfExpensePhotoHero { min-height:250px; }.mhfSavingsHero { min-height:250px; }.mhfMoreHero { min-height:250px; }
                .mhfCalendarPhotoHero { min-height:235px; background-size:var(--mhf-hero-desktop-size,cover); background-position:var(--mhf-hero-desktop-position,center); }
                .mhfCalendarCard { min-width:0; overflow:hidden; }.mhfWeekdays,.mhfCalendarGrid { width:100%; min-width:0; grid-template-columns:repeat(7,minmax(0,1fr)); }.mhfCalendarGrid button,.mhfCalendarBlank { min-width:0; }
                .mhfCalendarStatusChips { gap:6px; margin:2px 0 10px; }.mhfCalendarStatusChips button { display:inline-flex; align-items:center; gap:4px; min-height:28px; min-width:0; border:1px solid var(--border-strong); border-radius:999px; padding:0 8px; color:var(--text); background:var(--surface-soft); font:inherit; font-size:.66rem; font-weight:800; cursor:pointer; }.mhfCalendarStatusChips button.active { box-shadow:inset 0 0 0 1px currentColor; background:var(--surface-raised); }.mhfCalendarStatusChips button.due { color:#3682be; }.mhfCalendarStatusChips button.upcoming { color:#a47518; }.mhfCalendarStatusChips button.overdue { color:#d85f67; }
                .mhfCalendarSavingsActivity { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px; border:1px solid var(--border); border-radius:10px; color:var(--text); background:var(--surface-soft); }.mhfCalendarSavingsActivity strong,.mhfCalendarSavingsActivity small { display:block; }.mhfCalendarSavingsActivity small { margin-top:2px; color:var(--text-soft); font-size:.66rem; }.mhfCalendarSavingsActivity b { color:var(--green); font-size:.78rem; }.mhfCalendarDots .savings { background:#45b996; }
                /* Final Home UAT round 2: neutral Fit surface and compact mobile-first analytics. */
                .photoHero,.mhfCalendarPhotoHero { background-color:var(--surface-soft); }
                .mhfHeroRatioHint { display:block; margin-top:5px; color:var(--text-soft); font-size:.66rem; line-height:1.35; }
                .homeHero,.mhfMetricStrip,.mhfHomeAnalysis,.mhfHomeToolbar,.mhfTodayExpense,.mhfHomeLists { max-width:680px; margin-left:auto; margin-right:auto; }
                .mhfAnnualChartCard { padding:12px; }.mhfAnnualChartCard .mhfSectionTitle { margin-bottom:7px; }.mhfAnnualChartCard .mhfSectionTitle h2 { font-size:1rem; }.mhfChartLegend { gap:9px; font-size:.66rem; }.mhfChartLegend i { width:8px; height:8px; }
                .mhfCashFlowViewport { width:100%; overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:thin; padding:4px 0 2px; }.mhfCashFlowBars { width:max-content; min-width:100%; display:grid; grid-template-columns:repeat(12,58px); gap:5px; align-items:end; }.mhfCashFlowBars button { display:grid; grid-template-rows:86px auto; gap:5px; min-width:0; border:0; border-radius:9px; padding:4px 3px; color:var(--text-soft); background:transparent; font:inherit; cursor:pointer; }.mhfCashFlowBars button.selected { color:var(--text); background:var(--primary-soft); }.mhfCashFlowBarGroup { height:86px; display:flex; align-items:end; justify-content:center; gap:3px; border-bottom:1px solid var(--border-strong); }.mhfCashFlowBarGroup i { width:11px; min-height:3px; border-radius:4px 4px 1px 1px; }.mhfCashFlowBarGroup i.income { background:var(--green); }.mhfCashFlowBarGroup i.expense { background:var(--blue); }.mhfCashFlowBarGroup i.available { background:var(--secondary); }.mhfCashFlowBarGroup i.available.negative { background:var(--red); }.mhfCashFlowBars small { overflow:hidden; color:inherit; font-size:.61rem; font-weight:800; text-align:center; text-overflow:ellipsis; white-space:nowrap; }.mhfChartTooltip { margin-top:6px; padding:6px 7px; }.mhfChartTooltip small { font-size:.57rem; }.mhfChartTooltip strong { font-size:.72rem; }
                .mhfCategoryCard { padding:12px; }.mhfCategoryCard .mhfSectionTitle { margin-bottom:7px; }.mhfCategoryCard .mhfSectionTitle h2 { font-size:1rem; }.mhfCategoryContent { gap:10px; align-items:center; }.mhfCategoryDonut { width:116px; height:116px; flex:0 0 116px; padding:12px; }.mhfCategoryDonutInner strong { font-size:.76rem; }.mhfCategoryDonutInner small { font-size:.59rem; }.mhfCategoryLegend { min-width:0; gap:0; }.mhfCategoryLegend button { grid-template-columns:7px minmax(0,1fr) auto; gap:5px; padding:3px 0; }.mhfCategoryLegend button::before { display:none; }.mhfCategoryLegend button > span:nth-child(2) { min-width:0; gap:4px; }.mhfCategoryLegend button strong { overflow:hidden; font-size:.63rem; text-overflow:ellipsis; white-space:nowrap; }.mhfCategoryLegend button small { font-size:.58rem; }.mhfCategoryLegend button b { font-size:.64rem; }
                .mhfTodayExpense { display:block; margin:0 auto 10px; padding:0; overflow:hidden; border:1px solid var(--border-strong); border-radius:13px; color:var(--text); background:var(--surface-soft); }.mhfTodayExpenseTrigger { width:100%; display:flex; align-items:center; gap:9px; min-height:52px; border:0; padding:8px 10px; color:inherit; background:transparent; font:inherit; text-align:left; cursor:pointer; }.mhfTodayExpenseGauge { width:29px; height:29px; flex-basis:29px; background:conic-gradient(var(--green) 0 72%,var(--mhf-track) 72% 100%); }.mhfTodayExpenseGauge i { width:19px; height:19px; background:var(--surface-soft); }.mhfTodayExpenseChevron { margin-left:auto; color:var(--primary); font-size:1.15rem; font-weight:900; transition:transform .16s ease; }.mhfTodayExpense.open .mhfTodayExpenseChevron { transform:rotate(180deg); }.mhfTodayExpenseRecords { padding:0 9px 9px; border-top:1px solid var(--border); }.mhfTodayExpenseRecords .mhfTransactionList { margin-top:8px; gap:5px; }
                .mhfHomeCalendarCard { padding:11px 12px; }.mhfHomeCalendarCard .mhfCalendarTop { margin:2px 0 6px; }.mhfHomeCalendarCard .mhfCalendarStatusChips { margin:0 0 7px; gap:4px; }.mhfCalendarStatusChips button { min-height:26px; padding:0 6px; color:var(--text); background:transparent; font-size:.62rem; font-weight:750; }.mhfCalendarStatusChips button.active { color:var(--text); border-color:var(--border-strong); background:var(--surface-soft); box-shadow:none; }.mhfCalendarStatusChips button i { width:6px; height:6px; }.mhfCalendarStatusChips button.due i { background:var(--blue); }.mhfCalendarStatusChips button.upcoming i { background:var(--orange); }.mhfCalendarStatusChips button.overdue i { background:var(--red); }
                /* US-UI-UAT-003 shared visual contract. */
                .hero,.mhfExpensePhotoHero,.mhfCalendarPhotoHero { overflow:hidden; border-color:var(--border-strong); background-color:var(--surface-soft); background-blend-mode:normal; }.photoHero,.mhfExpensePhotoHero,.mhfMoreHero,.mhfCalendarPhotoHero { background-image:var(--mhf-hero-image,none); background-repeat:no-repeat; }
                .hero::after { background:linear-gradient(90deg,rgba(0,0,0,.10),transparent 64%); }.mhfMoreHero p,.mhfHeroCanvas > div { background:rgba(0,0,0,.34); }
                .mhfMoreHeaderCompact { min-height:0; padding:8px 9px; border-color:var(--border); background:var(--surface-soft); }.mhfMoreHeaderCompact > span { width:34px; height:34px; border-radius:10px; }.mhfMoreHeaderCompact h1 { font-size:.93rem; }.mhfMoreHeaderCompact p { font-size:.64rem; }
                .bottomNav { grid-template-columns:repeat(6,minmax(0,1fr)); justify-items:stretch; column-gap:0; padding-left:6px; padding-right:6px; }.bottomNav button { min-width:0; justify-self:stretch; align-items:center; }.bottomNav .mhfQuickExpense { justify-self:stretch; }.bottomNav .mhfQuickExpense span { margin-left:auto; margin-right:auto; }
                .mhfCalendarStatusChips button.due,.mhfCalendarStatusChips button.upcoming,.mhfCalendarStatusChips button.overdue { color:var(--text); }.mhfCalendarStatusChips button.active.due { border-color:color-mix(in srgb,var(--blue) 45%,var(--border-strong)); }.mhfCalendarStatusChips button.active.upcoming { border-color:color-mix(in srgb,var(--orange) 45%,var(--border-strong)); }.mhfCalendarStatusChips button.active.overdue { border-color:color-mix(in srgb,var(--red) 45%,var(--border-strong)); }
                .mhfHeroTitle.mhfHeroTextPosition--desktop-center,.mhfHeroSubtitle.mhfHeroTextPosition--desktop-center { text-align:center; }.mhfHeroTitle.mhfHeroTextPosition--desktop-right,.mhfHeroSubtitle.mhfHeroTextPosition--desktop-right { text-align:right; }.mhfHeroTitle.mhfHeroTextSize--desktop-small { font-size:1.15rem; }.mhfHeroTitle.mhfHeroTextSize--desktop-medium { font-size:inherit; }.mhfHeroTitle.mhfHeroTextSize--desktop-large { font-size:1.35em; }.mhfHeroSubtitle.mhfHeroTextSize--desktop-small { font-size:.76rem; }.mhfHeroSubtitle.mhfHeroTextSize--desktop-medium { font-size:inherit; }.mhfHeroSubtitle.mhfHeroTextSize--desktop-large { font-size:1.15em; }
                /* UAT-004 mobile workflow refinements. */
                .bottomNav { grid-template-columns:repeat(6,minmax(0,1fr)); }.bottomNav > button { display:flex; flex-direction:column; justify-content:center; align-items:center; }.bottomNav > .mhfQuickExpense { display:grid; grid-template-rows:44px auto; justify-items:center; align-content:center; }.bottomNav > .mhfQuickExpense span { justify-self:center; margin-left:0; margin-right:0; }
                .mhfHomeCurrentPeriod { display:block; margin-top:3px; color:var(--text); font-size:1rem; }
                .mhfExpenseActionRow { grid-template-columns:minmax(0,1fr) minmax(0,1fr); }.mhfExpenseActionRow > button { justify-content:center; }.mhfSelectAllExpenses { display:inline-flex; align-items:center; gap:5px; margin-left:auto; color:var(--text-soft); font-size:.66rem; font-weight:800; white-space:nowrap; }.mhfSelectAllExpenses input { accent-color:var(--primary); }
                .mhfGroupsCard { overflow-anchor:none; }.mhfExpenseFilterTabs { min-height:39px; }
                .mhfCalendarStatusChips button.activity i { background:var(--primary); }.mhfCalendarActivityFilters,.mhfRecurringFilters { display:flex; flex-wrap:wrap; gap:5px; margin:0 0 8px; }.mhfCalendarActivityFilters button,.mhfRecurringFilters button { min-height:27px; border:1px solid var(--border-strong); border-radius:999px; padding:0 8px; color:var(--text); background:var(--surface-soft); font:inherit; font-size:.62rem; font-weight:800; cursor:pointer; }.mhfCalendarActivityFilters button.active,.mhfRecurringFilters button.active { color:#fff; border-color:var(--primary); background:var(--primary); }
                .mhfRecurringSchedule { margin:0; color:var(--text-soft); font-size:.66rem; line-height:1.35; }
                /* UAT-004-CORRECTION-01: theme-safe workflow controls and readable recurring schedules. */
                .mhfCopySheet { color:var(--text); background:var(--surface); }.mhfCopySheet label { color:var(--text); }.mhfCopySheet select { width:100%; min-height:42px; border:1px solid var(--border-strong); color:var(--text); background:var(--surface-raised); color-scheme:light dark; }.mhfCopySheet select option { color:var(--text); background:var(--surface-raised); }.mhfCopySheet select:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }.mhfCopySheet select:disabled { color:var(--text-faint); background:var(--surface-soft); opacity:.68; }
                .mhfRecurringPreview { display:grid; gap:3px; padding:10px; border:1px solid var(--border-strong); border-radius:11px; color:var(--text); background:var(--surface-soft); }.mhfRecurringPreview > strong { font-size:.82rem; }.mhfRecurringPreview > b { color:var(--primary); font-size:.9rem; }.mhfRecurringPreview p,.mhfRecurringPreview small,.mhfRecurringPreview em { margin:0; color:var(--text-soft); font-size:.67rem; font-style:normal; line-height:1.4; }.mhfRecurringPreview em { color:var(--text-faint); font-size:.61rem; }
                .mhfAutomationList .mhfRecurringRule { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:start; gap:9px; padding:10px 0; }.mhfRecurringRuleCopy { min-width:0; }.mhfRecurringRuleCopy > strong,.mhfRecurringRuleCopy > b { display:block; }.mhfRecurringRuleCopy > strong { margin-top:3px; font-size:.84rem; }.mhfRecurringRuleCopy > b { margin-top:2px; color:var(--primary); font-size:.82rem; }.mhfRecurringRuleCopy dl { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px 10px; margin:8px 0 0; }.mhfRecurringRuleCopy dl div { min-width:0; }.mhfRecurringRuleCopy dt { color:var(--text-faint); font-size:.52rem; font-weight:850; letter-spacing:.04em; text-transform:uppercase; }.mhfRecurringRuleCopy dd { overflow:hidden; margin:1px 0 0; color:var(--text-soft); font-size:.64rem; text-overflow:ellipsis; white-space:nowrap; }.mhfAutomationList .mhfRecurringRule > div:last-child { display:flex; flex-direction:column; align-items:stretch; gap:4px; }.mhfAutomationList .mhfRecurringRule > div:last-child button { min-width:54px; }
                @media (max-width:390px) { .mhfAutomationList .mhfRecurringRule { grid-template-columns:minmax(0,1fr); }.mhfAutomationList .mhfRecurringRule > div:last-child { flex-direction:row; justify-content:flex-start; }.mhfRecurringRuleCopy dl { gap:4px 7px; } }
                @media (max-width:760px) { .mhfHeroCanvas.desktop { min-height:170px; }.mhfHeroStudioControls { grid-template-columns:repeat(2,minmax(0,1fr)); }.photoHero { min-height:225px; }.homeHero { min-height:235px; }.mhfExpensePhotoHero,.mhfSavingsHero,.mhfMoreHero { min-height:225px; }.mhfCalendarPhotoHero { min-height:215px; padding-bottom:20px; background-size:var(--mhf-hero-mobile-size,cover); background-position:var(--mhf-hero-mobile-position,center); }.mhfCalendarCard { padding:12px; }.mhfWeekdays,.mhfCalendarGrid { gap:3px; }.mhfCalendarGrid button,.mhfCalendarBlank { min-height:0; aspect-ratio:1 / 1; padding:4px; }.mhfCalendarGrid button strong { font-size:.72rem; }.mhfWeekdays span { min-width:0; font-size:.55rem; }.mhfCalendarDots { left:4px; bottom:4px; gap:2px; }.mhfCalendarDots i { width:5px; height:5px; }.mhfCalendarStatusChips { justify-content:space-between; gap:4px; }.mhfCalendarStatusChips button { flex:1 1 0; justify-content:center; padding:0 4px; font-size:.59rem; white-space:nowrap; }.mhfHeroTitle.mhfHeroTextPosition--mobile-center,.mhfHeroSubtitle.mhfHeroTextPosition--mobile-center { display:block; text-align:center; }.mhfHeroTitle.mhfHeroTextPosition--mobile-right,.mhfHeroSubtitle.mhfHeroTextPosition--mobile-right { display:block; text-align:right; }.mhfHeroTitle.mhfHeroTextSize--mobile-small { font-size:1.05rem; }.mhfHeroTitle.mhfHeroTextSize--mobile-large { font-size:1.28em; }.mhfHeroSubtitle.mhfHeroTextSize--mobile-small { font-size:.72rem; }.mhfHeroSubtitle.mhfHeroTextSize--mobile-large { font-size:1.05rem; } }
            `}</style>

            <main className="workspace">
                <header className="top">
                    <button
                        type="button"
                        className="brandName"
                        onClick={() => {
                            setCurrentFinancialPeriod();
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

                    {page === 'Home' && (
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
                                <small>FINANCE</small>

                                <strong>
                                    {shortDate(
                                        todayString
                                    )}
                                </strong>
                            </span>

                            <span className="headerCalendarChevron" aria-hidden="true">
                                <svg viewBox="0 0 16 16" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
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
                    'Savings' && (
                        <SavingsPage />
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
                        setCurrentFinancialPeriod();
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
                        setCurrentFinancialPeriod();
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
                    className="mhfQuickExpense"
                    aria-label="Quick Expense"
                    onClick={() => addExpense()}
                >
                    <span>+</span>
                    <small>Quick</small>
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
                        setCurrentFinancialPeriod();
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
                        Income
                    </small>
                </button>

                <button
                    type="button"
                    className={page === 'Savings' ? 'active' : ''}
                    onClick={() => {
                        setCurrentFinancialPeriod();
                        setPage('Savings');
                        setMoreView('Menu');
                    }}
                >
                    <span><Icon name="bank" size={21} /></span>
                    <small>Savings</small>
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
                        setCurrentFinancialPeriod();
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
                    receiptPreview={modalKind === 'expense' ? receiptPhoto : null}
                    onRemoveReceipt={clearReceiptPhoto}
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
                        clearReceiptPhoto();
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
                        clearReceiptPhoto();

                        setExpenseFilter(
                            'All'
                        );

                        void load();
                    }}
                />
            )}

            <TransactionDetailsModal />

            {BudgetPopup()}

            {CategoryBudgetPopup()}
        </div>
    );
}
