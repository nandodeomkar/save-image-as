# Stack Research: Chromium Browser Extension for Multi-Format Image Conversion

**Domain:** Browser Extension / Client-Side Media Conversion
**Researched:** 2026-08-16
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Chrome Extensions Manifest V3 | MV3 (Latest) | Extension platform definition | Standard for modern Chromium browsers (Chrome, Edge, Brave, Opera). |
| Offscreen Document API | MV3 Native (`chrome.offscreen`) | Headless Canvas & DOM execution | MV3 service workers do not support DOM Canvas APIs. Offscreen document provides complete Canvas, WebGL, and Media decoding access. |
| OffscreenCanvas / HTML5 Canvas API | Native Browser API | Image decoding, blitting, resizing, and encoding | Hardware-accelerated, zero-bundle overhead, native support for PNG, JPEG, WebP, AVIF. |
| Native `chrome.downloads` & `chrome.contextMenus` | MV3 Native | Contextual actions & file saving | Seamless OS downloads integration, customizable sub-menus, and custom filename rules. |

### Supporting Libraries & Utilities

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `canvas-ico` / pure-JS ICO encoder | Minimal (~2KB) | Multi-resolution Windows ICO icon generation | When exporting favicon/icon formats (16x16, 32x32, 48x48, 256x256). |
| `jspdf` (or minimal PDF image wrapper) | ^2.5.1 | Packaging single image into PDF document | When user selects "Save as PDF" format. |
| `omggif` / `gifenc` | ^1.0.0 | Lightweight client-side GIF encoding | When exporting static or frame-captured GIF format. |
| Pure-JS BMP header writer | Custom zero-dep (~1KB) | Fast 24/32-bit BMP binary encoding | When exporting BMP without external library overhead. |

### Development & Build Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Modern fast bundler & dev server | Fast HMR, clean ESM bundle output for background, content scripts, and popup. |
| `@crxjs/vite-plugin` / Custom Rollup MV3 config | Extension packaging | Automatic manifest resolution and asset output. |
| TypeScript | Type safety | Full type coverage for Chrome extension APIs (`@types/chrome`). |
| Vitest | Unit & logic testing | Fast test execution for filename template parsers and binary encoders. |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Offscreen Document Canvas | WebAssembly ImageMagick | Only if advanced filtering, CMYK conversion, or exotic formats (RAW/HEIC) are required. Canvas is 20x lighter and instant. |
| Vite + TypeScript | Plain Vanilla JS without bundler | For tiny 2-file extensions, but Vite provides superior test tooling, TS types, and clean asset management. |
| Chrome Offscreen Fetch | In-Page Fetch via Content Script | In-page fetch suffers from webpage CORS headers; background/offscreen fetch with host permissions bypasses page restrictions. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Manifest V2 | Deprecated and rejected by Chrome Web Store | Manifest V3 with Service Worker + Offscreen document |
| External Conversion APIs / Cloud Endpoints | Privacy violation, bandwidth costs, latency, requires internet/auth | 100% Client-side Offscreen Canvas & JS encoders |
| Heavy WASM FFmpeg/ImageMagick (20MB+) | Slow startup, massive extension bundle, excessive memory | Native Canvas API + lightweight micro-encoders |
| In-Page `HTMLCanvasElement` for cross-origin images | Causes `TaintedCanvas` SecurityError on `toDataURL` / `getImageData` | Background fetch to Blob + `createImageBitmap` in offscreen document |

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Chrome MV3 `chrome.offscreen` | Chromium 109+ | Universal across all modern Chrome, Edge, Brave, and Opera versions. |
| `canvas.convertToBlob({type: 'image/avif'})` | Chromium 116+ | Direct native AVIF encoding supported out-of-the-box. |

## Sources

- Chrome Developer Documentation: `chrome.offscreen` & `chrome.contextMenus`
- MDN Web Docs: `OffscreenCanvas`, `createImageBitmap`, `CanvasRenderingContext2D`

---
*Stack research for: Save Image As (Chromium Extension)*
*Researched: 2026-08-16*
