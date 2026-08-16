# Pitfalls Research: Chromium Browser Extension for Multi-Format Image Conversion

**Domain:** Browser Extension / Image Processing
**Researched:** 2026-08-16
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Tainted Canvas & CORS Security Restrictions

**What goes wrong:**
Calling `canvas.toBlob()` or `ctx.getImageData()` throws a `SecurityError: Failed to execute 'toBlob' on 'HTMLCanvasElement': Tainted canvases may not be exported` when converting images hosted on external CDNs or different domains.

**Why it happens:**
Browsers block reading pixel data from canvases drawn with cross-origin images without permissive CORS headers (`Access-Control-Allow-Origin: *`).

**How to avoid:**
Do NOT draw the image directly inside the content script page context. Instead, have the background service worker or offscreen document fetch the image binary as a `Blob` using the extension's host permissions (`*://*/*`), decode it via `createImageBitmap(blob)`, and draw the clean bitmap onto an `OffscreenCanvas`.

**Warning signs:**
`DOMException: Tainted canvas` in console when trying to save images from Amazon, Twitter/X, Instagram, or major media sites.

**Phase to address:**
Phase 1 (Core Conversion Pipeline & Extension Architecture).

---

### Pitfall 2: Manifest V3 Service Worker Lifecycle & Missing DOM

**What goes wrong:**
Attempting to use `document.createElement('canvas')`, `new Image()`, or `window` in `service-worker.ts` throws `ReferenceError: document is not defined`. Furthermore, service workers terminate after ~30 seconds of inactivity.

**Why it happens:**
Manifest V3 service workers run in a pure web worker environment without DOM access.

**How to avoid:**
Use `chrome.offscreen.createDocument()` to manage an offscreen HTML page dedicated to canvas operations and media encoding. Communicate between service worker and offscreen document via `chrome.runtime.sendMessage()`.

**Warning signs:**
Build/runtime errors mentioning undefined DOM globals in background script.

**Phase to address:**
Phase 1 (MV3 Structure & Offscreen Bridge).

---

### Pitfall 3: Black Backgrounds on Lossy Formats (JPEG/BMP) with Transparent PNGs

**What goes wrong:**
When saving a transparent PNG (e.g. logo, sticker, transparent icon) as a JPEG, transparent areas turn solid pitch black.

**Why it happens:**
JPEG does not support an alpha (transparency) channel. Standard canvas pixel blitting leaves alpha 0 as RGB (0,0,0) when flattened.

**How to avoid:**
Before drawing the image bitmap onto the canvas context during JPEG/BMP conversion, fill the entire canvas with a solid background color (default `#FFFFFF` white, with user-configurable option for black/custom color).

**Warning signs:**
Saved JPEGs of logos or cutouts have an ugly black box around them.

**Phase to address:**
Phase 2 (Conversion Engine & Format Encoders).

---

### Pitfall 4: Grabbing Low-Resolution Thumbnails Instead of Original Full-Res Image

**What goes wrong:**
User right-clicks a crisp 4K image, but the extension downloads a blurry 300px thumbnail.

**Why it happens:**
Modern responsive websites use `srcset` with multiple widths (e.g. `image-300w.jpg 300w, image-1920w.jpg 1920w`), or place low-res previews with high-res URLs in `data-src`, `data-highres`, `data-original`, or parent `<a>` tags. The basic `element.src` often points to the low-res placeholder.

**How to avoid:**
Build an intelligent asset inspector in the content script that:
1. Parses `srcset` and selects the candidate with the highest width/density descriptor.
2. Checks `currentSrc` on HTMLImageElement.
3. Checks common data attributes (`data-src`, `data-zoom-image`, `data-original`).
4. Checks if the parent `<a>` links directly to an image URL.

**Warning signs:**
Saved images have lower pixel dimensions than what the user sees when opening image in new tab.

**Phase to address:**
Phase 3 (DOM Inspector & Element Capture).

---

### Pitfall 5: Invalid Filename Characters Crashing Downloads

**What goes wrong:**
`chrome.downloads.download()` fails with `Error: Invalid filename` or fails silently when page titles or query parameters contain special characters (`/`, `\`, `?`, `:`, `*`, `"`, `<`, `>`, `|`).

**Why it happens:**
OS file systems forbid these characters in file paths.

**How to avoid:**
Strictly sanitize all interpolated tokens in the filename formatting engine, replacing illegal characters with underscores or hyphens and trimming trailing dots/spaces.

**Warning signs:**
Downloads failing on sites with complex query strings or punctuation-heavy page titles.

**Phase to address:**
Phase 4 (Download Manager & Filename Engine).

---

## "Looks Done But Isn't" Checklist

- [ ] **JPEG Conversion:** Verify transparent images export with clean white background, not black.
- [ ] **Context Menu:** Verify context menu items update immediately when user toggles formats in popup settings without requiring extension reload.
- [ ] **CORS Images:** Verify saving works on external CDNs (e.g. Cloudinary, Unsplash, Google Photos).
- [ ] **CSS Backgrounds:** Verify right-clicking hero banners or div backgrounds correctly extracts the background image URL.
- [ ] **Alt+Click Shortcut:** Verify shortcut only triggers on image elements without breaking standard link navigation or text selection.
- [ ] **ICO Format:** Verify ICO file opens cleanly in Windows Photo Viewer / Explorer with multiple valid resolutions (16x16, 32x32, 48x48, 256x256).

---
*Pitfalls research for: Save Image As (Chromium Extension)*
*Researched: 2026-08-16*
