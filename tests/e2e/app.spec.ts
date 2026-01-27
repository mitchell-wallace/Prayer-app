import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const transitionMinWaitMs = 200;

async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    localStorage.clear();
    if (indexedDB?.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map(
          (db) =>
            new Promise<void>((resolve) => {
              if (!db.name) {
                resolve();
                return;
              }
              const request = indexedDB.deleteDatabase(db.name);
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            })
        )
      );
    }
  });
}

async function waitForSingleTitle(page: Page): Promise<void> {
  await page.waitForTimeout(transitionMinWaitMs);
  await expect(page.getByTestId('request-title')).toHaveCount(1);
}

async function readActiveTitle(page: Page): Promise<string> {
  await waitForSingleTitle(page);
  return page.getByTestId('request-title').first().innerText();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await clearStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSingleTitle(page);
});

test('pressing next moves forward', async ({ page }) => {
  const before = await readActiveTitle(page);
  await page.getByTestId('next-button').click();
  const after = await readActiveTitle(page);
  expect(after).not.toBe(before);
});

test('pressing back moves backward', async ({ page }) => {
  const first = await readActiveTitle(page);
  await page.getByTestId('next-button').click();
  const second = await readActiveTitle(page);
  expect(second).not.toBe(first);
  await page.getByTestId('prev-button').click();
  const back = await readActiveTitle(page);
  expect(back).toBe(first);
});

test('pressing prayed advances the card', async ({ page }) => {
  const before = await readActiveTitle(page);
  await page.getByTestId('pray-button').click();
  const after = await readActiveTitle(page);
  expect(after).not.toBe(before);
});

test('add note flow adds a note', async ({ page }) => {
  await page.getByTestId('note-open').click();
  await expect(page.getByTestId('note-form')).toBeVisible();
  await page.getByTestId('note-input').fill('Test note entry');
  await page.getByTestId('note-submit').click();
  await expect(page.getByTestId('notes-list')).toContainText('Test note entry');
});

test('add request shows controls and queues new request after current', async ({ page }) => {
  const before = await readActiveTitle(page);

  const input = page.getByTestId('request-input');
  await input.click();
  await expect(page.getByTestId('request-controls')).toBeVisible();

  const requestTitle = 'New request for test';
  await input.fill(requestTitle);
  await page.getByTestId('request-submit').click();

  await expect(page.getByTestId('request-controls')).toBeVisible();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  const stillCurrent = await readActiveTitle(page);
  expect(stillCurrent).toBe(before);

  await page.getByTestId('next-button').click();
  const nextTitle = await readActiveTitle(page);
  expect(nextTitle).toBe(requestTitle);
});

test('settings defaults apply to new request input', async ({ page }) => {
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-modal')).toBeVisible();
  await page.getByTestId('settings-priority-urgent').click();
  await page.getByTestId('settings-duration-1y').click();
  await page.getByTestId('settings-modal').click({ position: { x: 5, y: 5 } });

  await page.getByTestId('request-input').click();
  await expect(page.getByTestId('priority-toggle')).toContainText('Urgent');
  await expect(page.getByTestId('duration-toggle')).toContainText('1 year');
});

test('info modal shows active count increases after adding request', async ({ page }) => {
  await page.getByTestId('info-button').click();
  const active = page.getByTestId('stat-active');
  const before = Number(await active.innerText());
  await page.getByTestId('info-modal').click({ position: { x: 5, y: 5 } });

  await page.getByTestId('request-input').fill('Request for stats');
  await page.getByTestId('request-submit').click();

  await page.getByTestId('info-button').click();
  const after = Number(await active.innerText());
  expect(after).toBe(before + 1);
});

test('next repeatedly keeps moving between cards', async ({ page }) => {
  let before = await readActiveTitle(page);
  for (let i = 0; i < 12; i += 1) {
    await page.getByTestId('next-button').click();
    const after = await readActiveTitle(page);
    expect(after).not.toBe(before);
    before = after;
  }
});
