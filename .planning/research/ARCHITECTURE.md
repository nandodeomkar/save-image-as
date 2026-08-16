# Architecture Research: Chromium Browser Extension for Multi-Format Image Conversion

**Domain:** Browser Extension / Client-Side Media Conversion
**Researched:** 2026-08-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Chrome Browser Tab                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐         ┌─────────────────────────────────┐  │
│  │ Context Menu / Action │         │ Content Script (DOM Inspector)  │  │
│  │ User triggers format  │ ──────> │ Resolves <img>, srcset, CSS bg  │  │
│  └──────────┬────────────┘         └───────────────┬─────────────────┘  │
│             │                                      │                    │
├─────────────┼──────────────────────────────────────┼────────────────────┤
│             ▼                                      ▼                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              Background Service Worker (Coordinator)              │  │
│  │ - Context menu management                                         │  │
│  │ - Fetches raw image blob (bypasses webpage CORS)                  │  │
│  │ - Manages Offscreen Document lifecycle                            │  │
│  │ - Dispatches download to chrome.downloads                         │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │                                   │
├─────────────────────────────────────┼───────────────────────────────────┤
│                                     ▼                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │               Offscreen Document (Conversion Engine)              │  │
│  │ - ImageBitmap decoding & canvas render                            │  │
│  │ - Transparency & background fill processing                       │  │
│  │ - Format encoders: PNG, JPG, WebP, AVIF, BMP, GIF, ICO, PDF       │  │
│  │ - Returns converted Blob / ArrayBuffer                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 Popup Interface (Settings Dashboard)              │  │
│  │ - Format toggles & default format picker                          │  │
│  │ - Quality slider & filename template configuration                │  │
│  │ - chrome.storage.sync synchronization                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `content-script.ts` | Listens for context menu target clicks, inspects DOM nodes (`img`, `picture`, `source`, `canvas`, CSS `background-image`), extracts highest resolution URL and page metadata (title, domain). | Injected content script with element inspection & keydown listener for Alt+Click. |
| `service-worker.ts` | Central message router, creates/manages `chrome.contextMenus`, reads user config from `chrome.storage`, fetches image blobs bypassing CORS, coordinates with offscreen document, triggers `chrome.downloads.download()`. | Manifest V3 background service worker with event-driven message dispatch. |
| `offscreen.html / offscreen.ts` | Dedicated headless canvas sandbox with full DOM/Canvas access. Receives image blobs, renders on `OffscreenCanvas` or standard `<canvas>`, encodes into target MIME type or binary format. | Registered via `chrome.offscreen.createDocument({ reasons: ['BLOBS', 'USER_MEDIA', 'DOM_SCRAPING'], ... })`. |
| `popup.html / popup.ts` | Extension settings interface for selecting active context menu items, setting default export format, tuning JPEG/WebP compression quality, and defining filename templates. | Modern Vanilla CSS & TypeScript popup syncing with `chrome.storage.sync`. |
| `encoders/` | Modular pure-JS encoders for formats without native canvas blob support (BMP binary header, ICO container, PDF stream wrapper). | Isolated, pure functions with 100% unit test coverage. |

## Recommended Project Structure

```
save-image-as/
├── manifest.json              # MV3 configuration & permissions
├── src/
│   ├── background/
│   │   ├── service-worker.ts  # Context menus, messaging, downloads
│   │   └── context-menu.ts    # Dynamic menu builder based on user settings
│   ├── content/
│   │   ├── inspector.ts       # DOM & element extractor (img, srcset, css bg)
│   │   └── shortcuts.ts       # Alt+Click event listener
│   ├── offscreen/
│   │   ├── offscreen.html     # Offscreen document entry
│   │   ├── offscreen.ts       # Offscreen message dispatcher
│   │   ├── converter.ts       # Canvas rendering, alpha blending, quality
│   │   └── encoders/          # Format specific encoding engines
│   │       ├── bmp.ts         # Pure-JS BMP writer
│   │       ├── ico.ts         # Multi-res Windows ICO packer
│   │       ├── pdf.ts         # Single-image PDF container
│   │       └── gif.ts         # Lightweight GIF encoder
│   ├── popup/
│   │   ├── popup.html         # Settings UI markup
│   │   ├── popup.css          # Modern, sleek UI styles
│   │   └── popup.ts           # Settings controller & storage binding
│   ├── utils/
│   │   ├── filename.ts        # Filename template formatter & sanitizer
│   │   ├── storage.ts         # Typed chrome.storage wrapper & defaults
│   │   └── types.ts           # Shared TypeScript interfaces & types
│   └── assets/
│       └── icons/             # 16, 32, 48, 128px extension icons
├── tests/
│   ├── filename.test.ts       # Unit tests for template tokens
│   ├── encoders.test.ts       # Unit tests for BMP, ICO, PDF writers
│   └── inspector.test.ts      # Unit tests for srcset & CSS URL parsing
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Architectural Patterns

### Pattern 1: Ephemeral Offscreen Document

**What:** Create the offscreen document on-demand when a conversion task is initiated and close or keep alive with a heartbeat while active.
**When to use:** Whenever the service worker needs to convert an image via Canvas API.
**Trade-offs:** Avoids keeping an idle document running continuously, saving browser memory while remaining snappy.

```typescript
// Background Service Worker
async function getOffscreenDocument(): Promise<void> {
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.BLOBS, chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'Convert image formats using HTML5 Canvas'
    });
  }
}
```

### Pattern 2: Background Privileged Fetch for CORS Bypass

**What:** Instead of having the webpage canvas draw a cross-origin image (which taints the canvas and blocks `toBlob()`), the service worker fetches the image blob directly using extension host permissions.
**When to use:** For all image conversions from remote URLs.
**Trade-offs:** 100% reliable image access across any web domain without tainted canvas security exceptions.

### Pattern 3: Dynamic Context Menu Sync

**What:** Update `chrome.contextMenus` whenever user changes enabled formats in the popup.
**When to use:** On extension startup and whenever `chrome.storage.onChanged` fires for menu settings.

## Data Flow

```
[User Right Clicks Image / Alt+Clicks]
    ↓
[Content Script] -> (Captures target element: <img>/srcset/css url, page title, URL)
    ↓
[Service Worker] -> (Fetches raw Image Blob with extension privileges)
    ↓
[Offscreen Doc]  -> (Decodes to ImageBitmap -> Canvas -> Alpha Fill -> Format Encoding)
    ↓
[Service Worker] -> (Formats filename from template -> Calls chrome.downloads.download())
    ↓
[Browser Downloads Folder] (Saved in chosen format!)
```

---
*Architecture research for: Save Image As (Chromium Extension)*
*Researched: 2026-08-16*
