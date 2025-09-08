import { test, expect } from '@playwright/test';


test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Expect a title to contain a substring.

  await expect(page).toHaveTitle(/TSender/);

});


test('should show the airdrop form when connected, otherwise not', async ({ page, context }) => {
  // Navigate to app
  await page.goto('http://localhost:3000/')

  await expect(page.getByText('Connect Wallet')).toBeVisible()

});