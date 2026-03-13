import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, SocketService } from '../../../core/services';
import { TasksStore, HouseholdStore } from '../../../core/stores';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-adult-surface p-6">
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-adult-dark">Command Center</h1>
        <p class="text-gray-600">Welcome back, {{ (user$ | async)?.name }}</p>
      </header>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <h3 class="text-gray-500 text-sm mb-1">Tasks Today</h3>
          <p class="text-3xl font-bold text-adult-primary">{{ (todayTasks$ | async)?.length || 0 }}</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <h3 class="text-gray-500 text-sm mb-1">Family Members</h3>
          <p class="text-3xl font-bold text-adult-secondary">{{ (memberCount$ | async) || 0 }}</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm">
          <h3 class="text-gray-500 text-sm mb-1">Connection</h3>
          <p class="text-3xl font-bold" [class.text-green-500]="connected$ | async" [class.text-red-500]="!(connected$ | async)">
            {{ (connected$ | async) ? 'Online' : 'Offline' }}
          </p>
        </div>
      </div>

      <!-- Must-Do Tasks -->
      <section class="bg-white rounded-2xl p-6 shadow-sm mb-8">
        <h2 class="text-xl font-semibold text-adult-dark mb-4">Must-Do Tasks</h2>
        @if ((mustDoTasks$ | async)?.length) {
          <ul class="space-y-3">
            @for (task of mustDoTasks$ | async; track task.id) {
              <li class="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                <span class="font-medium">{{ task.title }}</span>
                <span class="ml-auto text-fam-coin font-bold">{{ task.coinReward }} coins</span>
              </li>
            }
          </ul>
        } @else {
          <p class="text-gray-400">No must-do tasks right now</p>
        }
      </section>

      <!-- Actions -->
      <div class="flex gap-4">
        <button class="bg-adult-primary text-white px-6 py-3 rounded-xl font-semibold
                       hover:bg-adult-dark transition-colors">
          + Create Task
        </button>
        <button (click)="logout()" class="bg-red-100 text-red-600 px-6 py-3 rounded-xl font-semibold
                       hover:bg-red-200 transition-colors">
          Logout
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksStore = inject(TasksStore);
  private readonly householdStore = inject(HouseholdStore);
  private readonly socketService = inject(SocketService);

  user$ = this.authService.user$;
  todayTasks$ = this.tasksStore.todayTasks$;
  mustDoTasks$ = this.tasksStore.mustDoTasks$;
  memberCount$ = this.householdStore.memberCount$;
  connected$ = this.socketService.connected$;

  constructor() {
    this.tasksStore.loadTasks();
    this.householdStore.loadHousehold();
  }

  logout(): void {
    this.authService.logout();
  }
}
