import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, ThemeService } from '../../core/services';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar" dir="rtl">
      <!-- Logo -->
      <div class="logo-section">
        <span class="logo-icon">{{ (currentTheme$ | async)?.assets?.mascots?.[0] || '🏠' }}</span>
        <div>
          <h1>המשפחה שלי</h1>
          <p>מרכז הפיקוד</p>
        </div>
      </div>

      <!-- User Info -->
      <div class="user-section">
        <div class="user-avatar" [class.emoji-avatar]="(user$ | async)?.avatar">
          {{ (user$ | async)?.avatar || (user$ | async)?.name?.charAt(0) || '?' }}
        </div>
        <div class="user-info">
          <p class="user-name">{{ (user$ | async)?.name }}</p>
          <p class="user-role">{{ (user$ | async)?.role === 'ADULT' ? 'הורה' : 'ילד' }}</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="nav-section">
        <ul>
          @for (item of navItems; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.exact }"
                class="nav-item"
              >
                <span class="nav-icon">{{ item.icon }}</span>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>

      <!-- Household Info -->
      <div class="household-section">
        <div class="household-card">
          <p class="household-label">משפחה</p>
          <p class="household-name">{{ (household$ | async)?.name }}</p>
        </div>
      </div>

      <!-- Logout -->
      <div class="logout-section">
        <button (click)="logout()" class="logout-btn">
          <span>🚪</span>
          <span>התנתק</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 260px;
      background: var(--theme-surface);
      backdrop-filter: blur(12px);
      border-left: 1px solid var(--theme-border);
      display: flex;
      flex-direction: column;
      z-index: 50;
      color: var(--theme-text);
    }

    /* Logo Section */
    .logo-section {
      padding: 20px 24px;
      border-bottom: 1px solid var(--theme-border);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 2rem;
    }

    .logo-section h1 {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: var(--theme-text);
    }

    .logo-section p {
      font-size: 0.75rem;
      color: var(--theme-text-muted);
      margin: 2px 0 0;
    }

    /* User Section */
    .user-section {
      padding: 16px 24px;
      border-bottom: 1px solid var(--theme-border);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: 700;
      color: white;
    }

    .user-avatar.emoji-avatar {
      font-size: 1.8rem;
      background: var(--theme-surface-hover);
      border: 2px solid var(--theme-border);
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      margin: 0;
      color: var(--theme-text);
    }

    .user-role {
      font-size: 0.8rem;
      color: var(--theme-text-muted);
      margin: 2px 0 0;
    }

    /* Navigation */
    .nav-section {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
    }

    .nav-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .nav-section li {
      margin-bottom: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      color: var(--theme-text-muted);
      text-decoration: none;
      transition: all 0.2s;
    }

    .nav-item:hover {
      background: var(--theme-surface-hover);
      color: var(--theme-text);
    }

    .nav-item.active {
      background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
      color: white;
      box-shadow: 0 4px 15px var(--theme-glow);
    }

    .nav-icon {
      font-size: 1.25rem;
    }

    .nav-label {
      font-weight: 500;
    }

    /* Household Section */
    .household-section {
      padding: 16px;
      border-top: 1px solid var(--theme-border);
    }

    .household-card {
      background: var(--theme-surface-hover);
      border-radius: 12px;
      padding: 12px 16px;
      border: 1px solid var(--theme-border);
    }

    .household-label {
      font-size: 0.7rem;
      color: var(--theme-text-muted);
      margin: 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .household-name {
      font-weight: 600;
      margin: 0;
      color: var(--theme-text);
    }

    /* Logout Section */
    .logout-section {
      padding: 16px;
      border-top: 1px solid var(--theme-border);
    }

    .logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: transparent;
      border: 1px solid var(--theme-error);
      border-radius: 12px;
      color: var(--theme-error);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        height: auto;
        position: fixed;
        bottom: 0;
        right: 0;
        top: auto;
        flex-direction: row;
        padding: 8px 16px;
        border-left: none;
        border-top: 1px solid var(--theme-border);
      }

      .logo-section,
      .user-section,
      .household-section,
      .logout-section {
        display: none;
      }

      .nav-section {
        flex: 1;
        padding: 0;
        overflow-x: auto;
      }

      .nav-section ul {
        display: flex;
        gap: 8px;
      }

      .nav-section li {
        margin: 0;
      }

      .nav-item {
        flex-direction: column;
        padding: 8px 16px;
        gap: 4px;
      }

      .nav-label {
        font-size: 0.7rem;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  user$ = this.authService.user$;
  household$ = this.authService.household$;
  currentTheme$ = this.themeService.currentTheme$;

  navItems = [
    { path: '/command-center', label: 'לוח בקרה', icon: '📊', exact: true },
    { path: '/command-center/tasks', label: 'משימות', icon: '✅', exact: false },
    { path: '/command-center/rewards', label: 'פרסים', icon: '🎁', exact: false },
    { path: '/command-center/family', label: 'משפחה', icon: '👨‍👩‍👧‍👦', exact: false },
    { path: '/command-center/calendar', label: 'יומן', icon: '📅', exact: false },
    { path: '/command-center/logistics', label: 'לוח שבועי', icon: '📋', exact: false },
    { path: '/command-center/voting', label: 'הצבעות', icon: '🗳️', exact: false },
    { path: '/command-center/chat', label: 'צ\'אט', icon: '💬', exact: false },
    { path: '/command-center/settings', label: 'הגדרות', icon: '⚙️', exact: false }
  ];

  logout(): void {
    this.authService.logout();
  }
}
