import type { Transaction } from './data';

/** Development-only fixture markers stored in existing transaction fields. */
export const HISTORICAL_TEST_DATA_ID_PREFIX = 'mhf-historical-test-v1-';
export const HISTORICAL_TEST_DATA_NOTE = '[MHF_HISTORICAL_TEST_DATA_V1]';

export type HistoricalTestSeedResult = { added: number; existing: number; start: string; end: string; };
export type HistoricalTestCleanupResult = { removed: number; };

const money = (value: number) => Math.round(value * 100) / 100;
const dateFor = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

function testTransaction(year: number, month: number, sequence: number, values: Omit<Transaction, 'id' | 'created_at' | 'notes'>): Transaction {
    const occurredOn = values.occurred_on;
    return {
        ...values,
        id: `${HISTORICAL_TEST_DATA_ID_PREFIX}${year}-${String(month).padStart(2, '0')}-${sequence}`,
        notes: HISTORICAL_TEST_DATA_NOTE,
        created_at: `${occurredOn}T12:00:00.000Z`
    };
}

/** Creates deterministic, varied records for every month from Jan 2016–Dec 2025. */
export function createHistoricalTestTransactions(): Transaction[] {
    const records: Transaction[] = [];
    for (let year = 2016; year <= 2025; year += 1) {
        const yearOffset = year - 2016;
        for (let month = 1; month <= 12; month += 1) {
            const seasonal = ((month * 37 + yearOffset * 19) % 9) - 4;
            const winterUtility = [1, 2, 12].includes(month) ? 58 : 0;
            const holidaySpend = [11, 12].includes(month) ? 180 : 0;
            const summerTravel = [7, 8].includes(month) ? 95 : 0;
            const incomeBonus = [3, 12].includes(month) ? 420 : 0;
            const baseDate = (day: number) => dateFor(year, month, day);
            const amount = (base: number, variance = 0) => money(base + variance);
            let sequence = 0;
            const add = (values: Omit<Transaction, 'id' | 'created_at' | 'notes'>) => {
                sequence += 1;
                records.push(testTransaction(year, month, sequence, values));
            };

            add({ occurred_on: baseDate(1), kind: 'income', group_name: null, category: 'Salary / Primary Income', name: 'Test Salary / Primary Income', merchant: 'Test Employer', amount: amount(4300 + yearOffset * 165 + incomeBonus, seasonal * 24), status: 'paid', payment_method: 'Direct Deposit', due_date: null });
            add({ occurred_on: baseDate(15), kind: 'income', group_name: null, category: 'Secondary Income', name: 'Test Secondary Income', merchant: 'Test Side Work', amount: amount(260 + ((month * 43 + yearOffset * 31) % 310)), status: 'paid', payment_method: 'Bank Transfer', due_date: null });
            add({ occurred_on: baseDate(1), kind: 'expense', group_name: 'Home', category: 'Mortgage/Rent', name: 'Test Mortgage/Rent', merchant: 'Test Housing', amount: amount(1320 + yearOffset * 48, seasonal * 7), status: 'paid', payment_method: 'Checking Account', due_date: baseDate(1) });
            add({ occurred_on: baseDate(7), kind: 'expense', group_name: 'Home', category: 'Utilities', name: 'Test Utilities', merchant: 'Test Utility Co.', amount: amount(185 + winterUtility, seasonal * 5), status: 'paid', payment_method: 'Checking Account', due_date: baseDate(7) });
            add({ occurred_on: baseDate(10), kind: 'expense', group_name: 'Home', category: 'Internet', name: 'Test Internet', merchant: 'Test Internet', amount: amount(62 + yearOffset * 2), status: 'paid', payment_method: 'Credit Card', due_date: baseDate(10) });
            add({ occurred_on: baseDate(5), kind: 'expense', group_name: 'Personal', category: 'Groceries', name: 'Test Groceries', merchant: 'Test Market', amount: amount(385 + yearOffset * 14, seasonal * 18), status: 'paid', payment_method: 'Debit Card', due_date: null });
            add({ occurred_on: baseDate(12), kind: 'expense', group_name: 'Personal', category: 'Gas', name: 'Test Gas', merchant: 'Test Fuel', amount: amount(115, ((month + yearOffset) % 5) * 13), status: 'paid', payment_method: 'Credit Card', due_date: null });
            add({ occurred_on: baseDate(18), kind: 'expense', group_name: 'Personal', category: 'Dining/Coffee', name: 'Test Dining/Coffee', merchant: 'Test Cafe', amount: amount(82, seasonal * 8), status: 'paid', payment_method: 'Credit Card', due_date: null });
            add({ occurred_on: baseDate(16), kind: 'expense', group_name: 'Credit & Loan', category: 'Credit Card', name: 'Test Credit Card Payment', merchant: 'Test Card', amount: amount(190 + ((month * 29) % 105)), status: 'paid', payment_method: 'Checking Account', due_date: baseDate(16) });
            add({ occurred_on: baseDate(20), kind: 'expense', group_name: 'Credit & Loan', category: 'Loan Payment', name: 'Test Loan Payment', merchant: 'Test Lender', amount: amount(245 + yearOffset * 9), status: 'paid', payment_method: 'Checking Account', due_date: baseDate(20) });
            add({ occurred_on: baseDate(22), kind: 'expense', group_name: 'Others', category: 'Shopping', name: 'Test Shopping', merchant: 'Test Store', amount: amount(105 + holidaySpend + summerTravel, seasonal * 12), status: 'paid', payment_method: 'Credit Card', due_date: null });
            add({ occurred_on: baseDate(26), kind: 'expense', group_name: 'Others', category: 'Parking', name: 'Test Parking/Miscellaneous', merchant: 'Test Parking', amount: amount(28 + ((month * 7) % 35)), status: 'paid', payment_method: 'Cash', due_date: null });
        }
    }
    return records;
}

export function isHistoricalTestTransaction(transaction: Transaction): boolean {
    return transaction.id.startsWith(HISTORICAL_TEST_DATA_ID_PREFIX) && transaction.notes === HISTORICAL_TEST_DATA_NOTE;
}
