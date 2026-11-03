import { build, defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';

const alias = { '@': resolve(__dirname, 'src') };
const sourcemap = process.env.NODE_ENV === 'development';

// Manifest content scripts are classic scripts, unlike the extension's module pages.
// Build this entry separately so it cannot import shared ESM chunks.
function classicContentScript(): Plugin {
  return {
    name: 'classic-content-script',
    async buildStart() {
      const parentBuild = this;
      const result = await build({
        configFile: false,
        publicDir: false,
        logLevel: 'silent',
        resolve: { alias },
        plugins: [{
          name: 'watch-content-dependencies',
          buildEnd() {
            for (const file of this.getWatchFiles()) parentBuild.addWatchFile(file);
          }
        }],
        build: {
          write: false,
          target: 'es2022',
          minify: false,
          sourcemap,
          lib: {
            entry: resolve(__dirname, 'src/content/inspector.ts'),
            name: 'SaveImageAsInspector',
            formats: ['iife'],
            fileName: () => 'content/inspector.js'
          }
        }
      });
      for (const bundle of Array.isArray(result) ? result : [result]) {
        if (!('output' in bundle)) throw new Error('Content script build did not produce output');
        for (const file of bundle.output) {
          this.emitFile({
            type: 'asset',
            fileName: file.fileName,
            source: file.type === 'chunk' ? file.code : file.source
          });
        }
      }
    }
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [classicContentScript()],
  resolve: { alias },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    minify: false,
    sourcemap,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background/service-worker.js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.html')) {
            return '[name].[ext]';
          }
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});
