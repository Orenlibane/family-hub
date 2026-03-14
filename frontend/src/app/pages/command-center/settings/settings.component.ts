import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, ThemeService, UITheme, UserSettings } from '../../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page" dir="rtl">
      <!-- Header -->
      <header class="settings-header">
        <div class="header-content">
          <span class="header-icon">{{ currentTheme.assets.decorations[0] || '⚙️' }}</span>
          <div>
            <h1>הגדרות</h1>
            <p>התאם אישית את החוויה שלך</p>
          </div>
          <span class="mascot">{{ currentTheme.assets.mascots[0] }}</span>
        </div>
      </header>

      <div class="settings-grid">
        <!-- Basic Mode Selection -->
        <section class="settings-card full-width">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">🎨</span>
              <h2>מצב תצוגה</h2>
            </div>
          </div>
          <p class="card-description">בחר בין מצב בהיר, כהה או עיצוב מותאם אישית</p>

          <div class="mode-selector">
            @for (theme of basicThemes; track theme.id) {
              <button
                class="mode-option"
                [class.selected]="currentTheme.id === theme.id"
                (click)="selectTheme(theme)"
              >
                <span class="mode-emoji">{{ theme.preview }}</span>
                <span class="mode-label">{{ theme.nameHe }}</span>
              </button>
            }
          </div>
        </section>

        <!-- Custom Themes Section -->
        <section class="settings-card theme-card full-width">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">✨</span>
              <h2>עיצובים מיוחדים</h2>
            </div>
            <span class="badge featured">מומלץ לילדים!</span>
          </div>
          <p class="card-description">עיצובים צבעוניים וכיפיים - כל משתמש יכול לבחור את העיצוב שלו!</p>

          <div class="themes-grid">
            @for (theme of customThemes; track theme.id) {
              <button
                class="theme-option"
                [class.selected]="currentTheme.id === theme.id"
                [class.unavailable]="!theme.available"
                (click)="selectTheme(theme)"
                [disabled]="!theme.available"
              >
                <div class="theme-preview" [style.background]="theme.colors.backgroundGradient">
                  <div class="theme-preview-accent" [style.background]="'linear-gradient(135deg, ' + theme.colors.primary + ', ' + theme.colors.secondary + ')'"></div>
                  <span class="theme-emoji">{{ theme.preview }}</span>
                  <div class="theme-mascots">
                    @for (mascot of theme.assets.mascots; track mascot) {
                      <span class="mascot-icon">{{ mascot }}</span>
                    }
                  </div>
                </div>
                <div class="theme-info">
                  <h3>{{ theme.nameHe }}</h3>
                  <p>{{ theme.descriptionHe }}</p>
                </div>
                @if (currentTheme.id === theme.id) {
                  <div class="theme-selected-badge">
                    <span>✓</span> פעיל
                  </div>
                }
                @if (!theme.available) {
                  <div class="theme-coming-soon">
                    <span>🔒</span> בקרוב
                  </div>
                }
              </button>
            }
          </div>
        </section>

        <!-- Household Settings -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">🏠</span>
              <h2>הגדרות משפחה</h2>
            </div>
          </div>

          <div class="form-group">
            <label>שם המשפחה</label>
            <input
              type="text"
              [(ngModel)]="householdName"
              class="form-input"
              placeholder="המשפחה שלנו"
              (ngModelChange)="markDirty()"
            />
          </div>

          <div class="form-group">
            <label>קוד הזמנה</label>
            <div class="input-with-button">
              <input
                type="text"
                [value]="(household$ | async)?.inviteCode || 'טוען...'"
                readonly
                class="form-input mono"
              />
              <button class="btn-icon" (click)="copyInviteCode()">
                {{ copied ? '✓' : '📋' }}
              </button>
            </div>
            <span class="form-hint">שתף קוד זה עם בני משפחה כדי שיצטרפו</span>
          </div>

          <button class="btn-outline full-width" (click)="generateNewCode()">
            🔄 צור קוד הזמנה חדש
          </button>
        </section>

        <!-- Notifications -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">🔔</span>
              <h2>התראות</h2>
            </div>
          </div>

          <label class="toggle-item">
            <div class="toggle-content">
              <span class="toggle-title">משימות שהושלמו</span>
              <span class="toggle-desc">קבל התראה כשילד משלים משימה</span>
            </div>
            <input
              type="checkbox"
              [(ngModel)]="notifications.taskCompleted"
              class="toggle-input"
              (ngModelChange)="markDirty()"
            />
            <span class="toggle-switch"></span>
          </label>

          <label class="toggle-item">
            <div class="toggle-content">
              <span class="toggle-title">בקשות פרסים</span>
              <span class="toggle-desc">קבל התראה כשילד מבקש פרס</span>
            </div>
            <input
              type="checkbox"
              [(ngModel)]="notifications.rewardRequested"
              class="toggle-input"
              (ngModelChange)="markDirty()"
            />
            <span class="toggle-switch"></span>
          </label>

          <label class="toggle-item">
            <div class="toggle-content">
              <span class="toggle-title">תזכורות יומיות</span>
              <span class="toggle-desc">תזכורת על משימות שלא הושלמו</span>
            </div>
            <input
              type="checkbox"
              [(ngModel)]="notifications.dailyReminder"
              class="toggle-input"
              (ngModelChange)="markDirty()"
            />
            <span class="toggle-switch"></span>
          </label>
        </section>

        <!-- Account -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">👤</span>
              <h2>החשבון שלי</h2>
            </div>
          </div>

          <div class="account-info">
            <div class="account-avatar">
              {{ (user$ | async)?.name?.charAt(0) || '?' }}
            </div>
            <div class="account-details">
              <h3>{{ (user$ | async)?.name }}</h3>
              <p>{{ (user$ | async)?.email }}</p>
              <span class="role-badge">
                {{ (user$ | async)?.role === 'ADULT' ? '👨‍👩‍👧 הורה' : '🧒 ילד' }}
              </span>
            </div>
          </div>

          <div class="button-group">
            <button class="btn-secondary">
              <span>✏️</span> ערוך פרופיל
            </button>
            <button class="btn-secondary">
              <span>🔒</span> פרטיות
            </button>
          </div>
        </section>

        <!-- Language Settings -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">🌐</span>
              <h2>שפה</h2>
            </div>
          </div>

          <div class="form-group">
            <select
              [(ngModel)]="language"
              class="form-select"
              (ngModelChange)="markDirty()"
            >
              <option value="he">🇮🇱 עברית</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="settings-card danger-zone full-width">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">⚠️</span>
              <h2>אזור מסוכן</h2>
            </div>
          </div>

          <div class="danger-actions">
            <button class="btn-danger" (click)="logout()">
              <span>🚪</span> התנתק
            </button>
            <button class="btn-danger-outline">
              <span>🗑️</span> מחק חשבון
            </button>
          </div>
        </section>
      </div>

      <!-- Save FAB - only show when dirty -->
      @if (isDirty) {
        <button class="save-fab" (click)="saveSettings()">
          <span>💾</span> שמור שינויים
        </button>
      }

      <!-- Toast Messages -->
      @if (toastMessage) {
        <div class="toast" [class.success]="toastType === 'success'" [class.info]="toastType === 'info'">
          <span>{{ toastIcon }}</span>
          <span>{{ toastMessage }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .settings-page {
      min-height: 100vh;
      background: var(--theme-background-gradient);
      padding: 24px;
      padding-bottom: 100px;
      color: var(--theme-text);
    }

    /* Header */
    .settings-header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--theme-surface);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 20px 24px;
      border: 1px solid var(--theme-border);
      position: relative;
    }

    .header-icon {
      font-size: 2.5rem;
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--theme-text);
      margin: 0;
    }

    .header-content p {
      color: var(--theme-text-muted);
      margin: 4px 0 0;
      font-size: 0.9rem;
    }

    .mascot {
      position: absolute;
      left: 24px;
      font-size: 2rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    /* Grid Layout */
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    /* Cards */
    .settings-card {
      background: var(--theme-surface);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 24px;
      border: 1px solid var(--theme-border);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .card-icon {
      font-size: 1.5rem;
    }

    .card-title h2 {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--theme-text);
      margin: 0;
    }

    .card-description {
      color: var(--theme-text-muted);
      font-size: 0.9rem;
      margin: 0 0 20px;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge.featured {
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
      color: white;
    }

    /* Mode Selector (Light/Dark) */
    .mode-selector {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .mode-option {
      flex: 1;
      min-width: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 16px;
      background: var(--theme-surface);
      border: 2px solid var(--theme-border);
      border-radius: 16px;
      color: var(--theme-text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-option:hover {
      background: var(--theme-surface-hover);
      border-color: var(--theme-primary);
    }

    .mode-option.selected {
      border-color: var(--theme-primary);
      background: linear-gradient(135deg, rgba(var(--theme-primary), 0.1), rgba(var(--theme-secondary), 0.05));
      color: var(--theme-text);
      box-shadow: 0 0 30px var(--theme-glow);
    }

    .mode-emoji {
      font-size: 2rem;
    }

    .mode-label {
      font-size: 0.9rem;
      font-weight: 600;
    }

    /* Theme Selection */
    .theme-card {
      background: linear-gradient(135deg, rgba(139,92,246,0.05), rgba(236,72,153,0.02));
      border: 1px solid var(--theme-border);
    }

    .themes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .theme-option {
      position: relative;
      display: flex;
      flex-direction: column;
      background: var(--theme-surface);
      border: 2px solid transparent;
      border-radius: 16px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: right;
    }

    .theme-option:hover:not(.unavailable) {
      background: var(--theme-surface-hover);
      transform: translateY(-4px);
    }

    .theme-option.selected {
      border-color: var(--theme-primary);
      box-shadow: 0 0 30px var(--theme-glow);
    }

    .theme-option.unavailable {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .theme-preview {
      width: 100%;
      height: 80px;
      border-radius: 12px;
      position: relative;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .theme-preview-accent {
      position: absolute;
      top: 0;
      right: 0;
      width: 60%;
      height: 100%;
      clip-path: polygon(30% 0, 100% 0, 100% 100%, 0% 100%);
    }

    .theme-emoji {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.5rem;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    }

    .theme-mascots {
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      gap: 4px;
    }

    .mascot-icon {
      font-size: 1.2rem;
    }

    .theme-info h3 {
      color: var(--theme-text);
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px;
    }

    .theme-info p {
      color: var(--theme-text-muted);
      font-size: 0.8rem;
      margin: 0;
      line-height: 1.4;
    }

    .theme-selected-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: var(--theme-primary);
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .theme-coming-soon {
      position: absolute;
      top: 12px;
      left: 12px;
      background: rgba(255,255,255,0.2);
      color: white;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Form Elements */
    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      color: var(--theme-text-muted);
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 12px 16px;
      background: var(--theme-surface);
      border: 1px solid var(--theme-border);
      border-radius: 12px;
      color: var(--theme-text);
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-input:focus, .form-select:focus {
      border-color: var(--theme-primary);
    }

    .form-input.mono {
      font-family: monospace;
      letter-spacing: 1px;
    }

    .form-hint {
      display: block;
      color: var(--theme-text-muted);
      font-size: 0.75rem;
      margin-top: 6px;
    }

    .input-with-button {
      display: flex;
      gap: 8px;
    }

    .input-with-button .form-input {
      flex: 1;
    }

    .btn-icon {
      width: 48px;
      height: 48px;
      background: var(--theme-primary);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 1.2rem;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-icon:hover {
      transform: scale(1.05);
    }

    /* Toggle Items */
    .toggle-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--theme-surface);
      border-radius: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      border: 1px solid var(--theme-border);
    }

    .toggle-content {
      flex: 1;
    }

    .toggle-title {
      display: block;
      color: var(--theme-text);
      font-weight: 500;
      margin-bottom: 2px;
    }

    .toggle-desc {
      display: block;
      color: var(--theme-text-muted);
      font-size: 0.8rem;
    }

    .toggle-input {
      display: none;
    }

    .toggle-switch {
      width: 48px;
      height: 28px;
      background: var(--theme-border);
      border-radius: 14px;
      position: relative;
      transition: background 0.3s;
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 4px;
      left: 4px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.3s;
    }

    .toggle-input:checked + .toggle-switch {
      background: var(--theme-primary);
    }

    .toggle-input:checked + .toggle-switch::after {
      transform: translateX(20px);
    }

    /* Account Info */
    .account-info {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--theme-surface);
      border-radius: 16px;
      margin-bottom: 16px;
      border: 1px solid var(--theme-border);
    }

    .account-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .account-details h3 {
      color: var(--theme-text);
      font-size: 1.1rem;
      margin: 0 0 4px;
    }

    .account-details p {
      color: var(--theme-text-muted);
      font-size: 0.85rem;
      margin: 0 0 8px;
    }

    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
      color: white;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Buttons */
    .button-group {
      display: flex;
      gap: 12px;
    }

    .btn-secondary {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--theme-surface);
      border: 1px solid var(--theme-border);
      border-radius: 12px;
      color: var(--theme-text);
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-secondary:hover {
      background: var(--theme-surface-hover);
    }

    .btn-outline {
      padding: 12px 20px;
      background: transparent;
      border: 2px dashed var(--theme-border);
      border-radius: 12px;
      color: var(--theme-text-muted);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-outline:hover {
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }

    .btn-outline.full-width {
      width: 100%;
    }

    /* Danger Zone */
    .danger-zone {
      background: rgba(239,68,68,0.05);
      border-color: rgba(239,68,68,0.2);
    }

    .danger-zone .card-title h2 {
      color: var(--theme-error);
    }

    .danger-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn-danger {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--theme-error);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn-danger:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(239,68,68,0.3);
    }

    .btn-danger-outline {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: transparent;
      border: 2px solid rgba(239,68,68,0.3);
      border-radius: 12px;
      color: var(--theme-error);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-danger-outline:hover {
      background: rgba(239,68,68,0.1);
    }

    /* Save FAB */
    .save-fab {
      position: fixed;
      bottom: 24px;
      left: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 28px;
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
      border: none;
      border-radius: 30px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 40px var(--theme-glow);
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 100;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 10px 40px var(--theme-glow); }
      50% { box-shadow: 0 15px 50px var(--theme-glow); }
    }

    .save-fab:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 50px var(--theme-glow);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      background: var(--theme-success);
      backdrop-filter: blur(12px);
      border-radius: 30px;
      color: white;
      font-weight: 600;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      animation: toast-in 0.3s ease-out;
      z-index: 200;
    }

    .toast.info {
      background: var(--theme-primary);
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .settings-page {
        padding: 16px;
        padding-bottom: 120px;
      }

      .themes-grid {
        grid-template-columns: 1fr;
      }

      .mode-selector {
        flex-direction: column;
      }

      .mode-option {
        flex-direction: row;
        justify-content: flex-start;
        padding: 16px;
      }

      .save-fab {
        left: 16px;
        right: 16px;
        justify-content: center;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  user$ = this.authService.user$;
  household$ = this.authService.household$;

  // Current theme (resolved, not observable for simpler template usage)
  currentTheme: UITheme = this.themeService.getCurrentTheme();

  // Theme lists
  basicThemes: UITheme[] = this.themeService.getBasicThemes();
  customThemes: UITheme[] = this.themeService.getCustomThemes();

  // Settings
  householdName = '';
  language: 'he' | 'en' = 'he';
  notifications = {
    taskCompleted: true,
    rewardRequested: true,
    dailyReminder: false
  };

  // UI State
  copied = false;
  isDirty = false;
  toastMessage = '';
  toastIcon = '';
  toastType: 'success' | 'info' = 'success';

  constructor() {
    // Load settings
    const settings = this.themeService.getSettings();
    this.language = settings.language;
    this.notifications = { ...settings.notifications };
    if (settings.householdName) {
      this.householdName = settings.householdName;
    }

    // Subscribe to household for name
    this.household$.subscribe(h => {
      if (h && !this.householdName) {
        this.householdName = h.name;
      }
    });

    // Subscribe to theme changes
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });
  }

  selectTheme(theme: UITheme): void {
    if (!theme.available) return;

    const success = this.themeService.setTheme(theme.id);
    if (success) {
      this.currentTheme = theme;
      this.showToast(`העיצוב שונה ל${theme.nameHe}`, '🎨', 'info');
      this.cdr.markForCheck();
    }
  }

  markDirty(): void {
    this.isDirty = true;
    this.cdr.markForCheck();
  }

  saveSettings(): void {
    // Save all settings
    this.themeService.saveSettings({
      themeId: this.currentTheme.id,
      language: this.language,
      notifications: this.notifications,
      householdName: this.householdName
    });

    this.isDirty = false;
    this.showToast('ההגדרות נשמרו בהצלחה!', '✅', 'success');
    this.cdr.markForCheck();
  }

  copyInviteCode(): void {
    this.household$.subscribe(h => {
      if (h?.inviteCode) {
        navigator.clipboard.writeText(h.inviteCode);
        this.copied = true;
        this.showToast('הקוד הועתק!', '📋', 'success');
        setTimeout(() => {
          this.copied = false;
          this.cdr.markForCheck();
        }, 2000);
      }
    }).unsubscribe();
  }

  generateNewCode(): void {
    this.showToast('מייצר קוד חדש...', '🔄', 'info');
    // TODO: Call API to generate new code
  }

  logout(): void {
    this.authService.logout();
  }

  private showToast(message: string, icon: string, type: 'success' | 'info'): void {
    this.toastMessage = message;
    this.toastIcon = icon;
    this.toastType = type;
    this.cdr.markForCheck();

    setTimeout(() => {
      this.toastMessage = '';
      this.cdr.markForCheck();
    }, 3000);
  }
}
