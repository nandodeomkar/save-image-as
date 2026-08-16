# Save Image As - Browser Extension

## What This Is

A Chromium browser extension (Manifest V3) that enables users to easily download web images in any format they choose (JPG, PNG, WebP, AVIF, BMP, GIF, ICO, PDF, SVG). It restores frictionless image saving from modern websites serving next-gen or unsupported formats, converting images completely client-side via right-click context menus, keyboard shortcuts, and a customizable settings popup.

## Core Value

Instantly convert and download any web image into any desired format with a single click, completely locally and client-side.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Chrome Extension Manifest V3 architecture with background service worker, offscreen canvas conversion pipeline, and content scripts.
- [ ] Context menu integration with configurable sub-menu and quick-action entries for all target formats (PNG, JPG, WebP, AVIF, BMP, GIF, ICO, PDF, SVG).
- [ ] 100% Client-side conversion engine supporting raster, icon, and document formats without external server dependencies.
- [ ] High-resolution asset detection via `srcset`, `data-src`, `currentSrc`, parent `<a>` links, and full-res attributes.
- [ ] Support for CSS `background-image`, inline `<svg>`, `<canvas>`, and CORS-protected images via extension background fetch.
- [ ] Direct download to browser Downloads folder with customizable file naming templates (e.g., `[name]`, `[page-title]`, `[timestamp]`, `[ext]`).
- [ ] Configurable image quality sliders (JPEG, WebP, AVIF) and transparency handling (e.g. background fill options for opaque formats).
- [ ] Quick keyboard shortcut / modifier-click (e.g. Alt + Click) for instant saving in default format.
- [ ] Modern, clean Popup UI for user settings, active context menu format toggles, naming configuration, and quality presets.

### Out of Scope

- Server-side image processing backend — All processing must remain strictly client-side for user privacy, speed, and offline capability.
- Whole-domain scraper / site crawler — Focus is contextual single-image and page-element saving.
- Full raster image editor (layers, filters, crops, annotations) — Extension is specialized for format conversion and saving.

## Context

- Modern websites increasingly deliver images in WebP or AVIF formats that legacy photo viewers, design software, or office applications cannot open.
- Chrome Manifest V3 service workers lack DOM and Canvas APIs, requiring an Offscreen Document (`chrome.offscreen`) or `OffscreenCanvas` / `createImageBitmap` for image decoding, manipulation, and format encoding.
- Chrome extension host permissions allow background fetching of image blobs directly, overcoming page CORS restrictions that often break in-page canvas exports.

## Constraints

- **Platform**: Chromium browsers (Google Chrome, Brave, Edge, Opera, Vivaldi) Manifest V3.
- **Privacy & Security**: 100% local processing; no image data or telemetry transmitted to external services.
- **Performance**: Sub-second conversion for standard web images with lightweight bundle size.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Manifest V3 Offscreen Architecture | MV3 service workers do not support DOM Canvas; offscreen documents provide reliable cross-format conversion. | — Pending |
| 100% Local / Client-Side Conversion | Guarantees user privacy, zero server operational costs, and offline availability. | — Pending |
| Context Menu + Modifier Shortcut | Provides immediate 1-click ergonomics matching native browser "Save Image As..." workflow. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-16 after initialization*
