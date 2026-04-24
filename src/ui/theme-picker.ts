export type Theme = 'default' | 'whitey';

export interface ThemePickerOptions {
  defaultTheme?: Theme;
  onChange?: (theme: Theme) => void;
}

export class ThemePicker {
  private currentTheme: Theme;
  private onChange?: (theme: Theme) => void;

  constructor(options: ThemePickerOptions = {}) {
    this.currentTheme = options.defaultTheme || this.loadSavedTheme();
    this.onChange = options.onChange;
  }

  init(): void {
    this.applyTheme(this.currentTheme);
    // Don't render the dropdown - theme is controlled from native View menu
    // this.render();
  }

  private loadSavedTheme(): Theme {
    const saved = localStorage.getItem('proof-theme');
    if (saved === 'whitey' || saved === 'default') {
      return saved;
    }
    return 'default';
  }

  private saveTheme(theme: Theme): void {
    localStorage.setItem('proof-theme', theme);
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme(theme);
    this.updateUI();
    this.onChange?.(theme);
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  private applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private updateUI(): void {
    const select = document.getElementById('theme-select') as HTMLSelectElement;
    if (select) {
      select.value = this.currentTheme;
    }
  }
}

// Singleton for global access
let themePickerInstance: ThemePicker | null = null;

export function initThemePicker(options?: ThemePickerOptions): ThemePicker {
  if (!themePickerInstance) {
    themePickerInstance = new ThemePicker(options);
    themePickerInstance.init();
  }
  return themePickerInstance;
}

export function getThemePicker(): ThemePicker | null {
  return themePickerInstance;
}
