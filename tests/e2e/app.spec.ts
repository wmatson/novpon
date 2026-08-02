import { expect, test } from '@playwright/test';

test('main menu has the three entry points in order', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.menu button strong')).toHaveText(['Daily puzzle', 'Random verse', 'Make a puzzle']);
});

test('custom puzzle creation shows a live word counter', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /make a puzzle/i }).click();
  await page.locator('textarea').fill('Bright river');
  await expect(page.locator('.counter')).toHaveText('2 words · 12/250 characters');
  await page.getByRole('button', { name: /create link/i }).click();
  await expect(page.locator('.game-header')).toContainText('target has 2 words');
  await expect(page.locator('.guess-counter')).toHaveText('0 words · target 2');
  await expect(page.locator('.message')).toHaveText('', { timeout: 60_000 });
});

test('random verse launches and mobile layout has no horizontal overflow', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /random verse/i }).click();
  await expect(page.locator('.game-header')).toContainText('RANDOM VERSE');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
