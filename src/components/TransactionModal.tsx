import {
    FormEvent,
    useMemo,
    useState
} from 'react';

import {
    addTransaction,
    ExpenseGroup,
    localDateString,
    Transaction,
    updateTransaction
} from '../lib/data';


const groups: ExpenseGroup[] = [
    'Home',
    'Personal',
    'Credit & Loan',
    'Others'
];


const defaultCategories:
    Record<ExpenseGroup, string[]> = {

    Home: [
        'Mortgage',
        'Rent',
        'Property Tax',
        'Home Insurance',
        'Dominion Electricity',
        'Electricity',
        'Loudoun Water',
        'Water',
        'American Disposal / Trash',
        'Trash / Disposal',
        'Internet',
        'Phone',
        'Home Maintenance',
        'Home Improvement',
        'HVAC',
        'Plumbing',
        'Electrical Repair',
        'Lawn / Yard',
        'Pest Control',
        'Security System',
        'Appliances',
        'Furniture',
        'HOA',
        'Other Home Expense'
    ],

    Personal: [
        'Car Payment',
        'Car Insurance',
        'Gas',
        'Parking',
        'Tolls',
        'Groceries',
        'Shopping',
        'Travel',
        'Dining Out',
        'Coffee',
        'Medical',
        'Dental',
        'Vision',
        'Health Insurance',
        'Personal Care',
        'Entertainment',
        'Subscriptions',
        'Gym / Fitness',
        'Education',
        'Clothing',
        'Gift',
        'Other Personal Expense'
    ],

    'Credit & Loan': [
        'Wells Fargo',
        'American Express',
        'Capital One',
        'Discover AP',
        'Discover AUP',
        "Macy's",
        'Klarna',
        'Affirm',
        'TapTap',
        'Car Loan',
        'Personal Loan',
        'Student Loan',
        'Other Credit Card',
        'Other Loan / Debt'
    ],

    Others: [
        'Coffee',
        'Parking',
        'Uber / Lyft',
        'One-off Purchase',
        'Gift',
        'Donation',
        'Fees',
        'Cash Expense',
        'Subscription',
        'Miscellaneous',
        'Other'
    ]
};


const incomeSources = [
    'Salary',
    'Bonus',
    'Uber',
    'Lyft',
    'Freelance',
    'Refund',
    'Cash Income',
    'Investment Income',
    'Interest',
    'Other Income'
];

const compactDateMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

type CompactDatePickerProps = {
    value: string;
    onChange: (value: string) => void;
    allowEmpty?: boolean;
    label: string;
};

function CompactDatePicker({ value, onChange, allowEmpty = false, label }: CompactDatePickerProps) {
    const today = new Date();
    const [rawYear, rawMonth, rawDay] = value.split('-').map(Number);
    const year = Number.isInteger(rawYear) ? rawYear : today.getFullYear();
    const month = Number.isInteger(rawMonth) ? rawMonth : today.getMonth() + 1;
    const day = Number.isInteger(rawDay) ? rawDay : today.getDate();
    const setDate = (nextYear: number, nextMonth: number, nextDay: number) => {
        const maxDay = new Date(nextYear, nextMonth, 0).getDate();
        const safeDay = Math.min(Math.max(1, nextDay), maxDay);
        onChange(`${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`);
    };

    if (allowEmpty && !value) {
        return <button type="button" className="compactDateEmpty" onClick={() => setDate(today.getFullYear(), today.getMonth() + 1, today.getDate())}>Add due date</button>;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    return <div className="compactDatePicker" aria-label={label}>
        <select aria-label={`${label} month`} value={month} onChange={event => setDate(year, Number(event.target.value), day)}>
            {compactDateMonths.map((name, index) => <option key={name} value={index + 1}>{name.slice(0, 3)}</option>)}
        </select>
        <select aria-label={`${label} day`} value={Math.min(day, daysInMonth)} onChange={event => setDate(year, month, Number(event.target.value))}>
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label={`${label} year`} value={year} onChange={event => setDate(Number(event.target.value), month, day)}>
            {Array.from({ length: 35 }, (_, index) => 2016 + index).map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        {allowEmpty && <button type="button" className="compactDateClear" aria-label={`Clear ${label}`} onClick={() => onChange('')}>×</button>}
    </div>;
}


const expensePaymentMethods = [
    'Cash',
    'Visa',
    'Mastercard',
    'American Express',
    'Discover',
    'Debit Card',
    'Credit Card',
    'Checking Account',
    'Bank Transfer',
    'Apple Pay',
    'Google Pay',
    'Other'
];


const incomeReceiveMethods = [
    'Direct Deposit',
    'Cash',
    'Check',
    'Bank Transfer',
    'Zelle',
    'PayPal',
    'Venmo',
    'Other'
];


const incomeDepositAccounts = [
    'Checking Account',
    'Savings Account',
    'Cash',
    'Investment Account',
    'Other'
];


const oldGroupMap:
    Record<string, ExpenseGroup> = {

    'Home Expenses':
        'Home',

    'Credit Card / Debt':
        'Credit & Loan',

    'Everyday / Misc':
        'Others'
};


const CUSTOM_CATEGORY_KEY =
    'mhf-v27-custom-categories';


type CustomCategories =
    Record<ExpenseGroup, string[]>;


function emptyCustomCategories():
    CustomCategories {

    return {
        Home: [],
        Personal: [],
        'Credit & Loan': [],
        Others: []
    };
}


function loadCustomCategories():
    CustomCategories {

    try {

        const saved =
            localStorage.getItem(
                CUSTOM_CATEGORY_KEY
            );


        if (!saved) {
            return emptyCustomCategories();
        }


        const parsed =
            JSON.parse(
                saved
            );


        return {
            Home:
                Array.isArray(
                    parsed?.Home
                )
                    ? parsed.Home
                    : [],

            Personal:
                Array.isArray(
                    parsed?.Personal
                )
                    ? parsed.Personal
                    : [],

            'Credit & Loan':
                Array.isArray(
                    parsed?.['Credit & Loan']
                )
                    ? parsed['Credit & Loan']
                    : [],

            Others:
                Array.isArray(
                    parsed?.Others
                )
                    ? parsed.Others
                    : []
        };

    } catch {

        return emptyCustomCategories();
    }
}


function saveCustomCategories(
    categories: CustomCategories
) {

    localStorage.setItem(
        CUSTOM_CATEGORY_KEY,
        JSON.stringify(
            categories
        )
    );
}


function isExpenseGroup(
    value: string
): value is ExpenseGroup {

    return groups.includes(
        value as ExpenseGroup
    );
}


function groupIcon(
    group: ExpenseGroup
) {

    switch (group) {

        case 'Home':
            return '⌂';

        case 'Personal':
            return '●';

        case 'Credit & Loan':
            return '$';

        case 'Others':
            return '+';
    }
}


function paymentIcon(
    method: string
) {

    switch (method) {

        case 'Cash':
            return '$';

        case 'Visa':
        case 'Mastercard':
        case 'American Express':
        case 'Discover':
        case 'Debit Card':
        case 'Credit Card':
            return '▣';

        case 'Checking Account':
        case 'Bank Transfer':
            return '⌂';

        case 'Apple Pay':
        case 'Google Pay':
            return '◉';

        default:
            return '•';
    }
}


function incomeMethodIcon(
    method: string
) {

    switch (method) {

        case 'Direct Deposit':
            return '↓';

        case 'Cash':
            return '$';

        case 'Check':
            return '✓';

        case 'Bank Transfer':
            return '↔';

        case 'Zelle':
        case 'PayPal':
        case 'Venmo':
            return '◉';

        default:
            return '•';
    }
}


export default function TransactionModal({
                                             kind,
                                             initial,
                                             initialGroup: requestedInitialGroup,
                                             receiptPreview,
                                             onRemoveReceipt,
                                             onClose,
                                             onSaved
                                         }: {
    kind: 'income' | 'expense';
    initial?: Transaction;
    initialGroup?: ExpenseGroup | null;
    receiptPreview?: { name: string; previewUrl: string } | null;
    onRemoveReceipt?: () => void;
    onClose: () => void;
    onSaved: () => void;
}) {

    const mappedInitialGroup =
        oldGroupMap[
        initial?.group_name || ''
            ] ||
        initial?.group_name ||
        '';


    const storedInitialGroup =
        isExpenseGroup(
            mappedInitialGroup
        )
            ? mappedInitialGroup
            : '';


    const initialExpenseGroup =
        storedInitialGroup ||
        requestedInitialGroup ||
        '';


    /*
     * Existing Transaction data model:
     *
     * Expense
     * merchant       = merchant
     * payment_method = payment method
     *
     * Income
     * merchant       = deposited-to account
     * payment_method = received-via method
     *
     * This keeps the current localStorage schema compatible while
     * presenting income-specific terminology in the UI.
     */

    const [
        form,
        setForm
    ] =
        useState({

            occurred_on:
                initial?.occurred_on ||
                localDateString(),

            name:
                initial?.name ||
                '',

            amount:
                initial?.amount !== undefined
                    ? String(
                        initial.amount
                    )
                    : '',

            group_name:
            initialExpenseGroup,

            category:
                initial?.category ||
                '',

            merchant:
                initial?.merchant ||
                '',

            status:
                initial?.status ||
                'paid',

            payment_method:
                initial?.payment_method ||
                '',

            due_date:
                initial?.due_date ||
                '',

            notes:
                initial?.notes ||
                '',

            hours_worked:
                initial?.hours_worked != null
                    ? String(initial.hours_worked)
                    : ''
        });


    const [
        message,
        setMessage
    ] =
        useState('');


    const [
        saving,
        setSaving
    ] =
        useState(false);


    const [
        customCategoryMode,
        setCustomCategoryMode
    ] =
        useState(false);


    const [
        customCategories,
        setCustomCategories
    ] =
        useState<CustomCategories>(
            () =>
                loadCustomCategories()
        );


    const availableCategories =
        useMemo(
            () => {

                if (
                    !isExpenseGroup(
                        form.group_name
                    )
                ) {
                    return [];
                }


                const combined = [
                    ...defaultCategories[
                        form.group_name
                        ],

                    ...customCategories[
                        form.group_name
                        ]
                ];


                return combined.filter(
                    (
                        item,
                        index,
                        array
                    ) =>
                        array.findIndex(
                            value =>
                                value
                                    .toLowerCase() ===
                                item
                                    .toLowerCase()
                        ) === index
                );

            },
            [
                form.group_name,
                customCategories
            ]
        );


    function changeGroup(
        group: ExpenseGroup
    ) {

        setForm(
            current => ({
                ...current,

                group_name:
                group,

                category:
                    ''
            })
        );


        setCustomCategoryMode(
            false
        );


        setMessage('');
    }


    function changeCategory(
        category: string
    ) {

        if (
            category ===
            '__custom__'
        ) {

            setForm(
                current => ({
                    ...current,
                    category: ''
                })
            );


            setCustomCategoryMode(
                true
            );


            setMessage('');

            return;
        }


        setForm(
            current => ({
                ...current,
                category
            })
        );


        setCustomCategoryMode(
            false
        );


        setMessage('');
    }


    function rememberCustomCategory(
        group: ExpenseGroup,
        category: string
    ) {

        const cleaned =
            category.trim();


        if (!cleaned) {
            return;
        }


        const exists = [
            ...defaultCategories[
                group
                ],

            ...customCategories[
                group
                ]
        ].some(
            item =>
                item
                    .toLowerCase() ===
                cleaned
                    .toLowerCase()
        );


        if (exists) {
            return;
        }


        const updated:
            CustomCategories = {

            ...customCategories,

            [group]: [
                ...customCategories[
                    group
                    ],
                cleaned
            ]
        };


        setCustomCategories(
            updated
        );


        saveCustomCategories(
            updated
        );
    }


    async function save(
        event: FormEvent
    ) {

        event.preventDefault();


        if (saving) {
            return;
        }


        setMessage('');


        const amount =
            Number(
                form.amount
            );


        if (
            !Number.isFinite(
                amount
            ) ||
            amount <= 0
        ) {

            setMessage(
                'Enter an amount greater than zero.'
            );

            return;
        }


        if (
            !form.name.trim()
        ) {

            setMessage(
                kind === 'income'
                    ? 'Enter an income source.'
                    : 'Enter an expense name.'
            );

            return;
        }

        if (
            kind === 'income' &&
            form.hours_worked.trim() !== '' &&
            (!Number.isFinite(Number(form.hours_worked)) || Number(form.hours_worked) < 0)
        ) {
            setMessage('Enter valid hours worked or leave it blank.');
            return;
        }


        if (
            kind === 'expense' &&
            !isExpenseGroup(
                form.group_name
            )
        ) {

            setMessage(
                'Select an expense group.'
            );

            return;
        }


        if (
            kind === 'expense' &&
            !form.category.trim()
        ) {

            setMessage(
                'Select or enter an expense category.'
            );

            return;
        }


        setSaving(
            true
        );


        try {

            const payload = {

                occurred_on:
                form.occurred_on,

                name:
                    form.name.trim(),

                amount,

                kind,

                group_name:
                    kind === 'expense'
                        ? form.group_name
                        : null,

                category:
                    kind === 'expense'
                        ? form.category.trim()
                        : null,

                merchant:
                    form.merchant.trim() ||
                    null,

                status:
                    kind === 'expense'
                        ? (
                            form.status as
                                | 'paid'
                                | 'unpaid'
                        )
                        : 'paid' as const,

                due_date:
                    kind === 'expense'
                        ? form.due_date ||
                        null
                        : null,

                payment_method:
                    form.payment_method
                        .trim() ||
                    null,

                notes:
                    form.notes
                        .trim() ||
                    null,

                hours_worked:
                    kind === 'income' && form.hours_worked.trim() !== ''
                        ? Number(form.hours_worked)
                        : null
            };


            const result =
                initial
                    ? await updateTransaction(
                        initial.id,
                        payload
                    )
                    : await addTransaction(
                        payload
                    );


            if (
                'error' in result &&
                result.error
            ) {

                setMessage(
                    result.error.message ||
                    'Unable to save transaction.'
                );

                return;
            }


            if (
                kind === 'expense' &&
                customCategoryMode &&
                isExpenseGroup(
                    form.group_name
                )
            ) {

                rememberCustomCategory(
                    form.group_name,
                    form.category
                );
            }


            onSaved();
            onClose();

        } catch {

            setMessage(
                'Unable to save transaction.'
            );

        } finally {

            setSaving(
                false
            );
        }
    }


    return (
        <div
            className="modalOverlay"
            role="presentation"
            onMouseDown={
                event => {

                    if (
                        event.target ===
                        event.currentTarget
                    ) {
                        onClose();
                    }
                }
            }
        >

            <form
                className="modalCard transactionModal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="transaction-modal-title"
                onSubmit={
                    save
                }
            >

                <header className="modalHead">

                    <div className="modalTitleGroup">

                        <span
                            className={
                                kind === 'expense'
                                    ? 'modalTypeIcon expenseModalIcon'
                                    : 'modalTypeIcon incomeModalIcon'
                            }
                            aria-hidden="true"
                        >
                            {kind === 'expense'
                                ? '−'
                                : '+'}
                        </span>


                        <div>

                            <small>
                                MY HOME FINANCE
                            </small>

                            <h2
                                id="transaction-modal-title"
                            >
                                {initial
                                    ? 'Edit'
                                    : 'Add'}{' '}

                                {kind === 'income'
                                    ? 'Income'
                                    : 'Expense'}
                            </h2>

                            <p className="modalIntro">
                                {kind === 'expense'
                                    ? 'Record spending, payment status and how you paid.'
                                    : 'Record income, where it was deposited and how it was received.'}
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="closeButton"
                        onClick={
                            onClose
                        }
                        aria-label="Close"
                        disabled={
                            saving
                        }
                    >
                        ×
                    </button>

                </header>

                {kind === 'expense' && receiptPreview && (
                    <section className="receiptInlinePreview" aria-label="Selected receipt photo">
                        <img src={receiptPreview.previewUrl} alt="Selected receipt" />
                        <div><strong>Receipt photo ready</strong><small>{receiptPreview.name}</small><em>Preview only — it is not attached or saved with this transaction.</em></div>
                        <button type="button" onClick={onRemoveReceipt}>Remove</button>
                    </section>
                )}


                <div className="modalForm">

                    <div className="formRow">

                        <label className="field">

                            <span>
                                {kind === 'income'
                                    ? 'Received Date'
                                    : 'Date'}
                            </span>

                            <CompactDatePicker
                                label={kind === 'income' ? 'Received Date' : 'Expense Date'}
                                value={form.occurred_on}
                                onChange={value => setForm(current => ({
                                    ...current,
                                    occurred_on: value
                                }))}
                            />

                        </label>


                        <label className="field amountField">

                            <span>
                                Amount
                            </span>

                            <div className="moneyInput">

                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    inputMode="decimal"
                                    required
                                    value={
                                        form.amount
                                    }
                                    placeholder="0.00"
                                    onChange={
                                        event =>
                                            setForm(
                                                current => ({
                                                    ...current,

                                                    amount:
                                                    event
                                                        .target
                                                        .value
                                                })
                                            )
                                    }
                                />

                            </div>

                        </label>

                    </div>


                    <label className="field">

                        <span>
                            {kind === 'income'
                                ? 'Income Source'
                                : 'Expense Name'}
                        </span>


                        {kind === 'income' ? (
                            <>

                                <input
                                    list="income-sources"
                                    required
                                    value={
                                        form.name
                                    }
                                    placeholder="e.g. Salary"
                                    onChange={
                                        event =>
                                            setForm(
                                                current => ({
                                                    ...current,

                                                    name:
                                                    event
                                                        .target
                                                        .value
                                                })
                                            )
                                    }
                                />


                                <datalist id="income-sources">

                                    {incomeSources.map(
                                        source => (
                                            <option
                                                value={
                                                    source
                                                }
                                                key={
                                                    source
                                                }
                                            />
                                        )
                                    )}

                                </datalist>

                            </>
                        ) : (

                            <input
                                required
                                value={
                                    form.name
                                }
                                placeholder="e.g. Electric Bill, Groceries, Gas"
                                onChange={
                                    event =>
                                        setForm(
                                            current => ({
                                                ...current,

                                                name:
                                                event
                                                    .target
                                                    .value
                                            })
                                        )
                                }
                            />

                        )}

                    </label>


                    {kind === 'expense' && (
                        <>

                            <fieldset className="expenseGroupPicker">

                                <legend>
                                    Expense Group
                                </legend>


                                <div className="expenseGroupOptions">

                                    {groups.map(
                                        group => {

                                            const selected =
                                                form.group_name ===
                                                group;


                                            return (
                                                <button
                                                    type="button"
                                                    key={
                                                        group
                                                    }
                                                    className={
                                                        selected
                                                            ? 'active selected'
                                                            : ''
                                                    }
                                                    aria-pressed={
                                                        selected
                                                    }
                                                    onClick={
                                                        () =>
                                                            changeGroup(
                                                                group
                                                            )
                                                    }
                                                >

                                                    <span
                                                        className="expenseGroupOptionIcon"
                                                        aria-hidden="true"
                                                    >
                                                        {groupIcon(
                                                            group
                                                        )}
                                                    </span>

                                                    <strong>
                                                        {group}
                                                    </strong>


                                                    {selected && (
                                                        <small className="expenseGroupSelectedMark">
                                                            ✓ Selected
                                                        </small>
                                                    )}

                                                </button>
                                            );
                                        }
                                    )}

                                </div>

                            </fieldset>


                            {isExpenseGroup(
                                form.group_name
                            ) && (
                                <div className="selectedModalGroup">

                                    <span>
                                        {groupIcon(
                                            form.group_name
                                        )}
                                    </span>

                                    <div>
                                        <small>
                                            SELECTED GROUP
                                        </small>

                                        <strong>
                                            {form.group_name}
                                        </strong>
                                    </div>

                                </div>
                            )}


                            <label className="field">

                                <span>
                                    Category
                                </span>


                                {!customCategoryMode ? (

                                    <select
                                        required
                                        disabled={
                                            !form.group_name
                                        }
                                        value={
                                            availableCategories
                                                .includes(
                                                    form.category
                                                )
                                                ? form.category
                                                : ''
                                        }
                                        onChange={
                                            event =>
                                                changeCategory(
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    >

                                        <option value="">
                                            {form.group_name
                                                ? 'Select Category'
                                                : 'Select Expense Group First'}
                                        </option>


                                        {availableCategories.map(
                                            category => (
                                                <option
                                                    value={
                                                        category
                                                    }
                                                    key={
                                                        category
                                                    }
                                                >
                                                    {category}
                                                </option>
                                            )
                                        )}


                                        <option value="__custom__">
                                            + Add Custom Category
                                        </option>

                                    </select>

                                ) : (

                                    <div className="customCategory">

                                        <input
                                            autoFocus
                                            required
                                            value={
                                                form.category
                                            }
                                            placeholder="Type your category"
                                            onChange={
                                                event =>
                                                    setForm(
                                                        current => ({
                                                            ...current,

                                                            category:
                                                            event
                                                                .target
                                                                .value
                                                        })
                                                    )
                                            }
                                        />


                                        <button
                                            type="button"
                                            className="secondaryAction"
                                            onClick={
                                                () => {

                                                    setCustomCategoryMode(
                                                        false
                                                    );

                                                    setForm(
                                                        current => ({
                                                            ...current,
                                                            category: ''
                                                        })
                                                    );
                                                }
                                            }
                                        >
                                            Use List
                                        </button>

                                    </div>

                                )}

                            </label>


                            <div className="formRow">

                                <label className="field">

                                    <span>
                                        Payment Status
                                    </span>

                                    <select
                                        value={
                                            form.status
                                        }
                                        onChange={
                                            event =>
                                                setForm(
                                                    current => ({
                                                        ...current,

                                                        status:
                                                            event
                                                                .target
                                                                .value as
                                                                | 'paid'
                                                                | 'unpaid'
                                                    })
                                                )
                                        }
                                    >

                                        <option value="paid">
                                            Paid
                                        </option>

                                        <option value="unpaid">
                                            Unpaid
                                        </option>

                                    </select>

                                </label>


                                <label className="field">

                                    <span>
                                        Due Date
                                    </span>

                                    <CompactDatePicker
                                        label="Due Date"
                                        value={form.due_date}
                                        allowEmpty
                                        onChange={value => setForm(current => ({
                                            ...current,
                                            due_date: value
                                        }))}
                                    />

                                </label>

                            </div>


                            <fieldset className="paymentMethodSection">

                                <legend>
                                    Payment Method
                                </legend>

                                <div className="paymentMethodGrid">

                                    {expensePaymentMethods.map(
                                        method => {

                                            const selected =
                                                form.payment_method ===
                                                method;


                                            return (
                                                <button
                                                    type="button"
                                                    key={
                                                        method
                                                    }
                                                    className={
                                                        selected
                                                            ? 'paymentMethodButton active'
                                                            : 'paymentMethodButton'
                                                    }
                                                    aria-pressed={
                                                        selected
                                                    }
                                                    onClick={
                                                        () =>
                                                            setForm(
                                                                current => ({
                                                                    ...current,

                                                                    payment_method:
                                                                    method
                                                                })
                                                            )
                                                    }
                                                >

                                                    <span
                                                        aria-hidden="true"
                                                        className="paymentMethodIcon"
                                                    >
                                                        {paymentIcon(
                                                            method
                                                        )}
                                                    </span>

                                                    <small>
                                                        {method}
                                                    </small>

                                                </button>
                                            );
                                        }
                                    )}

                                </div>

                            </fieldset>

                            <label className="field">
                                <span>Hours Worked <small>(optional)</small></span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    inputMode="decimal"
                                    value={form.hours_worked}
                                    placeholder="e.g. 32.5"
                                    onChange={event => setForm(current => ({ ...current, hours_worked: event.target.value }))}
                                />
                            </label>

                        </>
                    )}


                    {kind === 'income' && (
                        <>

                            <label className="field">

                                <span>
                                    Deposited To
                                </span>

                                <input
                                    list="income-deposit-accounts"
                                    value={
                                        form.merchant
                                    }
                                    placeholder="e.g. Chase Checking"
                                    onChange={
                                        event =>
                                            setForm(
                                                current => ({
                                                    ...current,

                                                    merchant:
                                                    event
                                                        .target
                                                        .value
                                                })
                                            )
                                    }
                                />


                                <datalist id="income-deposit-accounts">

                                    {incomeDepositAccounts.map(
                                        account => (
                                            <option
                                                key={
                                                    account
                                                }
                                                value={
                                                    account
                                                }
                                            />
                                        )
                                    )}

                                </datalist>

                                <small className="fieldHint">
                                    Enter the bank or account where this income was deposited.
                                </small>

                            </label>


                            <fieldset className="paymentMethodSection incomeMethodSection">

                                <legend>
                                    Received Via
                                </legend>

                                <div className="paymentMethodGrid">

                                    {incomeReceiveMethods.map(
                                        method => {

                                            const selected =
                                                form.payment_method ===
                                                method;


                                            return (
                                                <button
                                                    type="button"
                                                    key={
                                                        method
                                                    }
                                                    className={
                                                        selected
                                                            ? 'paymentMethodButton active'
                                                            : 'paymentMethodButton'
                                                    }
                                                    aria-pressed={
                                                        selected
                                                    }
                                                    onClick={
                                                        () =>
                                                            setForm(
                                                                current => ({
                                                                    ...current,

                                                                    payment_method:
                                                                    method
                                                                })
                                                            )
                                                    }
                                                >

                                                    <span
                                                        aria-hidden="true"
                                                        className="paymentMethodIcon"
                                                    >
                                                        {incomeMethodIcon(
                                                            method
                                                        )}
                                                    </span>

                                                    <small>
                                                        {method}
                                                    </small>

                                                </button>
                                            );
                                        }
                                    )}

                                </div>

                            </fieldset>

                        </>
                    )}


                    <div className="optionalFields">

                        <div className="optionalFieldsTitle">

                            <span>
                                {kind === 'expense'
                                    ? 'Additional Details'
                                    : 'Notes'}
                            </span>

                            <small>
                                Optional
                            </small>

                        </div>


                        {kind === 'expense' && (

                            <label className="field">

                                <span>
                                    Merchant
                                </span>

                                <input
                                    value={
                                        form.merchant
                                    }
                                    placeholder="e.g. Walmart, Costco, Dominion Energy"
                                    onChange={
                                        event =>
                                            setForm(
                                                current => ({
                                                    ...current,

                                                    merchant:
                                                    event
                                                        .target
                                                        .value
                                                })
                                            )
                                    }
                                />

                            </label>

                        )}


                        <label className="field">

                            <span>
                                Notes
                            </span>

                            <textarea
                                rows={3}
                                value={
                                    form.notes
                                }
                                placeholder={
                                    kind === 'expense'
                                        ? 'Optional expense notes'
                                        : 'Optional income notes'
                                }
                                onChange={
                                    event =>
                                        setForm(
                                            current => ({
                                                ...current,

                                                notes:
                                                event
                                                    .target
                                                    .value
                                            })
                                        )
                                }
                            />

                        </label>

                    </div>

                </div>


                {message && (
                    <p
                        className="errorMessage"
                        role="alert"
                    >

                        <span
                            aria-hidden="true"
                        >
                            !
                        </span>

                        {message}

                    </p>
                )}


                <footer className="modalActions">

                    <button
                        type="button"
                        className="secondaryAction"
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                    >
                        Cancel
                    </button>


                    <button
                        type="submit"
                        className="primaryAction"
                        disabled={
                            saving
                        }
                    >
                        {saving
                            ? 'Saving...'
                            : initial
                                ? 'Save Changes'
                                : kind === 'income'
                                    ? 'Save Income'
                                    : 'Save Expense'}
                    </button>

                </footer>

            </form>

        </div>
    );
}
