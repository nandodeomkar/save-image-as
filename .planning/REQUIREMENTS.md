# Requirements: Save Image As (Chromium Extension)

**Defined:** 2026-08-16
**Core Value:** Instantly convert and download any web image into any desired format with a single click, completely locally and client-side.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Architecture & MV3 Foundation

- [ ] **ARCH-01**: Extension is packaged under Chrome Extensions Manifest V3 specification with appropriate permissions (`contextMenus`, `downloads`, `storage`, `offscreen`, `activeTab`, `scripting`, `<all_urls>`).
- [ ] **ARCH-02**: Background service worker manages extension lifecycle, context menu events, message dispatching, and offscreen document creation.
- [ ] **ARCH-03**: Offscreen document provides an isolated DOM/Canvas execution environment for media decoding and encoding without service worker DOM limitations.
- [ ] **ARCH-04**: Modern build pipeline (Vite + TypeScript + Vitest) packages background, content, offscreen, and popup scripts into optimized bundles.

### Format Conversion Engine

- [ ] **CONV-01**: Client-side conversion from raw image blob/URL to PNG format with alpha preservation.
- [ ] **CONV-02**: Client-side conversion to JPEG format with configurable compression quality slider (1-100%) and automatic white background fill for transparent alpha channels.
- [ ] **CONV-03**: Client-side conversion to WebP format with configurable quality.
- [ ] **CONV-04**: Client-side conversion to AVIF format with native browser encoder.
- [ ] **CONV-05**: Pure-JS client-side conversion to 24/32-bit Windows BMP format.
- [ ] **CONV-06**: Client-side conversion to single-frame GIF format.
- [ ] **CONV-07**: Pure-JS multi-resolution Windows ICO icon generator (16x16, 32x32, 48x48, 256x256).
- [ ] **CONV-08**: Client-side single-image PDF document generation.
- [ ] **CONV-09**: Native SVG extraction and preservation for inline `<svg>` and `*.svg` images.
- [ ] **CONV-10**: Background fetch with extension host permissions bypasses webpage CORS restrictions for cross-origin image decoding.

### DOM Inspection & Asset Detection

- [ ] **DOM-01**: Content script inspects right-clicked elements to identify `<img>`, `<picture>`, and `<source>` tags.
- [ ] **DOM-02**: `srcset` parser extracts the highest-resolution image source available based on width and pixel density descriptors.
- [ ] **DOM-03**: Detects and extracts CSS `background-image: url(...)` from container elements and CSS pseudo-elements.
- [ ] **DOM-04**: Captures raw image data from HTML5 `<canvas>` elements.
- [ ] **DOM-05**: Captures source markup from inline `<svg>` elements.
- [ ] **DOM-06**: Alt + Click (or customizable modifier) on any image triggers immediate 1-click download in the user's default format.

### Context Menu & Download Management

- [ ] **MENU-01**: Right-click context menu displays a "Save Image As..." sub-menu with active format options.
- [ ] **MENU-02**: Context menu items dynamically update when user toggles format visibility in popup settings.
- [ ] **FILE-01**: Customizable filename template engine supporting tokens: `[name]`, `[ext]`, `[page-title]`, `[domain]`, `[date]`, `[timestamp]`.
- [ ] **FILE-02**: Automatic sanitization of invalid filesystem characters (`/ \ : * ? " < > |`) and filename length truncation.
- [ ] **FILE-03**: Direct download dispatch via `chrome.downloads.download()` to the user's browser downloads folder.

### Popup Settings Dashboard

- [ ] **UI-01**: Popup interface displays format checklist to enable/disable specific formats in the context menu.
- [ ] **UI-02**: Dropdown selector to choose the default format used for 1-click shortcut downloads.
- [ ] **UI-03**: Quality slider for lossy formats (JPEG, WebP, AVIF) with live percentage readout.
- [ ] **UI-04**: Filename template input with token preview and token helper chips.
- [ ] **UI-05**: Background fill color toggle (White / Black / Transparent) for formats lacking alpha channel.
- [ ] **UI-06**: Real-time persistence and synchronization of all settings via `chrome.storage.sync`.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Batch & Editing

- **ADV-01**: Popup page inspector to list and batch-download multiple images from the active tab.
- **ADV-02**: Quick dimension resize presets (e.g., scale to 50%, max 1920px width) before export.
- **ADV-03**: Multi-frame animated GIF / WebP split and extraction.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side conversion backend | Violates privacy principle; adds latency and server hosting costs; client-side canvas handles all required formats locally. |
| Whole-site deep crawler / scraper | High memory risk, browser throttling, outside core single-image conversion utility. |
| Full raster image editor (filters, text overlays, crop tools) | Scope creep that degrades lightweight 1-click ergonomics. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ARCH-01 | Phase 1 | Pending |
| ARCH-02 | Phase 1 | Pending |
| ARCH-03 | Phase 1 | Pending |
| ARCH-04 | Phase 1 | Pending |
| CONV-01 | Phase 2 | Pending |
| CONV-02 | Phase 2 | Pending |
| CONV-03 | Phase 2 | Pending |
| CONV-04 | Phase 2 | Pending |
| CONV-05 | Phase 2 | Pending |
| CONV-06 | Phase 2 | Pending |
| CONV-07 | Phase 2 | Pending |
| CONV-08 | Phase 2 | Pending |
| CONV-09 | Phase 2 | Pending |
| CONV-10 | Phase 2 | Pending |
| DOM-01 | Phase 3 | Pending |
| DOM-02 | Phase 3 | Pending |
| DOM-03 | Phase 3 | Pending |
| DOM-04 | Phase 3 | Pending |
| DOM-05 | Phase 3 | Pending |
| DOM-06 | Phase 3 | Pending |
| MENU-01 | Phase 4 | Pending |
| MENU-02 | Phase 4 | Pending |
| FILE-01 | Phase 4 | Pending |
| FILE-02 | Phase 4 | Pending |
| FILE-03 | Phase 4 | Pending |
| UI-01 | Phase 5 | Pending |
| UI-02 | Phase 5 | Pending |
| UI-03 | Phase 5 | Pending |
| UI-04 | Phase 5 | Pending |
| UI-05 | Phase 5 | Pending |
| UI-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-16*
*Last updated: 2026-08-16 after initial definition*
