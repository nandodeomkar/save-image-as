/**
 * Supported Target Image & Document Formats
 */
export type ImageFormat =
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'bmp'
  | 'gif'
  | 'ico'
  | 'pdf'
  | 'svg';

/**
 * Format Specification Metadata
 */
export interface FormatInfo {
  id: ImageFormat;
  name: string;
  extension: string;
  mimeType: string;
  supportsAlpha: boolean;
  supportsQuality: boolean;
  description: string;
}

/**
 * Standard registry of supported format properties
 */
export const FORMAT_REGISTRY: Record<ImageFormat, FormatInfo> = {
  png: {
    id: 'png',
    name: 'PNG (Portable Network Graphics)',
    extension: 'png',
    mimeType: 'image/png',
    supportsAlpha: true,
    supportsQuality: false,
    description: 'Lossless compression with full alpha transparency.'
  },
  jpeg: {
    id: 'jpeg',
    name: 'JPG / JPEG (Joint Photographic Experts)',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    supportsAlpha: false,
    supportsQuality: true,
    description: 'Universal standard photo format with adjustable compression.'
  },
  webp: {
    id: 'webp',
    name: 'WebP (Modern Web Image)',
    extension: 'webp',
    mimeType: 'image/webp',
    supportsAlpha: true,
    supportsQuality: true,
    description: 'Modern, highly-compressed image with transparency support.'
  },
  avif: {
    id: 'avif',
    name: 'AVIF (AV1 Image File Format)',
    extension: 'avif',
    mimeType: 'image/avif',
    supportsAlpha: true,
    supportsQuality: true,
    description: 'Next-generation ultra-high efficiency compression.'
  },
  bmp: {
    id: 'bmp',
    name: 'BMP (Windows Bitmap)',
    extension: 'bmp',
    mimeType: 'image/bmp',
    supportsAlpha: false,
    supportsQuality: false,
    description: 'Uncompressed raw raster image format.'
  },
  gif: {
    id: 'gif',
    name: 'GIF (Graphics Interchange Format)',
    extension: 'gif',
    mimeType: 'image/gif',
    supportsAlpha: true,
    supportsQuality: false,
    description: 'Indexed color palette format.'
  },
  ico: {
    id: 'ico',
    name: 'ICO (Windows Icon Container)',
    extension: 'ico',
    mimeType: 'image/x-icon',
    supportsAlpha: true,
    supportsQuality: false,
    description: 'Multi-resolution Windows icon (16, 32, 48, 256px).'
  },
  pdf: {
    id: 'pdf',
    name: 'PDF (Portable Document Format)',
    extension: 'pdf',
    mimeType: 'application/pdf',
    supportsAlpha: false,
    supportsQuality: false,
    description: 'Single-page document containing high-res image.'
  },
  svg: {
    id: 'svg',
    name: 'SVG (Scalable Vector Graphics)',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    supportsAlpha: true,
    supportsQuality: false,
    description: 'Vector markup preserving exact vector geometry.'
  }
};

/**
 * Modifier key options for 1-click shortcut download
 */
export type ShortcutModifier = 'alt' | 'ctrl' | 'shift' | 'none';

/**
 * Persisted User Settings Schema
 */
export interface ExtensionSettings {
  enabledFormats: ImageFormat[];
  defaultFormat: ImageFormat;
  jpegQuality: number; // 0.1 to 1.0 (e.g. 0.92)
  webpQuality: number; // 0.1 to 1.0 (e.g. 0.90)
  avifQuality: number; // 0.1 to 1.0 (e.g. 0.85)
  backgroundColor: string; // Hex color for opaque fill (e.g. '#FFFFFF')
  filenameTemplate: string; // e.g. '[name].[ext]'
  shortcutModifier: ShortcutModifier;
  notifyOnSuccess: boolean;
}

/**
 * Default fallback settings
 */
export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabledFormats: ['png', 'jpeg', 'webp', 'avif', 'bmp', 'gif', 'ico', 'pdf', 'svg'],
  defaultFormat: 'png',
  jpegQuality: 0.92,
  webpQuality: 0.90,
  avifQuality: 0.85,
  backgroundColor: '#FFFFFF',
  filenameTemplate: '[name].[ext]',
  shortcutModifier: 'alt',
  notifyOnSuccess: false
};

/**
 * DOM Element Types Detected by Inspector
 */
export type DetectedElementType =
  | 'img'
  | 'picture'
  | 'css-background'
  | 'canvas'
  | 'svg-inline'
  | 'svg-image'
  | 'link-image'
  | 'video-poster';

/**
 * Image Inspection Result from Content Script
 */
export interface InspectElementResult {
  url: string;
  elementType: DetectedElementType;
  naturalWidth?: number;
  naturalHeight?: number;
  altText?: string;
  pageTitle: string;
  pageUrl: string;
  pageDomain: string;
  svgContent?: string;
  canvasDataUrl?: string;
}

/**
 * Inter-Process Communication (IPC) Message Types
 */
export type MessageType =
  | 'OFFSCREEN_PING'
  | 'OFFSCREEN_PONG'
  | 'CONVERT_IMAGE_REQUEST'
  | 'CONVERT_IMAGE_RESPONSE'
  | 'FETCH_IMAGE_REQUEST'
  | 'FETCH_IMAGE_RESPONSE'
  | 'INSPECT_ELEMENT_REQUEST'
  | 'INSPECT_ELEMENT_RESPONSE'
  | 'QUICK_SAVE_IMAGE_REQUEST'
  | 'QUICK_SAVE_IMAGE_RESPONSE'
  | 'DOWNLOAD_IMAGE_REQUEST'
  | 'DOWNLOAD_IMAGE_RESPONSE'
  | 'SETTINGS_UPDATED';

/**
 * Base IPC Message Interface with Correlation ID
 */
export interface BaseMessage {
  type: MessageType;
  id: string;
  timestamp?: number;
}

/**
 * Ping / Pong for Offscreen Liveness Check
 */
export interface OffscreenPingMessage extends BaseMessage {
  type: 'OFFSCREEN_PING';
}

export interface OffscreenPongMessage extends BaseMessage {
  type: 'OFFSCREEN_PONG';
}

/**
 * Image Conversion Request Payload
 */
export interface ConvertImageRequestMessage extends BaseMessage {
  type: 'CONVERT_IMAGE_REQUEST';
  source: {
    type: 'url' | 'data-url' | 'blob-buffer' | 'svg-string';
    data: string; // URL string, Data URL string, Base64 string, or raw SVG string
  };
  targetFormat: ImageFormat;
  quality?: number;
  backgroundColor?: string;
  originalFilename?: string;
  pageMetadata?: {
    pageTitle?: string;
    pageDomain?: string;
  };
}

/**
 * Image Conversion Response Payload
 */
export interface ConvertImageResponseMessage extends BaseMessage {
  type: 'CONVERT_IMAGE_RESPONSE';
  success: boolean;
  dataUrl?: string;
  mimeType?: string;
  byteLength?: number;
  width?: number;
  height?: number;
  error?: string;
}

/**
 * Background Fetch Request Payload (CORS Bypass)
 */
export interface FetchImageRequestMessage extends BaseMessage {
  type: 'FETCH_IMAGE_REQUEST';
  url: string;
}

export interface FetchImageResponseMessage extends BaseMessage {
  type: 'FETCH_IMAGE_RESPONSE';
  success: boolean;
  dataUrl?: string;
  contentType?: string;
  byteLength?: number;
  error?: string;
}

/**
 * Inspect Element Messages (Content Script DOM Inspector)
 */
export interface InspectElementRequestMessage extends BaseMessage {
  type: 'INSPECT_ELEMENT_REQUEST';
  clickCoords?: { clientX: number; clientY: number };
}

export interface InspectElementResponseMessage extends BaseMessage {
  type: 'INSPECT_ELEMENT_RESPONSE';
  success: boolean;
  result?: InspectElementResult | null;
  error?: string;
}

/**
 * 1-Click Shortcut Quick Save Request & Response
 */
export interface QuickSaveImageRequestMessage extends BaseMessage {
  type: 'QUICK_SAVE_IMAGE_REQUEST';
  elementResult: InspectElementResult;
  format?: ImageFormat;
}

export interface QuickSaveImageResponseMessage extends BaseMessage {
  type: 'QUICK_SAVE_IMAGE_RESPONSE';
  success: boolean;
  downloadId?: number;
  filename?: string;
  error?: string;
}

/**
 * Direct Download Request Payload
 */
export interface DownloadImageRequestMessage extends BaseMessage {
  type: 'DOWNLOAD_IMAGE_REQUEST';
  url: string; // Data URL, blob URL, or remote URL
  filename: string;
  saveAs?: boolean;
}

export interface DownloadImageResponseMessage extends BaseMessage {
  type: 'DOWNLOAD_IMAGE_RESPONSE';
  success: boolean;
  downloadId?: number;
  error?: string;
}

/**
 * Settings Updated Broadcast Message
 */
export interface SettingsUpdatedMessage extends BaseMessage {
  type: 'SETTINGS_UPDATED';
  settings: ExtensionSettings;
}

/**
 * Discriminated Union of all IPC Messages
 */
export type ExtensionMessage =
  | OffscreenPingMessage
  | OffscreenPongMessage
  | ConvertImageRequestMessage
  | ConvertImageResponseMessage
  | FetchImageRequestMessage
  | FetchImageResponseMessage
  | InspectElementRequestMessage
  | InspectElementResponseMessage
  | QuickSaveImageRequestMessage
  | QuickSaveImageResponseMessage
  | DownloadImageRequestMessage
  | DownloadImageResponseMessage
  | SettingsUpdatedMessage;
