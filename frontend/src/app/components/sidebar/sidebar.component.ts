import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="fixed left-0 top-0 h-full w-64 bg-adult-dark text-white flex flex-col z-50">
      <!-- Logo -->
      <div class="p-6 border-b border-white/10">
        <h1 class="text-2xl font-bold">MishpachaHub</h1>
        <p class="text-white/50 text-sm">Command Center</p>
      </div>

      <!-- User Info -->
      <div class="p-4 border-b border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-adult-primary flex items-center justify-center text-lg font-bold">
            {{ (user$ | async)?.name?.charAt(0) || '?' }}
          </div>
          <div>
            <p class="font-medium">{{ (user$ | async)?.name }}</p>
            <p class="text-white/50 text-sm">{{ (user$ | async)?.role }}</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4">
        <ul class="space-y-2">
          @for (item of navItems; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="bg-adult-primary"
                [routerLinkActiveOptions]="{ exact: item.exact }"
                class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                <span class="text-xl">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>

      <!-- Household Info -->
      <div class="p-4 border-t border-white/10">
        <div class="bg-white/5 rounded-xl p-3">
          <p class="text-white/50 text-xs mb-1">Household</p>
          <p class="font-medium">{{ (household$ | async)?.name }}</p>
        </div>
      </div>

      <!-- Logout -->
      <div class="p-4 border-t border-white/10">
        <button
          (click)="logout()"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <span class="text-xl">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  user$ = this.authService.user$;
  household$ = this.authService.household$;

  navItems = [
    { path: '/command-center', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/command-center/tasks', label: 'Tasks', icon: '✅', exact: false },
    { path: '/command-center/rewards', label: 'Rewards', icon: '🎁', exact: false },
    { path: '/command-center/family', label: 'Family', icon: '👨‍👩‍👧‍👦', exact: false },
    { path: '/command-center/calendar', label: 'Calendar', icon: '📅', exact: false },
    { path: '/command-center/settings', label: 'Settings', icon: '⚙️', exact: false }
  ];

  logout(): void {
    this.authService.logout();
  }
}
