import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { initPopup } from '../src/popup/popup';
import { saveSettings, getSettings } from '../src/utils/storage';
import { DEFAULT_SETTINGS } from '../src/utils/types';
import { resetMocks } from './setup';

const POPUP_HTML = `
  <header class="header">
    <div class="brand">
      <img src="/icons/icon-32.png" alt="Extension Icon" class="brand-icon">
      <div class="brand-title">
        <span>Save Image As</span>
        <span class="version-pill">v1.0</span>
      </div>
    </div>
    <div id="sync-badge" class="sync-badge">
      <span class="dot"></span>
      <span id="sync-text">Saved</span>
    </div>
  </header>

  <section class="section">
    <select id="default-format">
      <option value="png">PNG (.png)</option>
      <option value="jpeg">JPG / JPEG (.jpg)</option>
      <option value="webp">WebP (.webp)</option>
      <option value="avif">AVIF (.avif)</option>
      <option value="bmp">BMP (.bmp)</option>
      <option value="gif">GIF (.gif)</option>
      <option value="ico">ICO (.ico)</option>
      <option value="pdf">PDF (.pdf)</option>
      <option value="svg">SVG (.svg)</option>
    </select>

    <select id="shortcut-modifier">
      <option value="alt">Alt + Click</option>
      <option value="ctrl">Ctrl + Click</option>
      <option value="shift">Shift + Click</option>
      <option value="none">Disabled</option>
    </select>

    <input type="checkbox" id="notify-on-success">
  </section>

  <section class="section">
    <div class="formats-actions">
      <button type="button" id="btn-select-all-formats" class="btn-link">All</button>
      <button type="button" id="btn-select-common-formats" class="btn-link">Standard</button>
    </div>
    <div id="formats-grid" class="formats-grid"></div>
  </section>

  <section class="section">
    <span id="val-quality-jpeg" class="quality-value">92%</span>
    <input type="range" id="quality-jpeg" class="range-slider" min="10" max="100" step="1" value="92">

    <span id="val-quality-webp" class="quality-value">90%</span>
    <input type="range" id="quality-webp" class="range-slider" min="10" max="100" step="1" value="90">

    <span id="val-quality-avif" class="quality-value">85%</span>
    <input type="range" id="quality-avif" class="range-slider" min="10" max="100" step="1" value="85">
  </section>

  <section class="section">
    <button type="button" id="swatch-white" class="color-swatch-btn" data-color="#FFFFFF">White</button>
    <button type="button" id="swatch-black" class="color-swatch-btn" data-color="#000000">Black</button>
    <input type="color" id="bg-color-picker" value="#FFFFFF">
    <input type="hidden" id="bg-color-val" value="#FFFFFF">
  </section>

  <section class="section">
    <input type="text" id="filename-template" class="input-text" value="[name].[ext]">
    <div class="token-chips" id="token-chips">
      <button type="button" class="token-chip" data-token="[name]">[name]</button>
      <button type="button" class="token-chip" data-token="[ext]">[ext]</button>
      <button type="button" class="token-chip" data-token="[domain]">[domain]</button>
      <button type="button" class="token-chip" data-token="[page-title]">[page-title]</button>
      <button type="button" class="token-chip" data-token="[date]">[date]</button>
      <button type="button" class="token-chip" data-token="[timestamp]">[timestamp]</button>
      <button type="button" class="token-chip" data-token="[dimensions]">[dimensions]</button>
    </div>
    <div id="filename-preview" class="preview-value">sample-nature-wallpaper.png</div>
  </section>

  <footer class="footer">
    <button type="button" id="btn-reset" class="btn-secondary">Reset to Defaults</button>
  </footer>
`;

describe('Popup Settings Controller', () => {
  beforeEach(async () => {
    resetMocks();
    document.body.innerHTML = POPUP_HTML;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize controls with default settings', async () => {
    await initPopup();

    const defaultFormat = document.getElementById('default-format') as HTMLSelectElement;
    const shortcutModifier = document.getElementById('shortcut-modifier') as HTMLSelectElement;
    const notifySuccess = document.getElementById('notify-on-success') as HTMLInputElement;
    const templateInput = document.getElementById('filename-template') as HTMLInputElement;
    const jpegVal = document.getElementById('val-quality-jpeg');
    const preview = document.getElementById('filename-preview');

    expect(defaultFormat.value).toBe('png');
    expect(shortcutModifier.value).toBe('alt');
    expect(notifySuccess.checked).toBe(false);
    expect(templateInput.value).toBe('[name].[ext]');
    expect(jpegVal?.textContent).toBe('92%');
    expect(preview?.textContent).toContain('sample-nature-wallpaper.png');

    const grid = document.getElementById('formats-grid');
    const cards = grid?.querySelectorAll('.format-card');
    expect(cards?.length).toBe(9);
  });

  it('should populate stored settings when non-default settings exist', async () => {
    await saveSettings({
      defaultFormat: 'webp',
      shortcutModifier: 'ctrl',
      jpegQuality: 0.8,
      enabledFormats: ['png', 'webp'],
      filenameTemplate: '[domain]-[name].[ext]'
    });

    await initPopup();

    const defaultFormat = document.getElementById('default-format') as HTMLSelectElement;
    const shortcutModifier = document.getElementById('shortcut-modifier') as HTMLSelectElement;
    const jpegVal = document.getElementById('val-quality-jpeg');
    const templateInput = document.getElementById('filename-template') as HTMLInputElement;

    expect(defaultFormat.value).toBe('webp');
    expect(shortcutModifier.value).toBe('ctrl');
    expect(jpegVal?.textContent).toBe('80%');
    expect(templateInput.value).toBe('[domain]-[name].[ext]');
  });

  it('should update default format when select changed', async () => {
    await initPopup();

    const defaultFormat = document.getElementById('default-format') as HTMLSelectElement;
    defaultFormat.value = 'avif';
    defaultFormat.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      const updated = await getSettings();
      expect(updated.defaultFormat).toBe('avif');
    });

    const preview = document.getElementById('filename-preview');
    expect(preview?.textContent).toContain('.avif');
  });

  it('should update shortcut modifier when select changed', async () => {
    await initPopup();

    const shortcutModifier = document.getElementById('shortcut-modifier') as HTMLSelectElement;
    shortcutModifier.value = 'shift';
    shortcutModifier.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      const updated = await getSettings();
      expect(updated.shortcutModifier).toBe('shift');
    });
  });

  it('should toggle format cards and update storage', async () => {
    await initPopup();

    const gifCheckbox = document.getElementById('fmt-chk-gif') as HTMLInputElement;
    expect(gifCheckbox.checked).toBe(true);

    // Uncheck GIF
    gifCheckbox.checked = false;
    gifCheckbox.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.enabledFormats).not.toContain('gif');
      expect(settings.enabledFormats).toContain('png');
    });

    // Re-check GIF
    gifCheckbox.checked = true;
    gifCheckbox.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.enabledFormats).toContain('gif');
    });
  });

  it('should prevent disabling all formats', async () => {
    await saveSettings({ enabledFormats: ['png'] });
    await initPopup();

    const pngCheckbox = document.getElementById('fmt-chk-png') as HTMLInputElement;
    expect(pngCheckbox.checked).toBe(true);

    pngCheckbox.checked = false;
    pngCheckbox.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.enabledFormats).toContain('png');
      expect(pngCheckbox.checked).toBe(true);
    });
  });

  it('should select all and select standard formats via quick action buttons', async () => {
    await saveSettings({ enabledFormats: ['png'] });
    await initPopup();

    const btnAll = document.getElementById('btn-select-all-formats');
    btnAll?.dispatchEvent(new Event('click'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.enabledFormats.length).toBe(9);
    });

    const btnCommon = document.getElementById('btn-select-common-formats');
    btnCommon?.dispatchEvent(new Event('click'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.enabledFormats).toEqual(['png', 'jpeg', 'webp', 'avif', 'svg']);
    });
  });

  it('should handle quality sliders and update numerical label and storage', async () => {
    await initPopup();

    const jpegSlider = document.getElementById('quality-jpeg') as HTMLInputElement;
    const jpegVal = document.getElementById('val-quality-jpeg');

    jpegSlider.value = '75';
    jpegSlider.dispatchEvent(new Event('input'));
    expect(jpegVal?.textContent).toBe('75%');

    jpegSlider.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.jpegQuality).toBe(0.75);
    });
  });

  it('should update background fill color on preset click and color picker change', async () => {
    await initPopup();

    const swatchBlack = document.getElementById('swatch-black');
    swatchBlack?.dispatchEvent(new Event('click'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.backgroundColor).toBe('#000000');
    });
    expect(swatchBlack?.classList.contains('active')).toBe(true);

    const colorPicker = document.getElementById('bg-color-picker') as HTMLInputElement;
    colorPicker.value = '#FF5500';
    colorPicker.dispatchEvent(new Event('change'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.backgroundColor).toBe('#FF5500');
    });
  });

  it('should update filename template on text input and insert token chip at cursor position', async () => {
    await initPopup();

    const input = document.getElementById('filename-template') as HTMLInputElement;
    const preview = document.getElementById('filename-preview');

    input.value = '[domain]-image';
    input.dispatchEvent(new Event('input'));

    expect(preview?.textContent).toContain('wallpapers.example.com-image.png');

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.filenameTemplate).toBe('[domain]-image');
    }, { timeout: 1000 });

    // Click token chip to insert [date]
    input.selectionStart = input.value.length;
    input.selectionEnd = input.value.length;

    const dateChip = document.querySelector('.token-chip[data-token="[date]"]') as HTMLElement;
    dateChip.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(input.value).toBe('[domain]-image[date]');

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.filenameTemplate).toBe('[domain]-image[date]');
    }, { timeout: 1000 });
  });

  it('should reset all settings when clicking reset button', async () => {
    await saveSettings({
      defaultFormat: 'bmp',
      jpegQuality: 0.5,
      filenameTemplate: 'custom-file'
    });

    await initPopup();

    const defaultFormat = document.getElementById('default-format') as HTMLSelectElement;
    expect(defaultFormat.value).toBe('bmp');

    const btnReset = document.getElementById('btn-reset');
    btnReset?.dispatchEvent(new Event('click'));

    await vi.waitFor(async () => {
      const settings = await getSettings();
      expect(settings.defaultFormat).toBe(DEFAULT_SETTINGS.defaultFormat);
      expect(settings.jpegQuality).toBe(DEFAULT_SETTINGS.jpegQuality);
      expect(settings.filenameTemplate).toBe(DEFAULT_SETTINGS.filenameTemplate);
    });
  });
});
