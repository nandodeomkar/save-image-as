// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { Script } from 'node:vm';
import { build } from 'vite';

describe('Manifest V3 build output', () => {
  let outputDir: string;
  let manifest: chrome.runtime.ManifestV3;

  beforeAll(async () => {
    outputDir = await mkdtemp(join(tmpdir(), 'save-image-as-build-'));
    await build({
      configFile: resolve('vite.config.ts'),
      logLevel: 'silent',
      build: { outDir: outputDir, emptyOutDir: true }
    });
    manifest = JSON.parse(await readFile(join(outputDir, 'manifest.json'), 'utf8'));
  }, 60_000);

  afterAll(async () => {
    if (outputDir && dirname(outputDir) === resolve(tmpdir())) {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('emits manifest entrypoints and correctly sized icons', async () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background?.type).toBe('module');
    const entries = [
      manifest.action!.default_popup!,
      manifest.options_ui!.page!,
      manifest.background!.service_worker!,
      'src/offscreen/offscreen.html',
      ...manifest.content_scripts!.flatMap(script => script.js ?? [])
    ];
    for (const entry of entries) {
      expect((await stat(join(outputDir, entry))).isFile(), entry).toBe(true);
    }
    for (const size of [16, 32, 48, 128]) {
      const icon = await readFile(join(outputDir, manifest.icons![size]));
      expect(icon.readUInt32BE(16)).toBe(size);
      expect(icon.readUInt32BE(20)).toBe(size);
    }
  });

  it('emits content scripts that Chrome can parse as classic JavaScript', async () => {
    for (const script of manifest.content_scripts!.flatMap(entry => entry.js ?? [])) {
      const code = await readFile(join(outputDir, script), 'utf8');
      expect(() => new Script(code, { filename: script })).not.toThrow();
    }
  });

  it('resolves scripts and styles from the popup and offscreen documents', async () => {
    for (const entry of [manifest.action!.default_popup!, 'src/offscreen/offscreen.html']) {
      const html = await readFile(join(outputDir, entry), 'utf8');
      const references = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)];
      expect(references.length, entry).toBeGreaterThan(0);
      for (const [, reference] of references) {
        const asset = reference.startsWith('/')
          ? join(outputDir, reference.slice(1))
          : resolve(outputDir, dirname(entry), reference);
        expect((await stat(asset)).isFile(), reference).toBe(true);
      }
    }
  });
});
