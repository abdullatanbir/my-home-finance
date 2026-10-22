import { test, expect } from '@playwright/test';
const storageKey = 'my-home-finance-financial-core';

test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2024-02-29T12:00:00'));
    await page.goto('/my-home-finance/');
    await expect(page.locator('.bc-hero h1')).toBeVisible();
    await page.evaluate(key => {
        const store = JSON.parse(localStorage.getItem(key)!);
        store.transactions = [
            ['purchase', 'February purchase', '2024-02-01', 'expense', 'posted', 10000],
            ['refund', 'February refund', '2024-02-08', 'refund', 'posted', 2500],
            ['pending', 'Pending purchase', '2024-02-01', 'expense', 'pending', 99900],
            ['transfer', 'Owned transfer', '2024-02-01', 'transfer', 'posted', 50000],
            ['leap', 'Leap day purchase', '2024-02-29', 'expense', 'paid', 1234],
        ].map(([id, description, transactionDate, type, status, amountMinor]) => ({
            id, description, transactionDate, type, status, amountMinor, currency: 'USD',
            sourceType: 'manual', createdAt: '', updatedAt: '',
        }));
        localStorage.setItem(key, JSON.stringify(store));
    }, storageKey);
    await page.reload();
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Spending', exact: true }).click();
});

test('monthly and weekly actuals clamp leap February and preserve signed refunds', async ({ page }) => {
    const weekly = page.getByRole('region', { name: 'Weekly actual spending chart' });
    await expect(weekly.getByRole('button')).toHaveCount(5);
    await expect(weekly.getByRole('button', { name: '2024-02-01 through 2024-02-07: $100.00 actual spending', exact: true })).toBeVisible();
    await expect(weekly.getByRole('button', { name: '2024-02-08 through 2024-02-14: -$25.00 actual spending', exact: true })).toBeVisible();
    await expect(weekly.getByRole('button', { name: '2024-02-29: $12.34 actual spending', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Monthly', exact: true }).click();
    const monthly = page.getByRole('region', { name: 'Monthly actual spending chart' });
    await expect(monthly.getByRole('button')).toHaveCount(29);
    await expect(monthly.getByRole('button', { name: '2024-02-01: $100.00 actual spending', exact: true })).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'qa-output/reconstruction-monthly-desktop.png', fullPage: true });
});

test('chart evidence and Back retain month and monthly scale without changing the store', async ({ page }) => {
    const before = await page.evaluate(key => localStorage.getItem(key), storageKey);
    await page.getByRole('button', { name: 'Monthly', exact: true }).click();
    await page.getByRole('region', { name: 'Monthly actual spending chart' }).getByRole('button', { name: '2024-02-29: $12.34 actual spending', exact: true }).click();
    await expect(page.locator('.ex-evidence-panel').getByRole('button', { name: /Leap day purchase/ })).toBeVisible();
    await expect(page.locator('.ex-evidence-panel').getByRole('button', { name: /February purchase/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Back to previous context' }).click();
    await expect(page.getByRole('button', { name: 'Monthly', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Choose reporting period' })).toContainText('February 2024');
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe(before);
});

test('spending tabs have a labelled panel and support roving keyboard focus', async ({ page }) => {
    const overview = page.getByRole('tab', { name: 'Overview', exact: true });
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    const breakdown = page.getByRole('tab', { name: 'Breakdown', exact: true });
    await expect(breakdown).toBeFocused();
    await expect(breakdown).toHaveAttribute('aria-selected', 'true');
    await expect(overview).toHaveAttribute('tabindex', '-1');
    await expect(page.getByRole('tabpanel', { name: 'Breakdown', exact: true })).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: 'Transactions', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(overview).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', { name: 'Transactions', exact: true })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(overview).toBeFocused();
});

test('future daily bars are labelled and disabled, and mobile chart scroll stays inside its card', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.clock.setFixedTime(new Date('2024-02-15T12:00:00'));
    await page.reload();
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Spending', exact: true }).click();
    await page.getByRole('button', { name: 'Monthly', exact: true }).click();
    const chart = page.getByRole('region', { name: 'Monthly actual spending chart' });
    await expect(chart.getByRole('button', { name: /2024-02-29:.*Future/ })).toBeDisabled();
    await expect(chart.getByRole('button', { name: '2024-02-01: $100.00 actual spending', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('Home sections follow the requested reading order', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.locator('.bc-dashboard').getByRole('heading', { level: 2 })).toHaveText([
        'NET WORTH', 'SPENT LAST 7 DAYS', 'BUDGET IN FEBRUARY', 'Coming Up', 'Recent Activity',
    ]);
    await page.screenshot({ path: 'qa-output/reconstruction-home-desktop.png', fullPage: true });
});
