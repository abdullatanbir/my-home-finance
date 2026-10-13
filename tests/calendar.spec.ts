import { test, expect } from '@playwright/test';

test('Finance Calendar month/year picker changes reporting period', async ({ page }) => {
    await page.goto('/');

    // Open the central Finance Calendar from Home.
    await page.getByRole('button', { name: /FINANCE\s+Oct\s+13/i }).click();

    // Finance Calendar must be visible.
    await expect(
        page.getByText('FINANCE CALENDAR', { exact: true }).first()
    ).toBeVisible();

    // Open the Calendar period picker.
    const periodButton = page.getByRole('button', { name: 'October 2026' });
    await periodButton.click();

    // C02 regression: picker must actually become visible.
    const periodDialog = page.getByRole('dialog', {
        name: 'Select Finance Calendar period',
    });

    await expect(periodDialog).toBeVisible();
    await expect(periodButton).toHaveAttribute('aria-expanded', 'true');

    // Verify Month control.
    const monthSelect = page.getByRole('combobox', {
        name: 'Calendar month',
    });

    await expect(monthSelect).toHaveValue('10');

    // Verify Year control and required supported range.
    const yearSelect = page.getByRole('combobox', {
        name: 'Calendar year',
    });

    await expect(yearSelect).toHaveValue('2026');

    const yearOptions = yearSelect.locator('option');

    await expect(yearOptions).toHaveCount(40);
    await expect(yearOptions.first()).toHaveText('2026');
    await expect(yearOptions.last()).toHaveText('2065');

    // Change reporting period.
    await monthSelect.selectOption({ label: 'November' });
    await yearSelect.selectOption('2027');

    // Finish period selection.
    await page.getByRole('button', { name: 'Done' }).click();

    // Picker must close.
    await expect(periodDialog).toBeHidden();

    // Calendar heading must refresh to the selected period.
    await expect(
        page.getByRole('button', { name: 'November 2027' })
    ).toBeVisible();

    // November has 30 days: day 31 must not exist.
    await expect(
        page.getByRole('button', { name: '30', exact: true })
    ).toBeVisible();

    await expect(
        page.getByRole('button', { name: '31', exact: true })
    ).toHaveCount(0);
});