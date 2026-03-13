import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services';

@Component({
  selector: 'app-playground-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-surface to-orange-100 kid-mode">
      <!-- Top Bar -->
      <header class="bg-white/80 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-50">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-kid-primary to-kid-accent flex items-center justify-center text-2xl">
              🎮
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-800">My Playground</h1>
              <p class="text-sm text-gray-500">Hey {{ (user$ | async)?.name }}!</p>
            </div>
          </div>

          <!-- Coins Display -->
          <div class="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full">
            <span class="text-2xl">🪙</span>
            <span class="text-xl font-bold text-yellow-700">{{ (user$ | async)?.famCoins || 0 }}</span>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="max-w-4xl mx-auto p-4">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom Navigation -->
      <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-lg border-t border-gray-100">
        <div class="max-w-4xl mx-auto flex justify-around py-2">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-kid-primary"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              class="flex flex-col items-center gap-1 px-4 py-2 text-gray-400 hover:text-kid-primary transition-colors"
            >
              <span class="text-2xl">{{ item.icon }}</span>
              <span class="text-xs font-medium">{{ item.label }}</span>
            </a>
          }
        </div>
      </nav>

      <!-- Spacer for bottom nav -->
      <div class="h-20"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaygroundLayoutComponent {
  private readonly authService = inject(AuthService);

  user$ = this.authService.user$;

  navItems = [
    { path: '/playground', label: 'Home', icon: '🏠', exact: true },
    { path: '/playground/tasks', label: 'My Tasks', icon: '✅', exact: false },
    { path: '/playground/shop', label: 'Shop', icon: '🛒', exact: false },
    { path: '/playground/avatar', label: 'Me', icon: '👤', exact: false }
  ];
}
