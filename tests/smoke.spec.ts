import { test, expect } from './fixture';

test('My Home Finance loads successfully', async ({ page }) => {

    await page.goto('http://localhost:5173/my-home-finance/');

    await expect(page).toHaveTitle(/My Home Finance/i);

});