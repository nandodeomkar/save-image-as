/**
 * Save Image As - Popup Settings Controller
 * Handles user settings interaction, format toggling, live preview generation,
 * slider synchronizations, and chrome.storage.sync persistence.
 */

import { FORMAT_REGISTRY, ImageFormat, ShortcutModifier, ExtensionSettings, DEFAULT_SETTINGS } from '../utils/types';
import { getSettings, saveSettings, resetSettings, onSettingsChanged } from '../utils/storage';
import { previewFilename } from '../utils/filename-helper';

const COMMON_FORMATS: ImageFormat[] = ['png', 'jpeg', 'webp', 'avif', 'svg'];

const FORMAT_TAGS: Record<ImageFormat, string> = {
  png: 'Lossless',
  jpeg: 'Photo / Lossy',
  webp: 'Modern Web',
  avif: 'Next-Gen',
  bmp: 'Bitmap',
  gif: 'Graphics',
  ico: 'Icon Container',
  pdf: 'Document',
  svg: 'Vector'
};

let currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Update the visual save status badge in the header
 */
function showSavedIndicator(saving: boolean = false): void {
  const syncBadge = document.getElementById('sync-badge');
  const syncText = document.getElementById('sync-text');
  if (!syncBadge || !syncText) return;

  if (saving) {
    syncBadge.classList.add('saving');
    syncText.textContent = 'Saving...';
  } else {
    syncBadge.classList.remove('saving');
    syncText.textContent = 'Saved';
  }
}

/**
 * Persist setting changes with visual confirmation
 */
async function applySettingChange(partial: Partial<ExtensionSettings>): Promise<void> {
  showSavedIndicator(true);
  try {
    currentSettings = await saveSettings(partial);
    showSavedIndicator(false);
  } catch (err) {
    console.error('Failed to save settings:', err);
    showSavedIndicator(false);
  }
}

/**
 * Render and bind the format toggle cards grid
 */
function renderFormatsGrid(): void {
  const container = document.getElementById('formats-grid');
  if (!container) return;

  container.innerHTML = '';
  const formatEntries = Object.entries(FORMAT_REGISTRY) as [ImageFormat, (typeof FORMAT_REGISTRY)[ImageFormat]][];

  for (const [id] of formatEntries) {
    const isEnabled = currentSettings.enabledFormats.includes(id);
    const card = document.createElement('div');
    card.className = `format-card ${isEnabled ? 'active' : ''}`;
    card.setAttribute('data-format-id', id);

    const displayName = id === 'jpeg' ? 'JPG' : id.toUpperCase();
    const tag = FORMAT_TAGS[id] || 'Image';

    card.innerHTML = `
      <div class="format-card-top">
        <span class="format-badge">${displayName}</span>
        <input type="checkbox" class="format-checkbox" id="fmt-chk-${id}" ${isEnabled ? 'checked' : ''} aria-label="Enable ${displayName}">
      </div>
      <span class="format-tag">${tag}</span>
    `;

    const checkbox = card.querySelector('input') as HTMLInputElement;

    const handleToggle = async (e: Event) => {
      e.stopPropagation();
      const willBeChecked = (e.target as HTMLElement).tagName === 'INPUT' ? checkbox.checked : !checkbox.checked;

      let newEnabled = [...currentSettings.enabledFormats];
      if (willBeChecked) {
        if (!newEnabled.includes(id)) {
          newEnabled.push(id);
        }
      } else {
        if (newEnabled.length <= 1) {
          // Prevent disabling all formats
          checkbox.checked = true;
          return;
        }
        newEnabled = newEnabled.filter((f) => f !== id);
      }

      checkbox.checked = willBeChecked;
      if (willBeChecked) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }

      await applySettingChange({ enabledFormats: newEnabled });
    };

    card.addEventListener('click', handleToggle);
    checkbox.addEventListener('change', handleToggle);

    container.appendChild(card);
  }
}

/**
 * Update the live filename preview display
 */
function updateFilenamePreview(): void {
  const templateInput = document.getElementById('filename-template') as HTMLInputElement | null;
  const previewBox = document.getElementById('filename-preview');
  if (!templateInput || !previewBox) return;

  const template = templateInput.value;
  const preview = previewFilename(template, undefined, currentSettings.defaultFormat);
  previewBox.textContent = preview;
}

/**
 * Insert a token into the filename template at current cursor position
 */
function insertTokenAtCursor(token: string): void {
  const input = document.getElementById('filename-template') as HTMLInputElement | null;
  if (!input) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const val = input.value;

  input.value = val.substring(0, start) + token + val.substring(end);
  const newPos = start + token.length;
  input.setSelectionRange(newPos, newPos);
  input.focus();

  updateFilenamePreview();
  triggerDebouncedTemplateSave(input.value);
}

/**
 * Debounce filename template changes to prevent thrashing storage
 */
function triggerDebouncedTemplateSave(template: string): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    applySettingChange({ filenameTemplate: template });
  }, 250);
}

/**
 * Update background color selection UI states
 */
function updateBackgroundColorUI(hexColor: string): void {
  const normalized = hexColor.toUpperCase();
  const swatchWhite = document.getElementById('swatch-white');
  const swatchBlack = document.getElementById('swatch-black');
  const colorPicker = document.getElementById('bg-color-picker') as HTMLInputElement | null;
  const hiddenInput = document.getElementById('bg-color-val') as HTMLInputElement | null;

  if (swatchWhite) {
    if (normalized === '#FFFFFF') {
      swatchWhite.classList.add('active');
    } else {
      swatchWhite.classList.remove('active');
    }
  }

  if (swatchBlack) {
    if (normalized === '#000000') {
      swatchBlack.classList.add('active');
    } else {
      swatchBlack.classList.remove('active');
    }
  }

  if (colorPicker) {
    colorPicker.value = hexColor;
  }
  if (hiddenInput) {
    hiddenInput.value = hexColor;
  }
}

/**
 * Sync all DOM inputs to match the current in-memory settings
 */
function populateControls(): void {
  // Default format select
  const defaultFormatSelect = document.getElementById('default-format') as HTMLSelectElement | null;
  if (defaultFormatSelect) {
    defaultFormatSelect.value = currentSettings.defaultFormat;
  }

  // Shortcut modifier select
  const shortcutModifierSelect = document.getElementById('shortcut-modifier') as HTMLSelectElement | null;
  if (shortcutModifierSelect) {
    shortcutModifierSelect.value = currentSettings.shortcutModifier;
  }

  // Notification switch
  const notifyCheckbox = document.getElementById('notify-on-success') as HTMLInputElement | null;
  if (notifyCheckbox) {
    notifyCheckbox.checked = currentSettings.notifyOnSuccess;
  }

  // Quality Sliders
  const jpegSlider = document.getElementById('quality-jpeg') as HTMLInputElement | null;
  const jpegVal = document.getElementById('val-quality-jpeg');
  if (jpegSlider && jpegVal) {
    const pct = Math.round((currentSettings.jpegQuality ?? 0.92) * 100);
    jpegSlider.value = String(pct);
    jpegVal.textContent = `${pct}%`;
  }

  const webpSlider = document.getElementById('quality-webp') as HTMLInputElement | null;
  const webpVal = document.getElementById('val-quality-webp');
  if (webpSlider && webpVal) {
    const pct = Math.round((currentSettings.webpQuality ?? 0.90) * 100);
    webpSlider.value = String(pct);
    webpVal.textContent = `${pct}%`;
  }

  const avifSlider = document.getElementById('quality-avif') as HTMLInputElement | null;
  const avifVal = document.getElementById('val-quality-avif');
  if (avifSlider && avifVal) {
    const pct = Math.round((currentSettings.avifQuality ?? 0.85) * 100);
    avifSlider.value = String(pct);
    avifVal.textContent = `${pct}%`;
  }

  // Background Fill Color
  updateBackgroundColorUI(currentSettings.backgroundColor || '#FFFFFF');

  // Filename template
  const filenameInput = document.getElementById('filename-template') as HTMLInputElement | null;
  if (filenameInput) {
    filenameInput.value = currentSettings.filenameTemplate || '[name].[ext]';
  }

  renderFormatsGrid();
  updateFilenamePreview();
}

/**
 * Attach event listeners to all interactive popup elements
 */
function bindEventListeners(): void {
  // Default format select
  const defaultFormatSelect = document.getElementById('default-format') as HTMLSelectElement | null;
  if (defaultFormatSelect) {
    defaultFormatSelect.addEventListener('change', async () => {
      const val = defaultFormatSelect.value as ImageFormat;
      await applySettingChange({ defaultFormat: val });
      updateFilenamePreview();
    });
  }

  // Shortcut modifier select
  const shortcutModifierSelect = document.getElementById('shortcut-modifier') as HTMLSelectElement | null;
  if (shortcutModifierSelect) {
    shortcutModifierSelect.addEventListener('change', async () => {
      const val = shortcutModifierSelect.value as ShortcutModifier;
      await applySettingChange({ shortcutModifier: val });
    });
  }

  // Notification toggle
  const notifyCheckbox = document.getElementById('notify-on-success') as HTMLInputElement | null;
  if (notifyCheckbox) {
    notifyCheckbox.addEventListener('change', async () => {
      await applySettingChange({ notifyOnSuccess: notifyCheckbox.checked });
    });
  }

  // Quality Sliders
  const setupQualitySlider = (sliderId: string, labelId: string, settingKey: 'jpegQuality' | 'webpQuality' | 'avifQuality') => {
    const slider = document.getElementById(sliderId) as HTMLInputElement | null;
    const label = document.getElementById(labelId);
    if (!slider || !label) return;

    slider.addEventListener('input', () => {
      label.textContent = `${slider.value}%`;
    });

    slider.addEventListener('change', async () => {
      const decimalVal = Number(slider.value) / 100;
      await applySettingChange({ [settingKey]: decimalVal });
    });
  };

  setupQualitySlider('quality-jpeg', 'val-quality-jpeg', 'jpegQuality');
  setupQualitySlider('quality-webp', 'val-quality-webp', 'webpQuality');
  setupQualitySlider('quality-avif', 'val-quality-avif', 'avifQuality');

  // Background Color presets & picker
  const swatchWhite = document.getElementById('swatch-white');
  if (swatchWhite) {
    swatchWhite.addEventListener('click', async () => {
      updateBackgroundColorUI('#FFFFFF');
      await applySettingChange({ backgroundColor: '#FFFFFF' });
    });
  }

  const swatchBlack = document.getElementById('swatch-black');
  if (swatchBlack) {
    swatchBlack.addEventListener('click', async () => {
      updateBackgroundColorUI('#000000');
      await applySettingChange({ backgroundColor: '#000000' });
    });
  }

  const colorPicker = document.getElementById('bg-color-picker') as HTMLInputElement | null;
  if (colorPicker) {
    colorPicker.addEventListener('input', () => {
      updateBackgroundColorUI(colorPicker.value.toUpperCase());
    });
    colorPicker.addEventListener('change', async () => {
      await applySettingChange({ backgroundColor: colorPicker.value.toUpperCase() });
    });
  }

  // Filename template input
  const filenameInput = document.getElementById('filename-template') as HTMLInputElement | null;
  if (filenameInput) {
    filenameInput.addEventListener('input', () => {
      updateFilenamePreview();
      triggerDebouncedTemplateSave(filenameInput.value);
    });
  }

  // Token helper chips
  const tokenChipsContainer = document.getElementById('token-chips');
  if (tokenChipsContainer) {
    tokenChipsContainer.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.token-chip') as HTMLElement | null;
      if (target && target.dataset.token) {
        insertTokenAtCursor(target.dataset.token);
      }
    });
  }

  // Quick format actions
  const btnSelectAll = document.getElementById('btn-select-all-formats');
  if (btnSelectAll) {
    btnSelectAll.addEventListener('click', async () => {
      const allFormats = Object.keys(FORMAT_REGISTRY) as ImageFormat[];
      await applySettingChange({ enabledFormats: allFormats });
      renderFormatsGrid();
    });
  }

  const btnSelectCommon = document.getElementById('btn-select-common-formats');
  if (btnSelectCommon) {
    btnSelectCommon.addEventListener('click', async () => {
      await applySettingChange({ enabledFormats: [...COMMON_FORMATS] });
      renderFormatsGrid();
    });
  }

  // Reset to defaults
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      currentSettings = await resetSettings();
      populateControls();
      showSavedIndicator(false);
    });
  }
}

/**
 * Initialize the popup settings view
 */
export async function initPopup(): Promise<void> {
  currentSettings = await getSettings();
  populateControls();
  bindEventListeners();

  // Listen for storage changes from background or other contexts
  onSettingsChanged((updated) => {
    currentSettings = updated;
    populateControls();
  });
}

// Auto-run on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initPopup().catch(console.error);
    });
  } else {
    initPopup().catch(console.error);
  }
}
