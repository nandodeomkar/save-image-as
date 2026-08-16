# Roadmap: Save Image As (Chromium Extension)

## Overview

A structured, 6-phase journey to build a complete, production-ready Chromium browser extension (Manifest V3) that allows users to instantly download and convert web images into any format (PNG, JPG, WebP, AVIF, BMP, GIF, ICO, PDF, SVG) directly from the context menu, keyboard shortcuts, and a settings dashboard.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Project Architecture & Manifest V3 Foundation** - Setup Vite + TypeScript build system, MV3 manifest, background service worker, and offscreen document IPC bridge.
- [x] **Phase 2: Client-Side Conversion Engine & Encoders** - Build the complete client-side conversion pipeline (Canvas, alpha fill, BMP/ICO/PDF/GIF encoders, quality controls).
- [x] **Phase 3: DOM Inspection & High-Res Extraction** - Implement content script to detect images, parse responsive `srcset` for highest resolution, capture CSS background images/canvas/SVGs, and bind Alt+Click shortcut.
- [x] **Phase 4: Context Menu, Download Manager & Filename Engine** - Build dynamic context menus, tokenized filename template formatter with sanitization, and `chrome.downloads` integration.
- [x] **Phase 5: Popup Settings Dashboard & Storage Sync** - Create a sleek, modern popup UI to customize active context menu formats, default shortcut action, compression quality, and filename rules.
- [ ] **Phase 6: End-to-End Verification, Fixtures & Extension Packaging** - Build test fixture with all image edge cases (CORS, srcset, SVG, canvas, transparent PNG), run full test suite, and bundle production extension.

## Phase Details
<!-- truncated details handled below -->


## Phase Details

### Phase 1: Project Architecture & Manifest V3 Foundation
**Goal**: Establish the core Manifest V3 extension project with Vite, TypeScript, typed messaging, background service worker, and the offscreen document bridge.
**Depends on**: Nothing (first phase)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. Project builds cleanly into `dist/` with valid `manifest.json` loadable in Chrome (`chrome://extensions`).
  2. Background service worker initializes and creates/manages an offscreen document on demand.
  3. Service worker and offscreen document can exchange typed RPC messages without errors.
**Plans**: 2 plans

Plans:
- [x] 01-01: Initialize TypeScript & Vite build configuration with Manifest V3 schema, icons, and package dependencies.
- [x] 01-02: Implement background service worker lifecycle, offscreen document manager, and shared typed IPC messaging layer.

---

### Phase 2: Client-Side Conversion Engine & Encoders
**Goal**: Build a 100% client-side image conversion pipeline in the offscreen document supporting all 9 target formats with alpha preservation and background fill controls.
**Depends on**: Phase 1
**Requirements**: CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, CONV-06, CONV-07, CONV-08, CONV-09, CONV-10
**Success Criteria** (what must be TRUE):
  1. Any input image blob can be converted into PNG, JPG, WebP, AVIF, BMP, GIF, ICO, and PDF entirely in-browser.
  2. Transparent PNGs converted to JPEG render onto a crisp solid background (white by default) without black box artifacts.
  3. Lossy formats respect the user's compression quality percentage.
  4. Unit tests verify binary encoders (BMP headers, multi-res ICO container, PDF wrapper) generate valid headers and data.
**Plans**: 3 plans

Plans:
- [x] 02-01: Implement Canvas / OffscreenCanvas rendering engine with `createImageBitmap`, dimension scaling, and alpha-blending background fill.
- [x] 02-02: Implement pure-JS format encoders for BMP, Windows multi-resolution ICO, single-image PDF, and GIF.
- [x] 02-03: Integrate native Canvas encoders (PNG, JPEG, WebP, AVIF), add CORS bypass background fetch, and write unit tests for all encoders.

---

### Phase 3: DOM Inspection & High-Res Extraction
**Goal**: Build the content script DOM inspector that extracts highest-resolution images from `<img>`, `<picture>`, `srcset`, CSS `background-image`, `<canvas>`, and inline `<svg>`, plus shortcut listeners.
**Depends on**: Phase 2
**Requirements**: DOM-01, DOM-02, DOM-03, DOM-04, DOM-05, DOM-06
**Success Criteria** (what must be TRUE):
  1. Right-clicking or hovering an `<img>` extracts its highest-resolution candidate from `srcset` or `currentSrc`.
  2. Right-clicking a container with a CSS `background-image` extracts the background image URL.
  3. Right-clicking an inline `<svg>` or `<canvas>` extracts raw SVG source or canvas data.
  4. Alt + Click on any image instantly initiates download in the default format.
**Plans**: 2 plans

Plans:
- [x] 03-01: Build DOM element inspector supporting `<img>`, `<picture>`, `srcset` resolution ranking, CSS `background-image`, `<canvas>`, and inline `<svg>`.
- [x] 03-02: Implement Alt + Click shortcut listener and content script communication bridge with background service worker.

---

### Phase 4: Context Menu, Download Manager & Filename Engine
**Goal**: Implement dynamic context menu hierarchy, customizable filename template engine with strict sanitization, and direct browser download dispatch.
**Depends on**: Phase 3
**Requirements**: MENU-01, MENU-02, FILE-01, FILE-02, FILE-03
**Success Criteria** (what must be TRUE):
  1. Right-clicking any image displays the "Save Image As..." context menu with active format sub-items.
  2. Clicking a format converts the image and saves it directly to the browser Downloads folder.
  3. Filename templates (e.g. `[name]`, `[ext]`, `[page-title]`, `[timestamp]`) format filenames properly and sanitize illegal OS path characters.
**Plans**: 2 plans

Plans:
- [x] 04-01: Build customizable filename template engine with token interpolation, sanitization, and unit tests.
- [x] 04-02: Implement dynamic `chrome.contextMenus` generator and `chrome.downloads` manager in the service worker.

---

### Phase 5: Popup Settings Dashboard & Storage Sync
**Goal**: Create a sleek, modern popup UI to configure active format menus, default 1-click format, compression quality, and filename patterns.
**Depends on**: Phase 4
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. User can toggle which formats appear in the right-click context menu.
  2. User can select their default format for Alt+Click downloads.
  3. User can adjust the JPEG/WebP/AVIF quality slider with live visual readout.
  4. User can customize the filename template with live preview against example tokens.
  5. All settings persist in `chrome.storage.sync` and immediately take effect without reloading.
**Plans**: 2 plans

Plans:
- [x] 05-01: Build popup interface markup, modern CSS design system, and responsive layout.
- [x] 05-02: Implement popup settings state controller, live token preview, quality slider bindings, and `chrome.storage.sync` sync.

---

### Phase 6: End-to-End Verification, Fixtures & Extension Packaging
**Goal**: Validate the complete extension workflow against realistic test fixtures, run full automated test suite, and bundle production distribution.
**Depends on**: Phase 5
**Requirements**: Verification & Polish across all ARCH, CONV, DOM, MENU, FILE, and UI requirements
**Success Criteria** (what must be TRUE):
  1. Comprehensive test HTML fixture verifies conversions across transparent PNGs, responsive srcset, CSS backgrounds, SVGs, and cross-origin CDNs.
  2. All automated Vitest tests pass 100%.
  3. Extension builds into clean, production-ready `dist/` package with zero warnings or CSP violations.
**Plans**: 2 plans

Plans:
- [x] 06-01: Create comprehensive test fixture web page and end-to-end verification workflows for all image scenarios.
- [x] 06-02: Run full automated test suite, verify extension loading in Chromium browser, and generate production zip artifact.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Architecture & Manifest V3 Foundation | 2/2 | Complete | 2026-08-16 |
| 2. Client-Side Conversion Engine & Encoders | 3/3 | Complete | 2026-08-16 |
| 3. DOM Inspection & High-Res Extraction | 2/2 | Complete | 2026-08-16 |
| 4. Context Menu, Download Manager & Filename Engine | 2/2 | Complete | 2026-08-16 |
| 5. Popup Settings Dashboard & Storage Sync | 2/2 | Complete | 2026-08-16 |
| 6. End-to-End Verification, Fixtures & Extension Packaging | 2/2 | Complete | 2026-08-16 |

---
*Roadmap defined: 2026-08-16*
*Last updated: 2026-08-16 after completing all 6 phases*
