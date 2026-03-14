import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, ThemeService, UITheme } from '../../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page" dir="rtl">
      <!-- Header -->
      <header class="settings-header">
        <div class="header-content">
          <span class="header-icon">⚙️</span>
          <div>
            <h1>הגדרות</h1>
            <p>התאם אישית את החוויה שלך</p>
          </div>
        </div>
      </header>

      <div class="settings-grid">
        <!-- UI Theme Selection - Featured Section -->
        <section class="settings-card theme-card full-width">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">🎨</span>
              <h2>עיצוב ממשק</h2>
            </div>
            <span class="badge new">חדש!</span>
          </div>
          <p class="card-description">בחר את העיצוב המועדף עליך. כל משתמש יכול לבחור עיצוב שונה!</p>

          <div class="themes-grid">
            @for (theme of allThemes; track theme.id) {
              <button
                class="theme-option"
                [class.selected]="(currentTheme$ | async)?.id === theme.id"
                [class.unavailable]="!theme.available"
                (click)="selectTheme(theme)"
                [disabled]="!theme.available"
              >
                <div class="theme-preview" [style.background]="theme.colors.background">
                  <div class="theme-preview-accent" [style.background]="'linear-gradient(135deg, ' + theme.colors.primary + ', ' + theme.colors.secondary + ')'"></div>
                  <span class="theme-emoji">{{ theme.preview }}</span>
                </div>
                <div class="theme-info">
                  <h3>{{ theme.nameHe }}</h3>
                  <p>{{ theme.descriptionHe }}</p>
                </div>
                @if ((currentTheme$ | async)?.id === theme.id) {
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
            <input type="checkbox" [(ngModel)]="notifications.taskCompleted" class="toggle-input" />
            <span class="toggle-switch"></span>
          </label>

          <label class="toggle-item">
            <div class="toggle-content">
              <span class="toggle-title">בקשות פרסים</span>
              <span class="toggle-desc">קבל התראה כשילד מבקש פרס</span>
            </div>
            <input type="checkbox" [(ngModel)]="notifications.rewardRequested" class="toggle-input" />
            <span class="toggle-switch"></span>
          </label>

          <label class="toggle-item">
            <div class="toggle-content">
              <span class="toggle-title">תזכורות יומיות</span>
              <span class="toggle-desc">תזכורת על משימות שלא הושלמו</span>
            </div>
            <input type="checkbox" [(ngModel)]="notifications.dailyReminder" class="toggle-input" />
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

        <!-- App Settings -->
        <section class="settings-card">
          <div class="card-header">
            <div class="card-title">
              <span class="card-icon">🌐</span>
              <h2>הגדרות אפליקציה</h2>
            </div>
          </div>

          <div class="form-group">
            <label>שפה</label>
            <select [(ngModel)]="language" class="form-select">
              <option value="he">🇮🇱 עברית</option>
              <option value="en">🇺🇸 English</option>
            </select>
          </div>

          <div class="form-group">
            <label>מצב תצוגה</label>
            <div class="mode-selector">
              <button
                class="mode-option"
                [class.selected]="displayMode === 'light'"
                (click)="displayMode = 'light'"
              >
                <span>☀️</span>
                <span>בהיר</span>
              </button>
              <button
                class="mode-option"
                [class.selected]="displayMode === 'dark'"
                (click)="displayMode = 'dark'"
              >
                <span>🌙</span>
                <span>כהה</span>
              </button>
              <button
                class="mode-option"
                [class.selected]="displayMode === 'auto'"
                (click)="displayMode = 'auto'"
              >
                <span>🔄</span>
                <span>אוטומטי</span>
              </button>
            </div>
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

      <!-- Save FAB -->
      <button class="save-fab" (click)="saveSettings()">
        <span>💾</span> שמור שינויים
      </button>

      <!-- Theme Changed Toast -->
      @if (showThemeToast) {
        <div class="toast">
          <span>🎨</span>
          <span>העיצוב שונה ל{{ (currentTheme$ | async)?.nameHe }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      --card-bg: rgba(255,255,255,0.05);
      --card-border: rgba(255,255,255,0.1);
      --text-primary: #ffffff;
      --text-secondary: rgba(255,255,255,0.7);
      --text-muted: rgba(255,255,255,0.5);
      --accent: #8b5cf6;
      --accent-glow: rgba(139,92,246,0.3);
      --danger: #ef4444;
    }

    .settings-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #1a1a3a 100%);
      padding: 24px;
      padding-bottom: 100px;
    }

    /* Header */
    .settings-header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 20px 24px;
      border: 1px solid var(--card-border);
    }

    .header-icon {
      font-size: 2.5rem;
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .header-content p {
      color: var(--text-secondary);
      margin: 4px 0 0;
      font-size: 0.9rem;
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
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 24px;
      border: 1px solid var(--card-border);
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
      color: var(--text-primary);
      margin: 0;
    }

    .card-description {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin: 0 0 20px;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge.new {
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      color: white;
    }

    /* Theme Selection */
    .theme-card {
      background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.05));
      border: 1px solid rgba(139,92,246,0.2);
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
      background: rgba(255,255,255,0.03);
      border: 2px solid transparent;
      border-radius: 16px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: right;
    }

    .theme-option:hover:not(.unavailable) {
      background: rgba(255,255,255,0.08);
      transform: translateY(-4px);
    }

    .theme-option.selected {
      border-color: var(--accent);
      background: rgba(139,92,246,0.1);
      box-shadow: 0 0 30px var(--accent-glow);
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

    .theme-info h3 {
      color: var(--text-primary);
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px;
    }

    .theme-info p {
      color: var(--text-muted);
      font-size: 0.8rem;
      margin: 0;
      line-height: 1.4;
    }

    .theme-selected-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: var(--accent);
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
      color: var(--text-secondary);
      font-size: 0.85rem;
      margin-bottom: 8px;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 12px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-input:focus, .form-select:focus {
      border-color: var(--accent);
    }

    .form-input.mono {
      font-family: monospace;
      letter-spacing: 1px;
    }

    .form-hint {
      display: block;
      color: var(--text-muted);
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
      background: var(--accent);
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
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      margin-bottom: 12px;
      cursor: pointer;
    }

    .toggle-content {
      flex: 1;
    }

    .toggle-title {
      display: block;
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: 2px;
    }

    .toggle-desc {
      display: block;
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .toggle-input {
      display: none;
    }

    .toggle-switch {
      width: 48px;
      height: 28px;
      background: rgba(255,255,255,0.2);
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
      background: var(--accent);
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
      background: rgba(255,255,255,0.03);
      border-radius: 16px;
      margin-bottom: 16px;
    }

    .account-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #ec4899);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .account-details h3 {
      color: var(--text-primary);
      font-size: 1.1rem;
      margin: 0 0 4px;
    }

    .account-details p {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin: 0 0 8px;
    }

    .role-badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(139,92,246,0.2);
      color: #a78bfa;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Mode Selector */
    .mode-selector {
      display: flex;
      gap: 8px;
    }

    .mode-option {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 16px 12px;
      background: rgba(255,255,255,0.03);
      border: 2px solid transparent;
      border-radius: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-option:hover {
      background: rgba(255,255,255,0.08);
    }

    .mode-option.selected {
      border-color: var(--accent);
      background: rgba(139,92,246,0.1);
      color: var(--text-primary);
    }

    .mode-option span:first-child {
      font-size: 1.5rem;
    }

    .mode-option span:last-child {
      font-size: 0.8rem;
      font-weight: 500;
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
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: var(--text-primary);
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.1);
    }

    .btn-outline {
      padding: 12px 20px;
      background: transparent;
      border: 2px dashed rgba(255,255,255,0.2);
      border-radius: 12px;
      color: var(--text-secondary);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-outline:hover {
      border-color: var(--accent);
      color: var(--accent);
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
      color: var(--danger);
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
      background: var(--danger);
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
      color: var(--danger);
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
      background: linear-gradient(135deg, var(--accent), #ec4899);
      border: none;
      border-radius: 30px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 40px rgba(139,92,246,0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 100;
    }

    .save-fab:hover {
      transform: translateY(-4px);
      box-shadow: 0 15px 50px rgba(139,92,246,0.5);
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
      background: rgba(16,185,129,0.9);
      backdrop-filter: blur(12px);
      border-radius: 30px;
      color: white;
      font-weight: 600;
      box-shadow: 0 10px 40px rgba(16,185,129,0.3);
      animation: toast-in 0.3s ease-out;
      z-index: 200;
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

  user$ = this.authService.user$;
  household$ = this.authService.household$;
  currentTheme$ = this.themeService.currentTheme$;

  allThemes: UITheme[] = this.themeService.getAllThemes();

  householdName = '';
  copied = false;
  language = 'he';
  displayMode: 'light' | 'dark' | 'auto' = 'dark';
  showThemeToast = false;

  notifications = {
    taskCompleted: true,
    rewardRequested: true,
    dailyReminder: false
  };

  constructor() {
    this.household$.subscribe(h => {
      if (h) this.householdName = h.name;
    });
  }

  selectTheme(theme: UITheme): void {
    if (!theme.available) return;

    const success = this.themeService.setTheme(theme.id);
    if (success) {
      this.showThemeToast = true;
      setTimeout(() => this.showThemeToast = false, 3000);
    }
  }

  copyInviteCode(): void {
    this.household$.subscribe(h => {
      if (h?.inviteCode) {
        navigator.clipboard.writeText(h.inviteCode);
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      }
    }).unsubscribe();
  }

  generateNewCode(): void {
    console.log('Generating new invite code...');
  }

  saveSettings(): void {
    console.log('Saving settings...', {
      householdName: this.householdName,
      notifications: this.notifications,
      language: this.language,
      displayMode: this.displayMode
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
