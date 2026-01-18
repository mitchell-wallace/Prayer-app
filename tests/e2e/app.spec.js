import { expect, test } from '@playwright/test';

const transitionWaitMs = 250;

async function clearStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    if (indexedDB?.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs
          .filter((db) => db.name)
          .map(
            (db) =>
              new Promise((resolve) => {
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

async function waitForCard(page) {
  await page.getByTestId('request-title').first().waitFor();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await clearStorage(page);
  await page.reload();
  await waitForCard(page);
});

test('pressing next moves forward', async ({ page }) => {
  const title = page.getByTestId('request-title');
  const before = await title.innerText();
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(transitionWaitMs);
  await expect(title).not.toHaveText(before);
});

test('pressing back moves backward', async ({ page }) => {
  const title = page.getByTestId('request-title');
  const first = await title.innerText();
  await page.getByTestId('next-button').click();
  await page.waitForTimeout(transitionWaitMs);
  await expect(title).not.toHaveText(first);
  await page.getByTestId('prev-button').click();
  await page.waitForTimeout(transitionWaitMs);
  await expect(title).toHaveText(first);
});

test('pressing prayed advances the card', async ({ page }) => {
  const title = page.getByTestId('request-title');
  const before = await title.innerText();
  await page.getByTestId('pray-button').click();
  await page.waitForTimeout(transitionWaitMs);
  await expect(title).not.toHaveText(before);
});

test('add note flow adds a note', async ({ page }) => {
  await page.getByTestId('note-open').click();
  await expect(page.getByTestId('note-form')).toBeVisible();
  await page.getByTestId('note-input').fill('Test note entry');
  await page.getByTestId('note-submit').click();
  await expect(page.getByTestId('notes-list')).toContainText('Test note entry');
});

test('add request shows controls and queues new request after current', async ({ page }) => {
  const title = page.getByTestId('request-title');
  const before = await title.innerText();

  const input = page.getByTestId('request-input');
  await input.click();
  await expect(page.getByTestId('request-controls')).toBeVisible();

  const requestTitle = 'New request for test';
  await input.fill(requestTitle);
  await page.getByTestId('request-submit').click();

  await expect(page.getByTestId('request-controls')).toBeHidden();
  await expect(input).toHaveValue('');
  await expect(title).toHaveText(before);

  await page.getByTestId('next-button').click();
  await page.waitForTimeout(transitionWaitMs);
  await expect(title).toHaveText(requestTitle);
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
  const title = page.getByTestId('request-title');
  for (let i = 0; i < 12; i += 1) {
    const before = await title.innerText();
    await page.getByTestId('next-button').click();
    await page.waitForTimeout(transitionWaitMs);
    await expect(title).not.toHaveText(before);
  }
});
