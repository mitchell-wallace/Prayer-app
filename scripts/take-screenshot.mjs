import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

async function main() {
  const server = await createServer({
    logLevel: 'error',
    server: {
      port: 4173,
      strictPort: false,
      host: '127.0.0.1',
    },
  });

  await server.listen();

  const url =
    server.resolvedUrls?.local?.[0] ??
    server.resolvedUrls?.network?.[0] ??
    'http://127.0.0.1:4173/';

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('text=prayer rhythm', { timeout: 60_000 });
    await page.waitForSelector('input[placeholder="Add a prayer request"]', { timeout: 60_000 });

    await page.screenshot({
      path: fileURLToPath(new URL('../artifacts/ui.png', import.meta.url)),
      fullPage: true,
    });
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
    await server.httpServer?.close?.();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
