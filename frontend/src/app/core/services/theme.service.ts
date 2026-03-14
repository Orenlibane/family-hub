import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'custom';

export interface ThemeAssets {
  mascots: string[];
  decorations: string[];
  progressIcons: string[];
  celebrationEmojis: string[];
  backgroundElements: string[];
}

export interface ThemeAnimations {
  floatDuration: string;
  glowColor: string;
  particleType: 'stars' | 'bubbles' | 'sparkles' | 'leaves' | 'hearts';
}

export interface UITheme {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  descriptionHe: string;
  preview: string;
  mode: ThemeMode;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    backgroundGradient: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textMuted: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    border: string;
  };
  assets: ThemeAssets;
  animations: ThemeAnimations;
  available: boolean;
}

export interface UserSettings {
  themeId: string;
  language: 'he' | 'en';
  notifications: {
    taskCompleted: boolean;
    rewardRequested: boolean;
    dailyReminder: boolean;
  };
  householdName?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  themeId: 'cosmic',
  language: 'he',
  notifications: {
    taskCompleted: true,
    rewardRequested: true,
    dailyReminder: false
  }
};

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_STORAGE_KEY = 'family-hub-ui-theme';
  private readonly SETTINGS_STORAGE_KEY = 'family-hub-settings';

  // All available themes
  readonly themes: UITheme[] = [
    // Light Mode (Basic)
    {
      id: 'light',
      name: 'Light Mode',
      nameHe: 'מצב בהיר',
      description: 'Clean light theme for daytime use',
      descriptionHe: 'עיצוב בהיר ונקי לשימוש יומיומי',
      preview: '☀️',
      mode: 'light',
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        background: '#f8fafc',
        backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
        surface: 'rgba(255, 255, 255, 0.95)',
        surfaceHover: 'rgba(241, 245, 249, 1)',
        text: '#1e293b',
        textMuted: 'rgba(30, 41, 59, 0.7)',
        accent: '#0ea5e9',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        border: 'rgba(0, 0, 0, 0.1)'
      },
      assets: {
        mascots: ['😊', '⭐'],
        decorations: ['○', '◌', '□', '◇', '△'],
        progressIcons: ['✓', '★', '●'],
        celebrationEmojis: ['🎉', '⭐', '✨', '👏', '🌟'],
        backgroundElements: ['·', '°', '○', '◌', '□']
      },
      animations: {
        floatDuration: '40s',
        glowColor: 'rgba(99, 102, 241, 0.15)',
        particleType: 'sparkles'
      },
      available: true
    },
    // Dark Mode (Basic)
    {
      id: 'dark',
      name: 'Dark Mode',
      nameHe: 'מצב כהה',
      description: 'Easy on the eyes dark theme',
      descriptionHe: 'עיצוב כהה נוח לעיניים',
      preview: '🌙',
      mode: 'dark',
      colors: {
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        background: '#0f172a',
        backgroundGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        surface: 'rgba(30, 41, 59, 0.8)',
        surfaceHover: 'rgba(51, 65, 85, 0.8)',
        text: '#f1f5f9',
        textMuted: 'rgba(241, 245, 249, 0.7)',
        accent: '#38bdf8',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        border: 'rgba(255, 255, 255, 0.1)'
      },
      assets: {
        mascots: ['🌙', '⭐'],
        decorations: ['○', '◌', '◯', '·', '°'],
        progressIcons: ['✓', '★', '●'],
        celebrationEmojis: ['🎉', '⭐', '✨', '👏', '🌟'],
        backgroundElements: ['·', '°', '○', '◌', '◯']
      },
      animations: {
        floatDuration: '40s',
        glowColor: 'rgba(139, 92, 246, 0.2)',
        particleType: 'sparkles'
      },
      available: true
    },
    // Cosmic Space (Custom)
    {
      id: 'cosmic',
      name: 'Cosmic Space',
      nameHe: 'חלל קוסמי',
      description: 'Deep space theme with planets, stars, nebulae, chinchillas & robots',
      descriptionHe: 'עיצוב חלל עמוק עם כוכבי לכת, כוכבים, ערפיליות, שינשילות ורובוטים',
      preview: '🚀',
      mode: 'custom',
      colors: {
        primary: '#6b21a8',
        secondary: '#db2777',
        background: '#0a0a1a',
        backgroundGradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
        surface: 'rgba(30, 20, 50, 0.8)',
        surfaceHover: 'rgba(50, 35, 80, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fbbf24',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        border: 'rgba(255, 255, 255, 0.1)'
      },
      assets: {
        mascots: ['🐹', '🤖'],
        decorations: ['🪐', '⭐', '🌙', '☄️', '🛸'],
        progressIcons: ['🚀', '🌟', '💫'],
        celebrationEmojis: ['🎉', '🌟', '🚀', '✨', '🎊'],
        backgroundElements: ['✦', '✧', '⋆', '✶', '✷']
      },
      animations: {
        floatDuration: '20s',
        glowColor: 'rgba(168, 85, 247, 0.4)',
        particleType: 'stars'
      },
      available: true
    },
    // Rainbow Unicorn (Custom)
    {
      id: 'candy',
      name: 'Rainbow Unicorn',
      nameHe: 'חד קרן קשת',
      description: 'Magical theme with rainbows, unicorns, sparkles & sweet treats',
      descriptionHe: 'עיצוב קסום עם קשתות, חדי קרן, ניצוצות וממתקים',
      preview: '🦄',
      mode: 'custom',
      colors: {
        primary: '#ec4899',
        secondary: '#a855f7',
        background: '#fdf2f8',
        backgroundGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fae8ff 50%, #f0f9ff 100%)',
        surface: 'rgba(255, 255, 255, 0.9)',
        surfaceHover: 'rgba(253, 242, 248, 1)',
        text: '#1f2937',
        textMuted: 'rgba(31, 41, 55, 0.7)',
        accent: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        border: 'rgba(236, 72, 153, 0.2)'
      },
      assets: {
        mascots: ['🦄', '🧚'],
        decorations: ['🌈', '⭐', '🌸', '🦋', '💖'],
        progressIcons: ['🌈', '⭐', '🦄'],
        celebrationEmojis: ['🎉', '🌈', '🦄', '✨', '💖'],
        backgroundElements: ['✨', '💫', '⋆', '🌟', '💕']
      },
      animations: {
        floatDuration: '15s',
        glowColor: 'rgba(236, 72, 153, 0.3)',
        particleType: 'sparkles'
      },
      available: true
    },
    // Princess (Custom - for girls)
    {
      id: 'princess',
      name: 'Princess Palace',
      nameHe: 'ארמון הנסיכות',
      description: 'Royal theme with castles, crowns, butterflies & flowers',
      descriptionHe: 'עיצוב מלכותי עם טירות, כתרים, פרפרים ופרחים',
      preview: '👑',
      mode: 'custom',
      colors: {
        primary: '#f472b6',
        secondary: '#c084fc',
        background: '#fdf4ff',
        backgroundGradient: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 50%, #fae8ff 100%)',
        surface: 'rgba(255, 255, 255, 0.95)',
        surfaceHover: 'rgba(253, 244, 255, 1)',
        text: '#581c87',
        textMuted: 'rgba(88, 28, 135, 0.7)',
        accent: '#e879f9',
        success: '#22c55e',
        warning: '#fbbf24',
        error: '#ef4444',
        border: 'rgba(244, 114, 182, 0.3)'
      },
      assets: {
        mascots: ['👸', '🦋'],
        decorations: ['👑', '🏰', '🌸', '🦋', '💎'],
        progressIcons: ['👑', '⭐', '💎'],
        celebrationEmojis: ['🎉', '👑', '💖', '✨', '🦋'],
        backgroundElements: ['✨', '💫', '🌸', '💕', '⋆']
      },
      animations: {
        floatDuration: '18s',
        glowColor: 'rgba(244, 114, 182, 0.3)',
        particleType: 'hearts'
      },
      available: true
    },
    // Ocean Adventure (Coming soon)
    {
      id: 'ocean',
      name: 'Ocean Adventure',
      nameHe: 'הרפתקת אוקיינוס',
      description: 'Underwater theme with fish, corals, submarines & mermaids',
      descriptionHe: 'עיצוב תת-ימי עם דגים, אלמוגים, צוללות ובתולות ים',
      preview: '🐠',
      mode: 'custom',
      colors: {
        primary: '#0891b2',
        secondary: '#06b6d4',
        background: '#0c4a6e',
        backgroundGradient: 'linear-gradient(135deg, #0c4a6e 0%, #164e63 50%, #083344 100%)',
        surface: 'rgba(8, 51, 68, 0.8)',
        surfaceHover: 'rgba(22, 78, 99, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fcd34d',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        border: 'rgba(6, 182, 212, 0.2)'
      },
      assets: {
        mascots: ['🐙', '🧜'],
        decorations: ['🐠', '🐚', '🪸', '🌊', '🦑'],
        progressIcons: ['🐬', '⚓', '🌊'],
        celebrationEmojis: ['🎉', '🐠', '🌊', '✨', '🧜'],
        backgroundElements: ['○', '◌', '◯', '·', '°']
      },
      animations: {
        floatDuration: '25s',
        glowColor: 'rgba(6, 182, 212, 0.3)',
        particleType: 'bubbles'
      },
      available: false
    },
    // Forest (Coming soon)
    {
      id: 'forest',
      name: 'Enchanted Forest',
      nameHe: 'יער קסום',
      description: 'Magical forest with fairies, mushrooms, animals & trees',
      descriptionHe: 'יער קסום עם פיות, פטריות, חיות ועצים',
      preview: '🌲',
      mode: 'custom',
      colors: {
        primary: '#15803d',
        secondary: '#84cc16',
        background: '#14532d',
        backgroundGradient: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #052e16 100%)',
        surface: 'rgba(5, 46, 22, 0.8)',
        surfaceHover: 'rgba(22, 101, 52, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fbbf24',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        border: 'rgba(132, 204, 22, 0.2)'
      },
      assets: {
        mascots: ['🦊', '🧚'],
        decorations: ['🌲', '🍄', '🦋', '🌿', '🌸'],
        progressIcons: ['🌱', '🌿', '🌳'],
        celebrationEmojis: ['🎉', '🌸', '🦋', '✨', '🍃'],
        backgroundElements: ['🍃', '✦', '·', '°', '✧']
      },
      animations: {
        floatDuration: '30s',
        glowColor: 'rgba(34, 197, 94, 0.3)',
        particleType: 'leaves'
      },
      available: false
    },
    // Safari (Coming soon)
    {
      id: 'safari',
      name: 'Safari Adventure',
      nameHe: 'הרפתקת ספארי',
      description: 'African safari with lions, elephants, zebras & sunsets',
      descriptionHe: 'ספארי אפריקאי עם אריות, פילים, זברות ושקיעות',
      preview: '🦁',
      mode: 'custom',
      colors: {
        primary: '#d97706',
        secondary: '#f59e0b',
        background: '#78350f',
        backgroundGradient: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #451a03 100%)',
        surface: 'rgba(69, 26, 3, 0.8)',
        surfaceHover: 'rgba(146, 64, 14, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fcd34d',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        border: 'rgba(245, 158, 11, 0.2)'
      },
      assets: {
        mascots: ['🦁', '🐘'],
        decorations: ['🌴', '🦒', '🦓', '🌅', '🌾'],
        progressIcons: ['🌅', '🦁', '🌴'],
        celebrationEmojis: ['🎉', '🦁', '🌅', '✨', '🐘'],
        backgroundElements: ['·', '°', '✦', '○', '◌']
      },
      animations: {
        floatDuration: '35s',
        glowColor: 'rgba(245, 158, 11, 0.3)',
        particleType: 'leaves'
      },
      available: false
    }
  ];

  private readonly _currentTheme$ = new BehaviorSubject<UITheme>(this.themes[2]); // Default to cosmic
  readonly currentTheme$ = this._currentTheme$.asObservable();

  private readonly _settings$ = new BehaviorSubject<UserSettings>(DEFAULT_SETTINGS);
  readonly settings$ = this._settings$.asObservable();

  constructor() {
    this.loadSettings();
    this.loadSavedTheme();
    // Apply theme on init
    setTimeout(() => this.applyThemeToDocument(this._currentTheme$.value), 0);
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(this.SETTINGS_STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        this._settings$.next({ ...DEFAULT_SETTINGS, ...settings });
      }
    } catch {
      console.warn('Failed to load settings from localStorage');
    }
  }

  private loadSavedTheme(): void {
    const settings = this._settings$.value;
    const theme = this.themes.find(t => t.id === settings.themeId && t.available);
    if (theme) {
      this._currentTheme$.next(theme);
    }
  }

  setTheme(themeId: string): boolean {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme && theme.available) {
      this._currentTheme$.next(theme);
      this.applyThemeToDocument(theme);
      // Also update settings
      const currentSettings = this._settings$.value;
      this.saveSettings({ ...currentSettings, themeId });
      return true;
    }
    return false;
  }

  saveSettings(settings: Partial<UserSettings>): void {
    const current = this._settings$.value;
    const updated = { ...current, ...settings };
    this._settings$.next(updated);
    localStorage.setItem(this.SETTINGS_STORAGE_KEY, JSON.stringify(updated));
  }

  getSettings(): UserSettings {
    return this._settings$.value;
  }

  getCurrentTheme(): UITheme {
    return this._currentTheme$.value;
  }

  getAvailableThemes(): UITheme[] {
    return this.themes.filter(t => t.available);
  }

  getAllThemes(): UITheme[] {
    return this.themes;
  }

  getBasicThemes(): UITheme[] {
    return this.themes.filter(t => t.available && (t.mode === 'light' || t.mode === 'dark'));
  }

  getCustomThemes(): UITheme[] {
    return this.themes.filter(t => t.mode === 'custom');
  }

  // Apply theme CSS variables to document root
  applyThemeToDocument(theme: UITheme): void {
    const root = document.documentElement;

    // Set color variables
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-background-gradient', theme.colors.backgroundGradient);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-surface-hover', theme.colors.surfaceHover);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-muted', theme.colors.textMuted);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-success', theme.colors.success);
    root.style.setProperty('--theme-warning', theme.colors.warning);
    root.style.setProperty('--theme-error', theme.colors.error);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-glow', theme.animations.glowColor);
    root.style.setProperty('--theme-float-duration', theme.animations.floatDuration);

    // Set body background
    document.body.style.background = theme.colors.backgroundGradient;
    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;

    // Add theme class to body for CSS targeting
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-custom');
    document.body.classList.add(`theme-${theme.mode}`);
    document.body.setAttribute('data-theme', theme.id);
  }

  // Get CSS variables for inline styles
  getThemeStyles(theme?: UITheme): { [key: string]: string } {
    const t = theme || this._currentTheme$.value;
    return {
      '--primary': t.colors.primary,
      '--secondary': t.colors.secondary,
      '--background': t.colors.background,
      '--background-gradient': t.colors.backgroundGradient,
      '--surface': t.colors.surface,
      '--surface-hover': t.colors.surfaceHover,
      '--text': t.colors.text,
      '--text-muted': t.colors.textMuted,
      '--accent': t.colors.accent,
      '--border': t.colors.border,
      '--glow': t.animations.glowColor
    };
  }

  // Check if current theme is dark
  isDarkTheme(): boolean {
    const theme = this._currentTheme$.value;
    return theme.mode === 'dark' || (theme.mode === 'custom' && this.isColorDark(theme.colors.background));
  }

  private isColorDark(color: string): boolean {
    // Simple check for dark backgrounds
    return color.startsWith('#0') || color.startsWith('#1') || color.startsWith('#2') ||
           color.includes('0a') || color.includes('0f') || color.includes('14');
  }
}
