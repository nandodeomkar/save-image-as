# Project Research Summary: Save Image As (Chromium Extension)

**Project:** Save Image As
**Domain:** Chromium Browser Extension / Client-Side Media Conversion
**Researched:** 2026-08-16
**Confidence:** HIGH

## Executive Summary

The "Save Image As" extension is a modern Chrome Manifest V3 extension designed to solve the growing user friction where modern websites serve images in next-gen formats (WebP, AVIF, blob URLs, CSS backgrounds) that older desktop software, office suites, and creative tools cannot open. The extension empowers users to download any image from any webpage into their choice of format (PNG, JPG, WebP, AVIF, BMP, GIF, ICO, PDF, SVG) with a single right-click or keyboard shortcut.

The recommended architectural approach relies on Chrome's **Offscreen Document API** paired with a background service worker. This decouples image decoding and Canvas encoding from webpage contexts, bypassing webpage CORS restrictions via background host fetch privileges while adhering to Manifest V3 service worker lifecycle constraints. All conversions run 100% client-side in the browser, guaranteeing maximum user privacy, instantaneous performance, and zero server infrastructure costs.

Key risks include handling transparent image flattening during JPEG/BMP conversions (avoiding black boxes), resolving highest-resolution assets from complex responsive `srcset` markup, and sanitizing filename tokens to prevent download errors. All of these have straightforward, proven architectural solutions documented in our research.

## Key Findings

### Recommended Stack

- **Platform Core:** Chrome Extension Manifest V3 (`manifest.json`), Background Service Worker, Offscreen Document API (`chrome.offscreen`).
- **Processing Engine:** Native HTML5 Canvas / `OffscreenCanvas`, `createImageBitmap`, `canvas.toBlob()`.
- **Micro-Encoders:** Pure-JS lightweight encoders for BMP headers, Windows multi-size ICO packing, PDF single-page wrapping, and GIF output.
- **Build & Test Pipeline:** Vite + TypeScript + Vitest with `@crxjs/vite-plugin` (or tailored Rollup config) for rapid development, type safety, and unit testing.

### Expected Features

**Must have (table stakes):**
- Right-click context menu with customizable sub-menu for PNG, JPG, WebP, AVIF, BMP, GIF, ICO, PDF, SVG.
- 100% Client-side conversion pipeline with zero external server dependency.
- Direct-to-downloads folder execution with configurable quality controls.
- Automatic white-background fill for transparent images saved to JPEG.
- High-res asset extraction (`srcset`, `currentSrc`, `data-src`).

**Should have (competitive differentiators):**
- Alt + Click modifier shortcut for instant 1-click download in preferred default format.
- Support for CSS `background-image`, `<canvas>`, and inline `<svg>`.
- Customizable filename template engine with `[name]`, `[ext]`, `[page-title]`, `[domain]`, `[date]`, `[timestamp]`.
- Clean, modern popup dashboard to toggle active context menu formats and configure defaults.

### Architecture Approach

1. **Content Script:** Inspects right-clicked DOM elements, detects high-res `srcset` candidates or CSS background URLs, captures page metadata, and listens for Alt+Click shortcuts.
2. **Background Service Worker:** Manages dynamic context menus, receives conversion requests, fetches raw image blobs using extension privileges (bypassing CORS), coordinates offscreen document lifecycle, and triggers downloads.
3. **Offscreen Canvas Sandbox:** Receives raw blobs, decodes via `createImageBitmap`, applies background alpha blending if needed, runs canvas/format encoders, and returns final Blob/ArrayBuffer.
4. **Popup UI:** Sleek Vanilla CSS / TypeScript popup synced with `chrome.storage.sync`.

### Critical Pitfalls

1. **Tainted Canvas & CORS:** Solved by fetching image blobs in background service worker with extension host permissions before offscreen canvas decode.
2. **MV3 Missing DOM:** Solved by using `chrome.offscreen` for canvas rendering instead of trying to access DOM in service workers.
3. **Black Background on JPEG:** Solved by filling canvas with solid white (`#FFFFFF`) before drawing transparent bitmaps.
4. **Low-res Thumbnails:** Solved by parsing `srcset` descriptors and checking high-res `data-*` attributes.

## Implications for Roadmap

Suggested phase structure for the project roadmap:

### Phase 1: Project Setup & Manifest V3 Extension Skeleton
- **Delivers:** Extension boilerplate with Vite, TypeScript, `manifest.json` (MV3), service worker, offscreen document bridge, and build configuration.
- **Avoids:** MV3 service worker DOM restriction errors.

### Phase 2: Client-Side Conversion Engine & Format Encoders
- **Delivers:** Offscreen canvas conversion pipeline supporting PNG, JPG, WebP, AVIF, BMP, GIF, ICO, and PDF with alpha/transparency fill logic and quality sliders.
- **Addresses:** Core format conversion requirement.
- **Avoids:** Black background on transparent JPEG/BMP conversions.

### Phase 3: DOM Element & High-Res Image Inspector
- **Delivers:** Content script for intelligent image extraction: `<img>`, `<picture>`, `srcset` high-res resolution parser, CSS `background-image`, inline `<svg>`, `<canvas>`, and Alt+Click quick-save shortcut.
- **Avoids:** Blurry low-resolution thumbnail downloads and unclickable CSS background images.

### Phase 4: Context Menu, Filename Template Engine & Downloads Integration
- **Delivers:** Dynamic `chrome.contextMenus` hierarchy, customizable filename formatting engine with token sanitization, and seamless `chrome.downloads` integration.
- **Avoids:** Download failures due to invalid filename characters.

### Phase 5: Popup Settings Dashboard & Customization UI
- **Delivers:** Sleek, accessible extension popup to toggle active context menu formats, choose default format, set JPEG/WebP compression quality, customize filename rules, and live-sync with `chrome.storage`.

### Phase 6: End-to-End Verification, Edge-Case Hardening & Packaging
- **Delivers:** Comprehensive test suite (unit tests for encoders, template parser, and DOM inspector), test HTML fixture with all image types (CORS, srcset, SVG, canvas, transparent PNG, CSS background), and production zip packaging.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Standard Chrome MV3 APIs + HTML5 Canvas are mature and fully documented. |
| Features | HIGH | Clear scope aligned with user requirements and standard browser extension UX. |
| Architecture | HIGH | Proven Offscreen Document + Service Worker pattern recommended by Google Chrome team. |
| Pitfalls | HIGH | All common pitfalls (CORS, alpha black-out, MV3 lifecycle) identified with clear mitigations. |

**Overall confidence:** HIGH

---
*Research completed: 2026-08-16*
*Ready for roadmap: yes*
