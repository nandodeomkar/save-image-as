/**
 * 1-Click Shortcut Handler
 * Intercepts modifier clicks (Alt+Click / Option+Click) on web image elements,
 * provides immediate visual feedback, and dispatches quick-save download requests.
 */

import {
  ExtensionSettings,
  InspectElementResult,
  QuickSaveImageRequestMessage,
  QuickSaveImageResponseMessage,
  ShortcutModifier,
  DEFAULT_SETTINGS
} from '../utils/types';
import { inspectElement } from './dom-inspector';
import { sendMessage } from '../utils/messaging';

export class ShortcutHandler {
  private currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };
  private isListening = false;
  private boundClickHandler: (event: MouseEvent) => void;

  constructor(initialSettings?: Partial<ExtensionSettings>) {
    if (initialSettings) {
      this.updateSettings(initialSettings);
    }
    this.boundClickHandler = this.handleClick.bind(this);
  }

  /**
   * Updates internal settings (e.g. active shortcut modifier)
   */
  public updateSettings(settings: Partial<ExtensionSettings>): void {
    this.currentSettings = {
      ...this.currentSettings,
      ...settings
    };
  }

  /**
   * Starts listening for modifier clicks on the active page
   */
  public start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    window.addEventListener('click', this.boundClickHandler, true);
    this.isListening = true;
  }

  /**
   * Stops listening for modifier clicks
   */
  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('click', this.boundClickHandler, true);
    this.isListening = false;
  }

  /**
   * Checks if the required modifier key was active during the event
   */
  public isModifierActive(event: MouseEvent, modifier: ShortcutModifier): boolean {
    switch (modifier) {
      case 'alt':
        return event.altKey;
      case 'ctrl':
        return event.ctrlKey || event.metaKey; // Cmd on macOS
      case 'shift':
        return event.shiftKey;
      case 'none':
        return true;
      default:
        return event.altKey;
    }
  }

  /**
   * Handles click events in the capture phase
   */
  private async handleClick(event: MouseEvent): Promise<void> {
    const modifier = this.currentSettings.shortcutModifier;
    if (modifier === 'none' && !event.altKey) {
      // Default to requiring explicit modifier unless strictly configured
      return;
    }

    if (!this.isModifierActive(event, modifier)) {
      return;
    }

    const target = event.target as HTMLElement;
    if (!target) return;

    // Inspect the clicked element and its hierarchy
    const inspection = inspectElement(target, {
      clientX: event.clientX,
      clientY: event.clientY
    });

    if (!inspection || !inspection.url) {
      return; // Not an image/asset element
    }

    // Prevent default browser behavior (e.g. following <a> links or downloading HTML)
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Trigger brief visual feedback animation on target element
    this.showSaveFeedback(target);

    // Dispatch quick save request to background service worker
    await this.dispatchQuickSave(inspection);
  }

  /**
   * Displays a subtle, non-destructive flash animation on the saved element
   */
  private showSaveFeedback(element: HTMLElement): void {
    try {
      const originalOutline = element.style.outline;
      const originalTransition = element.style.transition;

      element.style.transition = 'outline 0.15s ease-in-out';
      element.style.outline = '3px solid #3b82f6';

      setTimeout(() => {
        element.style.outline = '3px solid transparent';
        setTimeout(() => {
          element.style.outline = originalOutline;
          element.style.transition = originalTransition;
        }, 150);
      }, 250);
    } catch {
      // Ignore any styling failures on cross-origin elements
    }
  }

  /**
   * Sends quick save request to background worker
   */
  public async dispatchQuickSave(
    inspection: InspectElementResult
  ): Promise<QuickSaveImageResponseMessage> {
    const message: QuickSaveImageRequestMessage = {
      type: 'QUICK_SAVE_IMAGE_REQUEST',
      id: `qs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      elementResult: inspection,
      format: this.currentSettings.defaultFormat
    };

    try {
      const response = await sendMessage<
        QuickSaveImageResponseMessage,
        QuickSaveImageRequestMessage
      >(message);
      return response;
    } catch (err) {
      console.error('[ShortcutHandler] Quick save failed:', err);
      return {
        type: 'QUICK_SAVE_IMAGE_RESPONSE',
        id: message.id,
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
}
