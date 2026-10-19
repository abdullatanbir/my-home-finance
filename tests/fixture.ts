import { test as base, expect } from '@playwright/test';
// Accepted regression scenarios use October 13, 2026 as their controlled today.
// Freeze wall time, while leaving timers running, so due-state assertions are deterministic.
export const test = base.extend({
    page: async ({ page }, use) => {
        await page.addInitScript(() => localStorage.setItem('mhf-workspace', 'legacy'));
        await page.clock.setFixedTime(new Date('2026-10-13T12:00:00'));
        await use(page);
    }
});
export { expect };
