/**
 * Offscreen Document Manager
 * Manages the lifecycle of the headless Offscreen Document used for Canvas/DOM conversions in Manifest V3.
 */

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';

// Singleton creation lock to prevent race conditions during concurrent conversion requests
let creatingPromise: Promise<void> | null = null;

/**
 * Check if an offscreen document currently exists
 */
export async function hasOffscreenDocument(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.offscreen) {
    return false;
  }

  // Use native hasDocument if available (Chrome 116+)
  if ('hasDocument' in chrome.offscreen && typeof chrome.offscreen.hasDocument === 'function') {
    return await chrome.offscreen.hasDocument();
  }

  // Fallback check using getContexts if available
  if (chrome.runtime && 'getContexts' in chrome.runtime && typeof chrome.runtime.getContexts === 'function') {
    try {
      const contexts = await (chrome.runtime as any).getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      return contexts && contexts.length > 0;
    } catch {
      return false;
    }
  }

  // Fallback for clients without hasDocument / getContexts
  return false;
}

/**
 * Ensure an active offscreen document exists, creating one if necessary
 */
export async function ensureOffscreenDocument(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.offscreen) {
    throw new Error('chrome.offscreen API is not supported in this environment');
  }

  // If document already exists, return immediately
  const exists = await hasOffscreenDocument();
  if (exists) {
    return;
  }

  // If a creation request is already in-flight, await it to prevent duplicate creation
  if (creatingPromise) {
    await creatingPromise;
    return;
  }

  creatingPromise = (async () => {
    try {
      // Double-check existence inside lock
      const doubleCheck = await hasOffscreenDocument();
      if (doubleCheck) {
        return;
      }

      await chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [
          chrome.offscreen.Reason.BLOBS,
          chrome.offscreen.Reason.DOM_SCRAPING
        ],
        justification: 'Convert images between various formats using HTML5 Canvas and binary encoders'
      });

      console.info('[OffscreenManager] Offscreen document created successfully.');
    } catch (err: any) {
      // If error indicates document was already created concurrently, treat as success
      if (err?.message?.includes('Only a single offscreen document may be created') ||
          err?.message?.includes('already exists')) {
        console.info('[OffscreenManager] Offscreen document already exists.');
        return;
      }
      console.error('[OffscreenManager] Failed to create offscreen document:', err);
      throw err;
    } finally {
      creatingPromise = null;
    }
  })();

  await creatingPromise;
}

/**
 * Teardown / close the offscreen document when idle to conserve system memory
 */
export async function closeOffscreenDocument(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.offscreen || !chrome.offscreen.closeDocument) {
    return;
  }

  const exists = await hasOffscreenDocument();
  if (exists) {
    try {
      await chrome.offscreen.closeDocument();
      console.info('[OffscreenManager] Offscreen document closed.');
    } catch (err) {
      console.warn('[OffscreenManager] Error closing offscreen document:', err);
    }
  }
}
