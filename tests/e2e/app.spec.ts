import { expect, test } from '@playwright/test';

test('main menu has the three entry points in order', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.menu button strong')).toHaveText(['Daily puzzle', 'Random verse', 'Make a puzzle']);
  await expect(page.getByRole('link', { name: /view source on github/i })).toHaveAttribute('href', 'https://github.com/wmatson/novpon');
  await page.getByRole('link', { name: /notes on the corpus/i }).click();
  await expect(page.locator('.notes-page')).toContainText('Psalms, Proverbs, Sirach, Wisdom');
});

test('custom puzzle creation shows a live word counter', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /make a puzzle/i }).click();
  await page.locator('textarea:not(.hint-input)').fill('Bright river');
  await page.locator('.hint-input').fill('A clue about water');
  await expect(page.locator('.counter')).toHaveText('2 words · 12/250 characters');
  await page.getByRole('button', { name: /create link/i }).click();
  await expect(page.locator('.game-header')).toContainText('target has 2 words');
  await expect(page.locator('.guess-counter')).toHaveText('0 words · target 2');
  await expect(page.locator('.source-hint')).toHaveText('Hint: A clue about water');
  await expect(page.locator('.message')).toHaveText('', { timeout: 60_000 });
});

test('custom puzzle progress survives a refresh', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /make a puzzle/i }).click();
  await page.locator('textarea:not(.hint-input)').fill('Bright river');
  await page.getByRole('button', { name: /create link/i }).click();
  await expect(page.locator('.message')).toHaveText('', { timeout: 60_000 });
  await page.locator('input[placeholder="Type your guess…"]').fill('Bright river');
  await page.getByRole('button', { name: 'Guess' }).click();
  await expect(page.locator('.success')).toBeVisible();
  await page.reload();
  await expect(page.locator('.success')).toBeVisible();
  await expect(page.locator('.guess-list')).toContainText('Bright');
});

test('random verse launches and mobile layout has no horizontal overflow', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /random verse/i }).click();
  await expect(page.locator('.game-header')).toContainText('RANDOM VERSE');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page).toHaveURL(/#\/random$/);
  await expect(page.getByRole('button', { name: /share this verse/i })).toBeVisible();
});

test('a shared random verse opens the same corpus entry', async ({ page }) => {
  await page.goto('/#/random/Z2VuZXNpczoxOjE');
  await expect(page.locator('.game-header')).toContainText('Bible book: Genesis');
  await expect(page.getByRole('button', { name: /share this verse/i })).toBeVisible();
});
