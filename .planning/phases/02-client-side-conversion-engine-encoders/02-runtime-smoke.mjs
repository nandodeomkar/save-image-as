import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const profile = await mkdtemp(join(tmpdir(), 'save-image-as-phase02-'));
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="6"><rect width="4" height="6" fill="red"/></svg>';
const server = createServer((_req, res) => {
  // Deliberately omit Access-Control-Allow-Origin.
  res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
  res.end(svg);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
let context;
const evidence = { checked_at: new Date().toISOString(), checks: [], formats: {}, gaps: [] };
try {
  const extensionPath = resolve('dist');
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH, headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).hostname;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  const sourceUrl = `http://127.0.0.1:${server.address().port}/image.svg`;
  const convert = (format, source = { type: 'url', data: sourceUrl }) => popup.evaluate(async ({ format, source }) => {
    return chrome.runtime.sendMessage({ type: 'CONVERT_IMAGE_REQUEST', id: `runtime-${format}-${Date.now()}`, source, targetFormat: format, quality: 0.85 });
  }, { format, source });
  for (const format of ['png', 'jpeg', 'webp', 'avif', 'bmp', 'gif', 'ico', 'pdf', 'svg']) {
    const result = await convert(format);
    if (format === 'avif' && !result.success) {
      evidence.formats[format] = { supported: false, error: result.error };
      evidence.gaps.push('Native AVIF encoding unavailable in tested Chromium; a local encoder or capability-scope decision is required.');
      continue;
    }
    assert.equal(result.success, true, `${format}: ${result.error}`);
    assert.equal(result.width, 8);
    assert.equal(result.height, 6);
    const bytes = Buffer.from(result.dataUrl.split(',')[1], 'base64');
    assert.equal(bytes.length, result.byteLength);
    evidence.formats[format] = { mimeType: result.mimeType, byteLength: bytes.length, width: result.width, height: result.height };
    if (format === 'avif' && result.mimeType !== 'image/avif') {
      evidence.gaps.push(`AVIF request returned ${result.mimeType}, not AVIF.`);
      continue;
    }
    if (format === 'png') assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    if (format === 'jpeg') assert.equal(bytes.readUInt16BE(0), 0xffd8);
    if (format === 'webp') assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    if (format === 'avif') { assert.equal(bytes.subarray(4, 8).toString(), 'ftyp'); assert.match(bytes.subarray(8, 32).toString(), /avif/); }
    if (format === 'bmp') { assert.equal(bytes.subarray(0, 2).toString(), 'BM'); assert.equal(bytes.readUInt32LE(2), bytes.length); }
    if (format === 'gif') assert.match(bytes.subarray(0, 6).toString(), /^GIF8[79]a$/);
    if (format === 'pdf') assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    if (format === 'svg') { assert.match(bytes.toString(), /<rect/); assert.doesNotMatch(bytes.toString(), /<image/); }
    if (format === 'ico') {
      assert.equal(bytes.readUInt16LE(4), 4);
      for (let i = 0; i < 4; i++) {
        const entry = 6 + i * 16;
        const offset = bytes.readUInt32LE(entry + 12);
        const length = bytes.readUInt32LE(entry + 8);
        assert.ok(offset + length <= bytes.length);
        assert.equal(bytes.subarray(offset + 1, offset + 4).toString(), 'PNG');
        assert.equal(bytes.readUInt32BE(offset + 16), [16, 32, 48, 256][i]);
      }
    }
    if (['png', 'jpeg', 'webp', 'avif'].includes(format)) {
      const pixel = await popup.evaluate(async dataUrl => {
        const image = new Image(); image.src = dataUrl; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        return [...ctx.getImageData(7, 3, 1, 1).data];
      }, result.dataUrl);
      if (format === 'jpeg') assert.ok(pixel.slice(0, 3).every(n => n > 245), `JPEG white alpha fill: ${pixel}`);
      else assert.equal(pixel[3], 0, `${format} alpha preservation`);
    }
    evidence.checks.push(`${format}: real encoded bytes, dimensions and applicable structure/pixel checks passed`);
  }
  evidence.checks.push('Remote SVG without CORS headers fetched via worker and preserved as vectors');
  evidence.browser = await context.browser().version();
  evidence.status = evidence.gaps.length ? 'gaps_found' : 'passed';
  await writeFile(new URL('./02-RUNTIME-EVIDENCE.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await context?.close();
  await new Promise(done => server.close(done));
  assert.ok(resolve(profile).startsWith(resolve(tmpdir()) + '\\save-image-as-phase02-'));
  await rm(profile, { recursive: true, force: true });
}
