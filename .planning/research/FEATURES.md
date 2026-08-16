# Feature Research: Chromium Browser Extension for Multi-Format Image Conversion

**Domain:** Browser Extension / Image Saving & Conversion Utility
**Researched:** 2026-08-16
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Right-click context menu format sub-menu | Standard interaction paradigm for "Save Image As" | LOW | Context menu with sub-items: PNG, JPG, WebP, AVIF, BMP, GIF, ICO, PDF, SVG. |
| Client-side format conversion | Instant, private, works offline | MEDIUM | Zero server calls; runs in Offscreen Document / Canvas. |
| Direct download to Downloads folder | Core utility; saves user clicks | LOW | Integrates with `chrome.downloads.download()`. |
| Quality slider for lossy formats (JPEG, WebP, AVIF) | Compression vs fidelity balance | LOW | Configurable quality percentage in popup (e.g., default 92%). |
| Transparency handling (background fill) | Converting transparent PNG to JPG often produces black background | MEDIUM | Auto-fill transparent alpha channel with white or customizable background color when converting to JPEG. |
| High-res source detection | Modern sites serve responsive thumbnails (`srcset`, `data-src`, `currentSrc`) | MEDIUM | Content script parses `srcset` descriptor to extract highest-resolution source image. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Modifier key quick-save (Alt + Click) | Saves power users 2 clicks per image | LOW | Instant 1-click download in preferred default format. |
| CSS background-image & canvas extractor | Captures images hidden inside hero headers, divs, or HTML5 canvas games | MEDIUM | Inspects computed style `background-image: url(...)` and `<canvas>` elements. |
| Customizable File Naming Templates | Organized filenames instead of random hashes like `x8d1j9.webp` | MEDIUM | Token support: `[name]`, `[ext]`, `[page-title]`, `[domain]`, `[date]`, `[timestamp]`, `[dimensions]`. |
| Extended format support (ICO & PDF export) | Favicon generators & quick document insertion | MEDIUM | Multi-size ICO packing (16, 32, 48, 256) and single-page PDF wrapping. |
| Configurable Context Menu Visibility | Clutter-free context menu | LOW | Toggle individual format visibility on/off in the extension popup. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Full in-browser photo editor (drawing, filters, text overlays) | Feature creep | Bloats bundle size, slows down extension, degrades core 1-click speed | Keep focus purely on format conversion, resizing, and clean saving |
| Remote cloud conversion API | "Support more exotic formats" | Destroys privacy, creates server hosting costs, breaks offline mode | 100% Client-side Offscreen Canvas & micro-encoders |
| Heavy site-wide bulk image scraper | Grabbing all 500 images on a page | High memory spike, risk of browser freezing, complex batch UI | Single-click context save and lightweight selection |

## Feature Dependencies

```
[Content Script / DOM Detector]
    └──extracts──> [Image Source URL / Blob]
                        └──transfers-to──> [Service Worker]
                                               └──dispatches──> [Offscreen Document Canvas Converter]
                                                                      └──returns-blob──> [chrome.downloads Manager]
```

### Dependency Notes

- **Offscreen Canvas Converter requires Image Source URL/Blob:** The converter decodes the image bitmap, draws to canvas, applies background fill if necessary, and exports the target MIME type.
- **Customizable Naming enhances Downloads Manager:** Uses page title, domain, and original file stem to format final download filename.
- **Popup Settings enhances Context Menu:** Determines which format sub-items are visible and which default format is assigned to Alt+Click.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to deliver the core value.

- [ ] Context menu integration with sub-menu for PNG, JPG, WebP, AVIF, BMP, GIF, ICO, PDF, SVG
- [ ] 100% Client-side conversion pipeline via Chrome Offscreen Document
- [ ] High-res image extraction from `<img>`, `srcset`, and CSS `background-image`
- [ ] White background fill toggle for JPEG conversion of transparent PNGs
- [ ] Modifier key (Alt + Click) instant download in default format
- [ ] Customizable filename templates with date, title, domain, and original name tokens
- [ ] Modern settings popup UI for managing active formats, quality presets, and default action

### Add After Validation (v1.x)

- [ ] Quick dimension resize options (e.g., max width/height preset before saving)
- [ ] Batch download selected images on page via popup inspector
- [ ] Custom background fill color picker (other than white/black)

### Future Consideration (v2+)

- [ ] Animated GIF/WebP frame extraction and conversion
- [ ] OCR text extraction integration

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Core Context Menu Format Conversion (PNG, JPG, WebP) | HIGH | MEDIUM | P1 |
| Offscreen MV3 Conversion Engine | HIGH | MEDIUM | P1 |
| High-Res `srcset` & CSS Background Extraction | HIGH | MEDIUM | P1 |
| Transparency / JPEG White Background Fill | HIGH | LOW | P1 |
| Custom File Naming Rule Engine | HIGH | LOW | P1 |
| Extended Formats (AVIF, BMP, ICO, PDF, SVG) | HIGH | MEDIUM | P1 |
| Alt + Click Fast Shortcut | MEDIUM | LOW | P1 |
| Settings Popup Dashboard | HIGH | MEDIUM | P1 |
| Image Resizing Controls | MEDIUM | LOW | P2 |

---
*Feature research for: Save Image As (Chromium Extension)*
*Researched: 2026-08-16*
