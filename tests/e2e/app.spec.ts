import { expect, test } from '@playwright/test';

test('main menu has the three entry points in order', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.locator('.menu button strong')).toHaveText(['Daily puzzle', 'Random verse', 'Make a puzzle']);
  await expect(page.getByRole('link', { name: /view source on github/i })).toHaveAttribute('href', 'https://github.com/wmatson/novpon');
  await page.getByRole('link', { name: /notes on the corpus/i }).click();
  await expect(page.locator('.notes-page')).toContainText('Psalms, Proverbs, Sirach, Wisdom');
});

test('embedding demo grades a fresh batch without saving progress', async ({ page }) => {
  await page.goto('/#/demo');
  await expect(page.locator('.demo-page')).toContainText('The quick brown fox jumped over the lazy dog by the river');
  await expect(page.locator('.demo-results .curve-row')).toHaveCount(8, { timeout: 120_000 });
  await expect(page.locator('.curve-values')).toHaveCount(8);
  const columns = await page.locator('.demo-results').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(page.viewportSize()!.width >= 1200 ? 5 : page.viewportSize()!.width >= 1020 ? 4 : page.viewportSize()!.width >= 760 ? 2 : 1);
  await page.getByRole('button', { name: /grade afresh/i }).click();
  await expect(page.locator('.demo-results .curve-row')).toHaveCount(8, { timeout: 120_000 });
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
  await expect(page.locator('.closeness-curve')).toHaveCount(2);
  await expect(page.locator('.curve-tick')).toHaveCount(2);
  await expect(page.locator('.curve-word.exact')).toHaveCount(2);
  await expect(page.locator('.curve-word').first()).toContainText('1.00');
  await expect(page.locator('.success')).toBeVisible();
  await page.reload();
  await expect(page.locator('.success')).toBeVisible();
  await expect(page.locator('.guess-list')).toContainText('Bright');
});

test('typing previews the current word position across submitted curves', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /make a puzzle/i }).click();
  await page.locator('textarea:not(.hint-input)').fill('Bright river');
  await page.getByRole('button', { name: /create link/i }).click();
  await expect(page.locator('.message')).toHaveText('', { timeout: 60_000 });
  await page.locator('input[placeholder="Type your guess…"]').fill('Calm stone');
  await page.getByRole('button', { name: 'Guess' }).click();
  await expect(page.locator('.closeness-curve')).toHaveCount(2);
  await expect(page.locator('.guess-composer')).toHaveCSS('position', 'sticky');
  await page.locator('input[placeholder="Type your guess…"]').fill('First');
  await expect(page.locator('.curve-preview-tick')).toHaveCount(2);
  await expect(page.locator('.curve-preview-tick').first()).toHaveAttribute('data-word-index', '0');
  await page.locator('input[placeholder="Type your guess…"]').fill('First second');
  await expect(page.locator('.curve-preview-tick').first()).toHaveAttribute('data-word-index', '1');
  await page.locator('input[placeholder="Type your guess…"]').fill('First second third');
  await expect(page.locator('.curve-preview-tick')).toHaveCount(0);
});

test('legacy saved guesses are upgraded with full curves', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: /make a puzzle/i }).click();
  await page.locator('textarea:not(.hint-input)').fill('Bright river');
  await page.getByRole('button', { name: /create link/i }).click();
  await expect(page.locator('.message')).toHaveText('', { timeout: 60_000 });
  const key = 'novpon:game-progress:v1:custom:QnJpZ2h0IHJpdmVy';
  await page.evaluate(storageKey => localStorage.setItem(storageKey, JSON.stringify([{ won: false, feedback: [{ guess: 'greatest', category: 'no-match', position: null, similarity: 1 }] }])), key);
  await page.reload();
  await expect.poll(async () => page.evaluate(storageKey => {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return saved[0]?.feedback[0]?.curve?.length ?? 0;
  }, key), { timeout: 60_000 }).toBe(2);
  await expect(page.locator('.curve-word')).not.toContainText('1.00');
  await expect(page.locator('.curve-line')).toHaveAttribute('points', / /);
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
