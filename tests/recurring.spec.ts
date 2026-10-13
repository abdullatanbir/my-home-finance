import { test, expect } from '@playwright/test';

async function openRecurring(page: any) {
    await page.getByRole('button', { name: 'More', exact: true }).click();

    await page
        .getByRole('button', { name: /Recurring Automate repeating/i })
        .click();

    await expect(
        page.getByRole('heading', { name: 'Recurring Finance' })
    ).toBeVisible();
}

test('future recurring Expense is scheduled in Calendar but not materialized early', async ({ page }) => {
    await page.goto('/');

    await openRecurring(page);

    await page
        .getByRole('combobox', { name: 'Type' })
        .selectOption({ label: 'Expense' });

    await page
        .getByRole('combobox', { name: 'Frequency' })
        .selectOption({ label: 'Monthly' });

    await page
        .getByRole('combobox', { name: 'Expense group' })
        .selectOption({ label: 'Home' });

    await page
        .getByRole('combobox', { name: 'Category' })
        .selectOption({ label: 'Rent' });

    await page
        .getByRole('textbox', { name: 'Description / name' })
        .fill('Playwright Future Rent');

    await page
        .getByRole('spinbutton', { name: 'Amount' })
        .fill('1250');

    await page
        .getByRole('textbox', { name: 'Due date / schedule' })
        .fill('2026-11-13');

    await page
        .getByRole('combobox', { name: 'Ends' })
        .selectOption({ label: 'Never — until disabled' });

    await page
        .getByRole('button', { name: 'Create recurring rule' })
        .click();

    await expect(
        page.getByText('Playwright Future Rent', { exact: true })
    ).toBeVisible();

    // Future occurrence must NOT already be an actual October expense.
    await page
        .getByRole('button', { name: 'Expense', exact: true })
        .click();

    await expect(
        page.getByText('Playwright Future Rent', { exact: true })
    ).toHaveCount(0);

    // Open central Finance Calendar.
    await page
        .getByRole('button', { name: 'Home', exact: true })
        .click();

    await page
        .getByRole('button', { name: /FINANCE\s+Oct\s+13/i })
        .click();

    await page
        .getByRole('button', { name: 'October 2026' })
        .click();

    const calendarDialog = page.getByRole('dialog', {
        name: 'Select Finance Calendar period',
    });

    await expect(calendarDialog).toBeVisible();

    await calendarDialog
        .getByRole('combobox', { name: 'Calendar month' })
        .selectOption({ label: 'November' });

    await calendarDialog
        .getByRole('combobox', { name: 'Calendar year' })
        .selectOption('2026');

    await calendarDialog
        .getByRole('button', { name: 'Done' })
        .click();

    await expect(
        page.getByRole('button', { name: 'November 2026' })
    ).toBeVisible();

    const scheduledDay = page.getByRole('button', {
        name: '13 Scheduled',
        exact: true,
    });

    await expect(scheduledDay).toBeVisible();

    await scheduledDay.click();

    await expect(
        page.getByText('Playwright Future Rent', { exact: true })
    ).toBeVisible();

    await expect(
        page.getByText(/SCHEDULED/i)
    ).toBeVisible();

    await expect(
        page.getByText(/\$1,250\.00/)
    ).toBeVisible();
});


test('due recurring Expense materializes unpaid exactly once', async ({ page }) => {
    await page.goto('/');

    await openRecurring(page);

    await page
        .getByRole('combobox', { name: 'Type' })
        .selectOption({ label: 'Expense' });

    await page
        .getByRole('combobox', { name: 'Frequency' })
        .selectOption({ label: 'Monthly' });

    await page
        .getByRole('combobox', { name: 'Expense group' })
        .selectOption({ label: 'Home' });

    await page
        .getByRole('combobox', { name: 'Category' })
        .selectOption({ label: 'Rent' });

    await page
        .getByRole('textbox', { name: 'Description / name' })
        .fill('Playwright Due Rent');

    await page
        .getByRole('spinbutton', { name: 'Amount' })
        .fill('975');

    await page
        .getByRole('textbox', { name: 'Due date / schedule' })
        .fill('2026-10-13');

    await page
        .getByRole('combobox', { name: 'Ends' })
        .selectOption({ label: 'Never — until disabled' });

    await page
        .getByRole('button', { name: 'Create recurring rule' })
        .click();

    await expect(
        page.getByText('Playwright Due Rent', { exact: true })
    ).toBeVisible();

    // First reload materializes the due occurrence.
    await page.reload();

    await page
        .getByRole('button', { name: 'Expense', exact: true })
        .click();

    let expenseRow = page.getByRole('button', {
        name: /View Playwright Due Rent details/,
    });

    await expect(expenseRow).toHaveCount(1);
    await expect(expenseRow).toContainText('Rent · Oct 13');
    await expect(expenseRow).toContainText('$975.00');

    // Must not be automatically paid.
    await expect(expenseRow).toContainText('Due Today');

    await expect(
        page.getByText('1 recorded expense')
    ).toBeVisible();

    // Second startup must not duplicate it.
    await page.reload();

    await page
        .getByRole('button', { name: 'Expense', exact: true })
        .click();

    expenseRow = page.getByRole('button', {
        name: /View Playwright Due Rent details/,
    });

    await expect(expenseRow).toHaveCount(1);
    await expect(expenseRow).toContainText('Due Today');

    await expect(
        page.getByText('1 recorded expense')
    ).toBeVisible();

    // Third startup: duplicate protection again.
    await page.reload();

    await page
        .getByRole('button', { name: 'Expense', exact: true })
        .click();

    expenseRow = page.getByRole('button', {
        name: /View Playwright Due Rent details/,
    });

    await expect(expenseRow).toHaveCount(1);
    await expect(expenseRow).toContainText('$975.00');
    await expect(expenseRow).toContainText('Due Today');

    await expect(
        page.getByText('1 recorded expense')
    ).toBeVisible();
});


test('due recurring Income materializes exactly once', async ({ page }) => {
    await page.goto('/');

    await openRecurring(page);

    await page
        .getByRole('combobox', { name: 'Type' })
        .selectOption({ label: 'Income' });

    await page
        .getByRole('combobox', { name: 'Frequency' })
        .selectOption({ label: 'Monthly' });

    await page
        .getByRole('combobox', { name: 'Income source' })
        .selectOption({ label: 'Salary' });

    await page
        .getByRole('textbox', { name: 'Details / source name' })
        .fill('Playwright Monthly Salary');

    await page
        .getByRole('spinbutton', { name: 'Amount' })
        .fill('4200');

    await page
        .getByRole('textbox', { name: 'Expected date / schedule' })
        .fill('2026-10-13');

    await page
        .getByRole('combobox', { name: 'Ends' })
        .selectOption({ label: 'Never — until disabled' });

    await page
        .getByRole('button', { name: 'Create recurring rule' })
        .click();

    await expect(
        page.getByText('Playwright Monthly Salary', { exact: true })
    ).toBeVisible();

    // Materialize.
    await page.reload();

    await page
        .getByRole('button', { name: 'Income', exact: true })
        .click();

    let incomeRow = page.getByRole('button', {
        name: /View Playwright Monthly Salary details/,
    });

    await expect(incomeRow).toHaveCount(1);
    await expect(incomeRow).toContainText('Income · Oct 13');
    await expect(incomeRow).toContainText('+$4,200.00');

    await expect(
        page.getByRole('button', {
            name: /Income \$4,200\.00 View sources/,
        })
    ).toBeVisible();

    // Oct 13 belongs to W2: Oct 8–14.
    await expect(
        page.getByRole('button', {
            name: /View Week 2, Oct 8–14, 2026 income details/,
        })
    ).toContainText('$4,200.00');

    await expect(
        page.getByText('1 records')
    ).toBeVisible();

    // Reload must not create a second income occurrence.
    await page.reload();

    await page
        .getByRole('button', { name: 'Income', exact: true })
        .click();

    incomeRow = page.getByRole('button', {
        name: /View Playwright Monthly Salary details/,
    });

    await expect(incomeRow).toHaveCount(1);

    await expect(
        page.getByText('1 records')
    ).toBeVisible();

    // Third startup: still exactly one.
    await page.reload();

    await page
        .getByRole('button', { name: 'Income', exact: true })
        .click();

    incomeRow = page.getByRole('button', {
        name: /View Playwright Monthly Salary details/,
    });

    await expect(incomeRow).toHaveCount(1);
    await expect(incomeRow).toContainText('+$4,200.00');

    await expect(
        page.getByRole('button', {
            name: /Income \$4,200\.00 View sources/,
        })
    ).toBeVisible();
});


test('manual and recurring Savings are additive without duplicate materialization', async ({ page }) => {
    await page.goto('/');

    // =========================================================
    // MANUAL $300 PERSONAL SAVINGS
    // =========================================================

    await page
        .getByRole('button', { name: 'Savings', exact: true })
        .click();

    await page
        .getByRole('button', {
            name: /PERSONAL FUND Personal Savings/,
        })
        .click();

    let savingsDialog = page.getByRole('dialog', {
        name: 'Personal Savings management',
    });

    await expect(savingsDialog).toBeVisible();

    await savingsDialog
        .getByRole('combobox', { name: 'Year' })
        .selectOption('2026');

    await savingsDialog
        .getByRole('combobox', { name: 'Month' })
        .selectOption({ label: 'October' });

    await savingsDialog
        .getByRole('spinbutton', { name: 'Manual amount' })
        .fill('300');

    await savingsDialog
        .getByRole('textbox', { name: 'Notes (optional)' })
        .fill('Playwright manual savings');

    await savingsDialog
        .getByRole('button', { name: 'Add Monthly Contribution' })
        .click();

    await expect(
        savingsDialog.getByText(/Saved During 2026: \$300\.00/)
    ).toBeVisible();

    await savingsDialog
        .getByRole('button', { name: 'Close' })
        .click();

    // =========================================================
    // RECURRING $200 PERSONAL SAVINGS DUE TODAY
    // =========================================================

    await openRecurring(page);

    await page
        .getByRole('combobox', { name: 'Type' })
        .selectOption({ label: 'Savings' });

    await page
        .getByRole('combobox', { name: 'Frequency' })
        .selectOption({ label: 'Monthly' });

    await page
        .getByRole('combobox', { name: 'Savings track' })
        .selectOption({ label: 'Personal Savings' });

    await page
        .getByRole('textbox', { name: 'Name' })
        .fill('Playwright Recurring Savings');

    await page
        .getByRole('spinbutton', { name: 'Amount' })
        .fill('200');

    await page
        .getByRole('textbox', { name: 'Schedule' })
        .fill('2026-10-13');

    await page
        .getByRole('combobox', { name: 'Ends' })
        .selectOption({ label: 'Never — until disabled' });

    await page
        .getByRole('button', { name: 'Create recurring rule' })
        .click();

    await expect(
        page.getByText('Playwright Recurring Savings', { exact: true })
    ).toBeVisible();

    // Materialize recurring contribution.
    await page.reload();

    await page
        .getByRole('button', { name: 'Savings', exact: true })
        .click();

    // $300 manual + $200 recurring.
    await expect(
        page.getByText('This Month').locator('..').getByText('$500.00')
    ).toBeVisible();

    await page
        .getByRole('button', {
            name: /PERSONAL FUND Personal Savings/,
        })
        .click();

    savingsDialog = page.getByRole('dialog', {
        name: 'Personal Savings management',
    });

    await expect(
        savingsDialog.getByText(/Saved During 2026: \$500\.00/)
    ).toBeVisible();

    await savingsDialog
        .getByRole('button', { name: 'Close' })
        .click();

    // =========================================================
    // RELOAD — MUST REMAIN $500
    // =========================================================

    await page.reload();

    await page
        .getByRole('button', { name: 'Savings', exact: true })
        .click();

    await expect(
        page.getByText('This Month').locator('..').getByText('$500.00')
    ).toBeVisible();

    // =========================================================
    // THIRD STARTUP — STILL $500
    // =========================================================

    await page.reload();

    await page
        .getByRole('button', { name: 'Savings', exact: true })
        .click();

    await page
        .getByRole('button', {
            name: /PERSONAL FUND Personal Savings/,
        })
        .click();

    savingsDialog = page.getByRole('dialog', {
        name: 'Personal Savings management',
    });

    await expect(
        savingsDialog.getByText(/Saved During 2026: \$500\.00/)
    ).toBeVisible();
});