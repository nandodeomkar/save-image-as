import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';

// Uses an existing Playwright installation and Chromium; no downloads or installs.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const profile = await mkdtemp(join(tmpdir(), 'save-image-as-phase01-'));
const extensionPath = resolve('dist');
const evidence = { checked_at: new Date().toISOString(), checks: [] };
const pageErrors = [];
const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<!doctype html><title>Phase 1 fixture</title><img id="fixture" width="8" height="6" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%226%22%3E%3Crect width=%228%22 height=%226%22 fill=%22red%22/%3E%3C/svg%3E">');
});
await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH,
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    timeout: 30000,
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker', { timeout: 15000 });
  const extensionId = new URL(worker.url()).hostname;
  assert.match(worker.url(), /background\/service-worker\.js$/);
  evidence.checks.push('Manifest V3 service worker starts');
  const settings = await worker.evaluate(async () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const result = await chrome.storage.sync.get('save_image_as_settings');
      if (result.save_image_as_settings) return result.save_image_as_settings;
      await new Promise(done => setTimeout(done, 100));
    }
    throw new Error('Installation settings were not persisted');
  });
  assert.equal(settings.defaultFormat, 'png');
  assert.equal(settings.enabledFormats.length, 9);
  evidence.checks.push('Installation persists default settings in chrome.storage.sync');

  const popup = await context.newPage();
  popup.on('pageerror', err => pageErrors.push(String(err)));
  await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  assert.ok((await popup.title()).includes('Save Image As'));
  const conversion = await popup.evaluate(async () => {
    return await chrome.runtime.sendMessage({
      type: 'CONVERT_IMAGE_REQUEST', id: 'phase01-runtime-conversion',
      source: { type: 'svg-string', data: '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="8" height="6" fill="red"/></svg>' },
      targetFormat: 'png',
    });
  });
  assert.equal(conversion.id, 'phase01-runtime-conversion');
  assert.equal(conversion.success, true, conversion.error);
  assert.equal(conversion.width, 8);
  assert.equal(conversion.height, 6);
  assert.match(conversion.dataUrl, /^data:image\/png;base64,/);
  evidence.checks.push('Popup loads and service worker creates the offscreen document for a real Canvas conversion');

  const pong = await worker.evaluate(async () => await chrome.runtime.sendMessage({ type: 'OFFSCREEN_PING', id: 'phase01-runtime-ping' }));
  assert.equal(pong.type, 'OFFSCREEN_PONG');
  assert.equal(pong.id, 'phase01-runtime-ping');
  assert.equal(typeof pong.timestamp, 'number');
  const contexts = await worker.evaluate(async () => await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }));
  assert.equal(contexts.length, 1);
  assert.ok(contexts[0].documentUrl.endsWith('/src/offscreen/offscreen.html'));
  evidence.checks.push('Exactly one offscreen document exists and returns a correlated, timestamped pong to the service worker');

  const page = await context.newPage();
  page.on('pageerror', err => pageErrors.push(String(err)));
  const fixtureUrl = `http://127.0.0.1:${server.address().port}/`;
  await page.goto(fixtureUrl);
  await page.locator('#fixture').click({ button: 'right' });
  const inspection = await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: `${url}*` });
    return await chrome.tabs.sendMessage(tab.id, { type: 'INSPECT_ELEMENT_REQUEST', id: 'phase01-runtime-inspect' });
  }, fixtureUrl);
  assert.equal(inspection.type, 'INSPECT_ELEMENT_RESPONSE');
  assert.equal(inspection.id, 'phase01-runtime-inspect');
  assert.deepEqual(pageErrors, []);
  evidence.checks.push('Built classic content script loads on an HTTP page and answers a correlated inspection request without page errors');
  evidence.status = 'passed';
  evidence.browser = await context.browser().version();
  await writeFile(new URL('./01-RUNTIME-EVIDENCE.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await context?.close();
  await new Promise(done => server.close(done));
  assert.ok(resolve(profile).startsWith(resolve(tmpdir()) + '\\save-image-as-phase01-'));
  await rm(profile, { recursive: true, force: true });
}
