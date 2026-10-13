import { test, expect } from '@playwright/test';

test('Move relocates an expense to exactly one destination period', async ({ page }) => {
    await page.goto('/');

    // =========================================================
    // 1. CREATE CONTROLLED EXPENSE
    // =========================================================

    await page.getByRole('button', { name: 'Quick Expense' }).click();

    const addDialog = page.getByRole('dialog', { name: 'Add Expense' });
    await expect(addDialog).toBeVisible();

    await page
        .getByRole('combobox', { name: 'Expense Date month' })
        .selectOption({ label: 'Oct' });

    await page
        .getByRole('combobox', { name: 'Expense Date day' })
        .selectOption('13');

    await page
        .getByRole('combobox', { name: 'Expense Date year' })
        .selectOption('2026');

    await page
        .getByRole('spinbutton', { name: 'Amount $' })
        .fill('125.50');

    await page
        .getByRole('textbox', { name: 'Expense Name' })
        .fill('Playwright Move Test');

    await page
        .getByRole('group', { name: 'Expense Group' })
        .getByRole('button', { name: 'Home' })
        .click();

    await page
        .getByRole('combobox', { name: 'Category' })
        .selectOption({ label: 'Home Maintenance' });

    await page
        .getByRole('group', { name: 'Payment Method' })
        .getByRole('button', { name: 'Cash', exact: true })
        .click();

    await page.getByRole('button', { name: 'Save Expense' }).click();

    await expect(addDialog).toBeHidden();

    // =========================================================
    // 2. VERIFY ORIGINAL EXPENSE
    // =========================================================

    await page
        .getByRole('button', { name: 'Expense', exact: true })
        .click();

    await expect(
        page.getByText('Playwright Move Test', { exact: true })
    ).toBeVisible();

    await expect(
        page.getByText('Home Maintenance · Oct 13', { exact: true })
    ).toBeVisible();

    // =========================================================
    // 3. SELECT EXPENSE AND OPEN COPY / MOVE
    // =========================================================

    await page
        .getByRole('checkbox', {
            name: 'Select Playwright Move Test for copy or move',
        })
        .check();

    await page
        .getByRole('button', { name: 'Copy / Move (1)' })
        .click();

    const workflowDialog = page.getByRole('dialog', {
        name: 'Copy or move expenses',
    });

    await expect(workflowDialog).toBeVisible();

    // =========================================================
    // 4. SWITCH TO MOVE MODE
    // =========================================================

    await workflowDialog
        .getByRole('button', { name: 'Move', exact: true })
        .click();

    await expect(
        workflowDialog.getByRole('heading', { name: 'Move expenses' })
    ).toBeVisible();

    // Move must expose exactly one Year and one Month destination.
    const destinationYear = workflowDialog.getByRole('combobox', {
        name: 'Destination year',
    });

    const destinationMonth = workflowDialog.getByRole('combobox', {
        name: 'Destination month',
    });

    await expect(destinationYear).toHaveCount(1);
    await expect(destinationMonth).toHaveCount(1);

    // =========================================================
    // 5. MOVE OCTOBER 2026 -> NOVEMBER 2026
    // =========================================================

    await destinationYear.selectOption('2026');

    await destinationMonth.selectOption({
        label: 'November',
    });

    await workflowDialog
        .getByRole('button', { name: 'Move selected expenses' })
        .click();

    await expect(workflowDialog).toBeHidden();

    // =========================================================
    // 6. VERIFY ORIGINAL OCTOBER RECORD IS GONE
    // =========================================================

    await expect(
        page.getByText('Playwright Move Test', { exact: true })
    ).toHaveCount(0);

    await expect(
        page.getByText('No expenses found for this selection.')
    ).toBeVisible();

    // =========================================================
    // 7. VERIFY MOVED RECORD THROUGH FINANCE CALENDAR
    // =========================================================

    await page.getByRole('button', { name: 'Home', exact: true }).click();

    await page
        .getByRole('button', { name: /FINANCE\s+Oct\s+13/i })
        .click();

    const calendarPeriod = page.getByRole('button', {
        name: 'October 2026',
    });

    await calendarPeriod.click();

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

    await expect(calendarDialog).toBeHidden();

    await expect(
        page.getByRole('button', { name: 'November 2026' })
    ).toBeVisible();

    // The moved expense keeps its day while changing destination period.
    await page.getByRole('button', { name: '13', exact: true }).click();

    await expect(
        page.getByText('Playwright Move Test', { exact: true })
    ).toBeVisible();

    await expect(
        page.getByText(/Home Maintenance/)
    ).toBeVisible();

    await expect(
        page.getByText(/\$125\.50/)
    ).toBeVisible();
});