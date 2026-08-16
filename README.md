# Save Image As — Fast Image Converter (Chromium Extension)

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-146%20Passed%20(100%25)-brightgreen.svg)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20(Zero%20Telemetry)-success.svg)]()

A fast, privacy-focused Chromium browser extension (Manifest V3) that enables you to instantly download and convert any web image into **JPG, PNG, WebP, AVIF, BMP, GIF, ICO, PDF, or SVG** directly from the context menu, keyboard shortcuts, or a sleek popup settings dashboard.

All conversions are processed **100% locally on your machine** using hardware-accelerated Canvas, Offscreen Documents, and pure-JS binary encoders. Zero telemetry, zero external APIs, zero server dependencies.

---

## ✨ Features

- 🖼️ **9 Export Formats**:
  - **PNG** (Lossless with transparent alpha preservation)
  - **JPG / JPEG** (Configurable compression quality + customizable alpha background fill)
  - **WebP** (Modern lightweight web compression)
  - **AVIF** (Next-gen ultra-high compression)
  - **BMP** (24/32-bit Windows bitmap format)
  - **GIF** (Single-frame animation/static capture)
  - **ICO** (Multi-resolution Windows favicon container: 16x16, 32x32, 48x48, 256x256)
  - **PDF** (Single-image high-resolution document wrapper)
  - **SVG** (Raw vector source extraction and preservation)

- ⚡ **1-Click Quick Save Shortcut**:
  - Hold <kbd>Alt</kbd> (or <kbd>Ctrl</kbd> / <kbd>Shift</kbd>) and click any image on any webpage to instantly download it in your default format with a visual flash feedback.

- 🔍 **Smart High-Resolution DOM Inspector**:
  - Automatically resolves highest-resolution candidates from responsive `srcset` (pixel density and width descriptors).
  - Handles `<picture>` and `<source>` elements.
  - Extracts CSS `background-image` from containers and pseudo-elements.
  - Captures dynamic HTML5 `<canvas>` drawings and charts.
  - Bypasses transparent overlay masks (e.g., Instagram, Twitter/X, Pinterest).
  - Bypasses CORS restrictions seamlessly using extension background host privileges.

- 🎨 **Sleek Dark Popup Dashboard**:
  - Dynamic format checklist to enable/disable specific format sub-items in the right-click menu.
  - Granular quality sliders for lossy formats (JPEG, WebP, AVIF) with real-time percentage badges.
  - Background color fill selector (White, Black, Custom Hex) for alpha-blending onto opaque formats.
  - Interactive filename template editor with clickable token chips and real-time live preview.
  - Instant synchronization via `chrome.storage.sync`.

- 🏷️ **Customizable Filename Engine**:
  - Supports dynamic tokens: `[name]`, `[ext]`, `[domain]`, `[page-title]`, `[date]`, `[dimensions]`, `[timestamp]`.
  - Automatic filesystem sanitization (removes illegal characters `\ / : * ? " < > |` and prevents Windows device name collisions like `CON`, `PRN`, `AUX`).

---

## 🚀 Installation & Loading in Browser

### Load Unpacked in Developer Mode (Chrome / Brave / Edge / Opera / Vivaldi)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/nandodeomkar/save-image-as.git
   cd save-image-as
   ```

2. Install dependencies and build the extension:
   ```bash
   npm install
   npm run build
   ```

3. Open your browser and navigate to the Extensions page:
   - **Google Chrome / Brave**: `chrome://extensions`
   - **Microsoft Edge**: `edge://extensions`
   - **Opera**: `opera://extensions`

4. Enable the **"Developer mode"** toggle in the top-right corner.

5. Click **"Load unpacked"** and select the **`dist`** folder inside this repository.

6. The extension is now active! Pin it from your browser's toolbar puzzle icon.

---

## 🧪 Testing

Open the included test fixture lab in your browser:
```
tests/fixtures/test-page.html
```
Right-click on any card to test conversions, or hold <kbd>Alt</kbd> and click to test the 1-click shortcut.

To run the automated Vitest test suite:
```bash
npm test
```

To run tests in interactive watch mode:
```bash
npm run test:watch
```

---

## 🛠️ Development & Build Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Watch mode with Vite for active extension development |
| `npm run build` | Type-checks with `tsc` and compiles optimized bundles into `dist/` |
| `npm run typecheck` | Validates TypeScript types across the entire codebase |
| `npm test` | Runs the full Vitest suite (146 automated tests across 16 test files) |
| `npm run package` | Builds, validates Manifest V3 schema, and creates `save-image-as-v1.0.0.zip` |

---

## 🏗️ Architecture

```
├── public/                     # Static icons & Manifest V3 JSON
│   ├── icons/                  # 16, 32, 48, 128px PNG icons & vector SVG
│   └── manifest.json           # Chrome MV3 manifest specification
├── src/
│   ├── background/             # MV3 Background Service Worker
│   │   ├── context-menu-manager.ts # Dynamic right-click context menu builder
│   │   ├── download-manager.ts     # CORS bypass fetch & chrome.downloads dispatcher
│   │   ├── offscreen-manager.ts    # Headless Offscreen Document lifecycle coordinator
│   │   └── service-worker.ts       # Main entry point & message router
│   ├── content/                # DOM Inspection & Content Script
│   │   ├── dom-inspector.ts        # Inspects <img>, <picture>, <svg>, <canvas>, CSS backgrounds
│   │   ├── srcset-parser.ts        # Parses density/width srcset & selects highest resolution
│   │   ├── shortcut-handler.ts     # 1-click Alt+Click shortcut handler with flash animation
│   │   └── inspector.ts            # Content script entry point & message listener
│   ├── offscreen/              # Isolated DOM/Canvas Execution Environment
│   │   ├── canvas-renderer.ts      # OffscreenCanvas blitting, alpha fill, dimension scaling
│   │   ├── converter.ts            # Conversion orchestrator across all 9 target formats
│   │   ├── encoders/               # Pure-JS binary encoders (BMP, ICO, PDF, GIF, Native)
│   │   └── offscreen.ts            # Offscreen document entry point
│   ├── popup/                  # Extension Settings Dashboard
│   │   ├── popup.html              # Modern accessible dashboard markup
│   │   ├── popup.css               # Slate dark design system & micro-interactions
│   │   └── popup.ts                # Settings state controller & live preview bindings
│   └── utils/                  # Shared Types, Storage & Filename Engine
│       ├── filename-helper.ts      # Template interpolator & filesystem sanitizer
│       ├── messaging.ts            # Strongly-typed IPC message bridge
│       ├── storage.ts              # chrome.storage.sync wrapper with default fallbacks
│       └── types.ts                # TypeScript interfaces, schemas & format registry
├── tests/                      # Unit & End-to-End Test Suites (Vitest)
│   ├── fixtures/test-page.html # 19-scenario realistic web image test page
│   └── e2e-integration.test.ts # Full-pipeline integration test suite
└── scripts/
    └── package-extension.js    # Manifest V3 validator & release ZIP packager
```

---

## 🔒 Privacy & Security

- **100% Client-Side**: No image data, browsing history, or user metadata is ever sent over the network.
- **Zero Telemetry**: No tracking, analytics, or external logging scripts.
- **Open Source**: Full source code is inspectable under the MIT license.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
