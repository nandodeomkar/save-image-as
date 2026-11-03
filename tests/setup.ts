import { vi } from 'vitest';

// In-memory storage mock
let mockStorageData: Record<string, any> = {};
const storageListeners = new Set<(changes: Record<string, any>, area: string) => void>();

export const mockStorageArea = {
  get: vi.fn((keys: string[] | null, callback: (result: Record<string, any>) => void) => {
    if (!keys) {
      callback({ ...mockStorageData });
      return;
    }
    const result: Record<string, any> = {};
    for (const key of keys) {
      if (key in mockStorageData) {
        result[key] = mockStorageData[key];
      }
    }
    callback(result);
  }),
  set: vi.fn((items: Record<string, any>, callback?: () => void) => {
    const changes: Record<string, any> = {};
    for (const [key, val] of Object.entries(items)) {
      changes[key] = { oldValue: mockStorageData[key], newValue: val };
      mockStorageData[key] = val;
    }
    storageListeners.forEach((listener) => listener(changes, 'sync'));
    if (callback) callback();
  }),
  clear: vi.fn((callback?: () => void) => {
    mockStorageData = {};
    if (callback) callback();
  })
};

// Global Chrome API Mock
const mockChrome = {
  runtime: {
    id: 'test-extension',
    getURL: (path: string) => `chrome-extension://test-extension/${path}`,
    lastError: null as { message?: string } | null,
    sendMessage: vi.fn(),
    openOptionsPage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onInstalled: {
      addListener: vi.fn()
    },
    onStartup: {
      addListener: vi.fn()
    },
    getContexts: vi.fn(async () => [])
  },
  contextMenus: {
    create: vi.fn((_props: any, callback?: () => void) => {
      if (callback) callback();
    }),
    removeAll: vi.fn((callback?: () => void) => {
      if (callback) callback();
    }),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    sync: mockStorageArea,
    local: mockStorageArea,
    onChanged: {
      addListener: vi.fn((cb) => storageListeners.add(cb)),
      removeListener: vi.fn((cb) => storageListeners.delete(cb))
    }
  },
  offscreen: {
    Reason: {
      BLOBS: 'BLOBS',
      DOM_SCRAPING: 'DOM_SCRAPING',
      USER_MEDIA: 'USER_MEDIA'
    },
    hasDocument: vi.fn(async () => false),
    createDocument: vi.fn(async () => {}),
    closeDocument: vi.fn(async () => {})
  },
  downloads: {
    download: vi.fn((_options: any, cb?: (id: number) => void) => {
      if (cb) cb(12345);
    })
  },
  tabs: {
    TAB_ID_NONE: -1,
    sendMessage: vi.fn()
  }
};

(globalThis as any).chrome = mockChrome;

// ImageData Mock
export class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace: PredefinedColorSpace = 'srgb';

  constructor(widthOrData: number | Uint8ClampedArray, widthOrHeight: number, height?: number) {
    if (typeof widthOrData === 'number') {
      this.width = widthOrData;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = widthOrData;
      this.width = widthOrHeight;
      this.height = height || Math.floor(widthOrData.length / (widthOrHeight * 4));
    }
  }
}

if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = MockImageData;
}

// Canvas Mock Context
export function createMockCanvasContext() {
  let fillStyle = '#000000';
  let imageSmoothingEnabled = true;
  let imageSmoothingQuality: ImageSmoothingQuality = 'high';

  return {
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(val: string) {
      fillStyle = val;
    },
    get imageSmoothingEnabled() {
      return imageSmoothingEnabled;
    },
    set imageSmoothingEnabled(val: boolean) {
      imageSmoothingEnabled = val;
    },
    get imageSmoothingQuality() {
      return imageSmoothingQuality;
    },
    set imageSmoothingQuality(val: ImageSmoothingQuality) {
      imageSmoothingQuality = val;
    },
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    getImageData: vi.fn((_sx: number, _sy: number, sw: number, sh: number) => {
      return new MockImageData(sw, sh);
    }),
    putImageData: vi.fn()
  };
}

// Mock Image
export class MockImage {
  private _src = '';
  crossOrigin = '';
  width = 200;
  height = 100;
  naturalWidth = 200;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  decode = vi.fn(async () => {});

  get src() {
    return this._src;
  }

  set src(val: string) {
    this._src = val;
    if (val.includes('invalid') || val.includes('error')) {
      setTimeout(() => {
        if (this.onerror) this.onerror(new Error('Failed to load image'));
      }, 0);
    } else {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  }
}

(globalThis as any).Image = MockImage;

// URL object URLs Mock
if (typeof (globalThis as any).URL.createObjectURL === 'undefined') {
  (globalThis as any).URL.createObjectURL = vi.fn((_blob: any) => `blob:mock-url-${Math.random()}`);
}
if (typeof (globalThis as any).URL.revokeObjectURL === 'undefined') {
  (globalThis as any).URL.revokeObjectURL = vi.fn();
}

// Ensure HTMLCanvasElement prototype mock for jsdom
const VALID_1X1_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement, _type: string) {
    return createMockCanvasContext() as any;
  }) as any;

  HTMLCanvasElement.prototype.toDataURL = vi.fn(function (this: HTMLCanvasElement, type = 'image/png') {
    return `data:${type};base64,${VALID_1X1_PNG_BASE64}`;
  });

  HTMLCanvasElement.prototype.toBlob = vi.fn(function (this: HTMLCanvasElement, cb: (blob: Blob) => void, type = 'image/png') {
    const binary = atob(VALID_1X1_PNG_BASE64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    cb(new Blob([bytes], { type }));
  });
}

export function resetMocks() {
  mockStorageData = {};
  mockChrome.runtime.lastError = null;
  vi.clearAllMocks();
}
