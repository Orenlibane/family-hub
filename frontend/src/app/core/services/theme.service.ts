import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ThemeAssets {
  mascots: string[];           // Emoji mascots for the theme
  decorations: string[];       // Background decorations
  progressIcons: string[];     // Icons for progress indicators
  celebrationEmojis: string[]; // Emojis for celebrations/rewards
  backgroundElements: string[]; // Floating background elements
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
  colors: {
    primary: string;
    secondary: string;
    background: string;
    backgroundGradient: string;
    surface: string;
    text: string;
    textMuted: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
  assets: ThemeAssets;
  animations: ThemeAnimations;
  available: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'family-hub-ui-theme';

  // Available UI themes with full configuration
  readonly themes: UITheme[] = [
    {
      id: 'cosmic',
      name: 'Cosmic Space',
      nameHe: 'חלל קוסמי',
      description: 'Deep space theme with planets, stars, nebulae, chinchillas & robots',
      descriptionHe: 'עיצוב חלל עמוק עם כוכבי לכת, כוכבים, ערפיליות, שינשילות ורובוטים',
      preview: '🚀',
      colors: {
        primary: '#6b21a8',
        secondary: '#db2777',
        background: '#0a0a1a',
        backgroundGradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
        surface: 'rgba(30, 20, 50, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fbbf24',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      assets: {
        mascots: ['🐹', '🤖'],  // Chinchilla & Robot
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
    {
      id: 'candy',
      name: 'Rainbow Unicorn',
      nameHe: 'חד קרן קשת',
      description: 'Magical theme with rainbows, unicorns, sparkles & sweet treats',
      descriptionHe: 'עיצוב קסום עם קשתות, חדי קרן, ניצוצות וממתקים',
      preview: '🦄',
      colors: {
        primary: '#ec4899',
        secondary: '#a855f7',
        background: '#fdf2f8',
        backgroundGradient: 'linear-gradient(135deg, #fdf2f8 0%, #fae8ff 50%, #f0f9ff 100%)',
        surface: 'rgba(255, 255, 255, 0.9)',
        text: '#1f2937',
        textMuted: 'rgba(31, 41, 55, 0.7)',
        accent: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      assets: {
        mascots: ['🦄', '🧚'],  // Unicorn & Fairy
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
    {
      id: 'ocean',
      name: 'Ocean Adventure',
      nameHe: 'הרפתקת אוקיינוס',
      description: 'Underwater theme with fish, corals, submarines & mermaids',
      descriptionHe: 'עיצוב תת-ימי עם דגים, אלמוגים, צוללות ובתולות ים',
      preview: '🐠',
      colors: {
        primary: '#0891b2',
        secondary: '#06b6d4',
        background: '#0c4a6e',
        backgroundGradient: 'linear-gradient(135deg, #0c4a6e 0%, #164e63 50%, #083344 100%)',
        surface: 'rgba(8, 51, 68, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fcd34d',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
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
    {
      id: 'forest',
      name: 'Enchanted Forest',
      nameHe: 'יער קסום',
      description: 'Magical forest with fairies, mushrooms, animals & trees',
      descriptionHe: 'יער קסום עם פיות, פטריות, חיות ועצים',
      preview: '🌲',
      colors: {
        primary: '#15803d',
        secondary: '#84cc16',
        background: '#14532d',
        backgroundGradient: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #052e16 100%)',
        surface: 'rgba(5, 46, 22, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fbbf24',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
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
    {
      id: 'safari',
      name: 'Safari Adventure',
      nameHe: 'הרפתקת ספארי',
      description: 'African safari with lions, elephants, zebras & sunsets',
      descriptionHe: 'ספארי אפריקאי עם אריות, פילים, זברות ושקיעות',
      preview: '🦁',
      colors: {
        primary: '#d97706',
        secondary: '#f59e0b',
        background: '#78350f',
        backgroundGradient: 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #451a03 100%)',
        surface: 'rgba(69, 26, 3, 0.8)',
        text: '#ffffff',
        textMuted: 'rgba(255, 255, 255, 0.7)',
        accent: '#fcd34d',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
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
    },
    {
      id: 'minimal',
      name: 'Clean & Simple',
      nameHe: 'נקי ופשוט',
      description: 'Minimalist design with clean lines and soft colors',
      descriptionHe: 'עיצוב מינימליסטי עם קווים נקיים וצבעים רכים',
      preview: '✨',
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        background: '#f8fafc',
        backgroundGradient: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
        surface: 'rgba(255, 255, 255, 0.95)',
        text: '#1e293b',
        textMuted: 'rgba(30, 41, 59, 0.7)',
        accent: '#0ea5e9',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      assets: {
        mascots: ['✨', '💫'],
        decorations: ['○', '◌', '□', '◇', '△'],
        progressIcons: ['✓', '★', '●'],
        celebrationEmojis: ['✓', '★', '✨', '●', '◆'],
        backgroundElements: ['·', '°', '○', '◌', '□']
      },
      animations: {
        floatDuration: '40s',
        glowColor: 'rgba(99, 102, 241, 0.2)',
        particleType: 'sparkles'
      },
      available: false
    }
  ];

  private readonly _currentTheme$ = new BehaviorSubject<UITheme>(this.themes[0]);
  readonly currentTheme$ = this._currentTheme$.asObservable();

  constructor() {
    this.loadSavedTheme();
  }

  private loadSavedTheme(): void {
    const savedThemeId = localStorage.getItem(this.STORAGE_KEY);
    if (savedThemeId) {
      const theme = this.themes.find(t => t.id === savedThemeId && t.available);
      if (theme) {
        this._currentTheme$.next(theme);
      }
    }
  }

  setTheme(themeId: string): boolean {
    const theme = this.themes.find(t => t.id === themeId);
    if (theme && theme.available) {
      this._currentTheme$.next(theme);
      localStorage.setItem(this.STORAGE_KEY, themeId);
      this.applyThemeToDocument(theme);
      return true;
    }
    return false;
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

  // Apply theme CSS variables to document root
  private applyThemeToDocument(theme: UITheme): void {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.colors.primary);
    root.style.setProperty('--theme-secondary', theme.colors.secondary);
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-background-gradient', theme.colors.backgroundGradient);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-muted', theme.colors.textMuted);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-success', theme.colors.success);
    root.style.setProperty('--theme-warning', theme.colors.warning);
    root.style.setProperty('--theme-error', theme.colors.error);
    root.style.setProperty('--theme-glow', theme.animations.glowColor);
    root.style.setProperty('--theme-float-duration', theme.animations.floatDuration);
  }

  // Get CSS variables for inline styles (useful for components)
  getThemeStyles(theme?: UITheme): { [key: string]: string } {
    const t = theme || this._currentTheme$.value;
    return {
      '--primary': t.colors.primary,
      '--secondary': t.colors.secondary,
      '--background': t.colors.background,
      '--background-gradient': t.colors.backgroundGradient,
      '--surface': t.colors.surface,
      '--text': t.colors.text,
      '--text-muted': t.colors.textMuted,
      '--accent': t.colors.accent,
      '--glow': t.animations.glowColor
    };
  }
}
