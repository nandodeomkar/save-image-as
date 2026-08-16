/**
 * Content Script DOM Inspector & Shortcut Controller
 * Tracks context-menu targets, inspects high-resolution assets,
 * and coordinates 1-click quick-save shortcuts with the background service worker.
 */

import { inspectElement } from './dom-inspector';
import { ShortcutHandler } from './shortcut-handler';
import { getSettings } from '../utils/storage';
import {
  InspectElementRequestMessage,
  InspectElementResponseMessage,
  SettingsUpdatedMessage
} from '../utils/types';

console.info('[Inspector] Save Image As content script loaded.');

// Track the latest right-clicked DOM node and coordinates
let lastRightClickedElement: HTMLElement | null = null;
let lastRightClickCoords: { clientX: number; clientY: number } | undefined = undefined;

// Shortcut handler instance
export const shortcutHandler = new ShortcutHandler();

// Initialize shortcut handler with saved settings
(async () => {
  try {
    const settings = await getSettings();
    shortcutHandler.updateSettings(settings);
    shortcutHandler.start();
  } catch (err) {
    console.warn('[Inspector] Failed to initialize settings for shortcut handler:', err);
    shortcutHandler.start();
  }
})();

// Intercept right-click contextmenu events to record the clicked target
document.addEventListener(
  'contextmenu',
  (event: MouseEvent) => {
    lastRightClickedElement = event.target as HTMLElement;
    lastRightClickCoords = {
      clientX: event.clientX,
      clientY: event.clientY
    };
  },
  true
);

// Listen for inspector requests or settings updates from background worker / popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return false;

  // Context menu inspector request
  if (message.type === 'INSPECT_ELEMENT_REQUEST') {
    const req = message as InspectElementRequestMessage;
    const coords = req.clickCoords || lastRightClickCoords;
    const result = inspectElement(lastRightClickedElement, coords);

    const response: InspectElementResponseMessage = {
      type: 'INSPECT_ELEMENT_RESPONSE',
      id: message.id,
      success: Boolean(result),
      result
    };
    sendResponse(response);
    return false;
  }

  // Real-time settings update broadcast
  if (message.type === 'SETTINGS_UPDATED') {
    const req = message as SettingsUpdatedMessage;
    if (req.settings) {
      shortcutHandler.updateSettings(req.settings);
    }
    return false;
  }

  return false;
});
