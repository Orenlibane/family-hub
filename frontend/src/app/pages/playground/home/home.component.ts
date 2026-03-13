import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services';
import { TasksStore } from '../../../core/stores';

@Component({
  selector: 'app-playground-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-primary to-kid-secondary p-6">
      <!-- Header with coins -->
      <header class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white">Hey {{ (user$ | async)?.name }}!</h1>
          <p class="text-white/80">Let's get stuff done today!</p>
        </div>
        <div class="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center gap-2">
          <span class="text-2xl">🪙</span>
          <span class="text-2xl font-bold text-white">{{ (user$ | async)?.famCoins || 0 }}</span>
        </div>
      </header>

      <!-- Today's Tasks -->
      <section class="bg-white rounded-3xl p-6 shadow-xl mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>📋</span> Today's Tasks
        </h2>
        @if ((todayTasks$ | async)?.length) {
          <div class="space-y-3">
            @for (task of todayTasks$ | async; track task.id) {
              <div class="flex items-center gap-4 p-4 bg-kid-surface rounded-2xl">
                <button class="w-8 h-8 rounded-full border-2 border-kid-primary flex items-center justify-center
                               hover:bg-kid-primary hover:text-white transition-colors">
                  ✓
                </button>
                <div class="flex-1">
                  <p class="font-semibold text-gray-800">{{ task.title }}</p>
                  @if (task.isMustDo) {
                    <span class="text-xs text-red-500 font-medium">⚠️ Must Do!</span>
                  }
                </div>
                <div class="flex items-center gap-1 text-fam-coin font-bold">
                  <span>🪙</span>
                  <span>{{ task.coinReward }}</span>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="text-center py-8">
            <p class="text-6xl mb-4">🎉</p>
            <p class="text-gray-500 font-medium">No tasks for today!</p>
          </div>
        }
      </section>

      <!-- Quick Actions -->
      <div class="grid grid-cols-2 gap-4">
        <button class="bg-white rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform">
          <span class="text-4xl mb-2 block">🛒</span>
          <span class="font-semibold text-gray-800">Shop</span>
        </button>
        <button class="bg-white rounded-2xl p-6 text-center shadow-lg hover:scale-105 transition-transform">
          <span class="text-4xl mb-2 block">🧑‍🎨</span>
          <span class="font-semibold text-gray-800">My Avatar</span>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksStore = inject(TasksStore);

  user$ = this.authService.user$;
  todayTasks$ = this.tasksStore.todayTasks$;

  constructor() {
    this.tasksStore.loadTasks();
  }
}
