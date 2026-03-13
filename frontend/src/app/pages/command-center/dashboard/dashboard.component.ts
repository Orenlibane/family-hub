import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, SocketService } from '../../../core/services';
import { TasksStore, HouseholdStore, RewardsStore } from '../../../core/stores';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-adult-dark">Dashboard</h1>
        <p class="text-gray-600">Welcome back, {{ (user$ | async)?.name }}</p>
      </header>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-adult-primary">
          <h3 class="text-gray-500 text-sm mb-1">Tasks Today</h3>
          <p class="text-3xl font-bold text-adult-primary">{{ (todayTasks$ | async)?.length || 0 }}</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-red-500">
          <h3 class="text-gray-500 text-sm mb-1">Overdue</h3>
          <p class="text-3xl font-bold text-red-500">{{ (overdueTasks$ | async)?.length || 0 }}</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-adult-secondary">
          <h3 class="text-gray-500 text-sm mb-1">Family Members</h3>
          <p class="text-3xl font-bold text-adult-secondary">{{ (memberCount$ | async) || 0 }}</p>
        </div>
        <div class="bg-white rounded-2xl p-6 shadow-sm border-l-4"
             [class.border-green-500]="connected$ | async"
             [class.border-red-500]="!(connected$ | async)">
          <h3 class="text-gray-500 text-sm mb-1">Connection</h3>
          <p class="text-3xl font-bold" [class.text-green-500]="connected$ | async" [class.text-red-500]="!(connected$ | async)">
            {{ (connected$ | async) ? 'Online' : 'Offline' }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Must-Do Tasks -->
        <section class="bg-white rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-adult-dark">Must-Do Tasks</h2>
            <a routerLink="/command-center/tasks" class="text-adult-primary text-sm hover:underline">View All</a>
          </div>
          @if ((mustDoTasks$ | async)?.length) {
            <ul class="space-y-3">
              @for (task of mustDoTasks$ | async; track task.id) {
                <li class="flex items-center gap-3 p-3 bg-red-50 rounded-xl must-do-glow">
                  <span class="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ task.title }}</p>
                    @if (task.assignedTo) {
                      <p class="text-sm text-gray-500">Assigned to: {{ task.assignedTo.name }}</p>
                    }
                  </div>
                  <span class="flex items-center gap-1 text-fam-coin font-bold flex-shrink-0">
                    <span>🪙</span>{{ task.coinReward }}
                  </span>
                </li>
              }
            </ul>
          } @else {
            <div class="text-center py-8 text-gray-400">
              <p class="text-4xl mb-2">✨</p>
              <p>No must-do tasks right now!</p>
            </div>
          }
        </section>

        <!-- Pending Redemptions -->
        <section class="bg-white rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-adult-dark">Pending Redemptions</h2>
            <a routerLink="/command-center/rewards" class="text-adult-primary text-sm hover:underline">View All</a>
          </div>
          @if ((pendingRedemptions$ | async)?.length) {
            <ul class="space-y-3">
              @for (redemption of pendingRedemptions$ | async; track redemption.id) {
                <li class="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <span class="text-2xl">🎁</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ redemption.reward?.name }}</p>
                    <p class="text-sm text-gray-500">By: {{ redemption.user?.name }}</p>
                  </div>
                  <span class="flex items-center gap-1 text-purple-600 font-bold flex-shrink-0">
                    {{ redemption.coinsSpent }} coins
                  </span>
                </li>
              }
            </ul>
          } @else {
            <div class="text-center py-8 text-gray-400">
              <p class="text-4xl mb-2">🎁</p>
              <p>No pending redemptions</p>
            </div>
          }
        </section>

        <!-- Family Members -->
        <section class="bg-white rounded-2xl p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-adult-dark">Family</h2>
            <a routerLink="/command-center/family" class="text-adult-primary text-sm hover:underline">Manage</a>
          </div>
          @if ((members$ | async)?.length) {
            <div class="grid grid-cols-2 gap-3">
              @for (member of members$ | async; track member.id) {
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div class="w-10 h-10 rounded-full bg-adult-primary flex items-center justify-center text-white font-bold">
                    {{ member.name?.charAt(0) || '?' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{{ member.name }}</p>
                    <p class="text-sm text-gray-500 flex items-center gap-1">
                      <span>🪙</span>{{ member.famCoins }}
                    </p>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8 text-gray-400">
              <p class="text-4xl mb-2">👨‍👩‍👧‍👦</p>
              <p>No family members yet</p>
            </div>
          }
        </section>

        <!-- Quick Actions -->
        <section class="bg-white rounded-2xl p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-adult-dark mb-4">Quick Actions</h2>
          <div class="grid grid-cols-2 gap-3">
            <a routerLink="/command-center/tasks"
               class="flex items-center gap-3 p-4 bg-adult-primary text-white rounded-xl hover:bg-adult-dark transition-colors">
              <span class="text-2xl">✅</span>
              <span class="font-medium">Create Task</span>
            </a>
            <a routerLink="/command-center/rewards"
               class="flex items-center gap-3 p-4 bg-adult-secondary text-white rounded-xl hover:bg-teal-700 transition-colors">
              <span class="text-2xl">🎁</span>
              <span class="font-medium">Add Reward</span>
            </a>
            <a routerLink="/command-center/family"
               class="flex items-center gap-3 p-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
              <span class="text-2xl">👥</span>
              <span class="font-medium">Invite Member</span>
            </a>
            <a routerLink="/command-center/calendar"
               class="flex items-center gap-3 p-4 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors">
              <span class="text-2xl">📅</span>
              <span class="font-medium">Calendar</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksStore = inject(TasksStore);
  private readonly householdStore = inject(HouseholdStore);
  private readonly rewardsStore = inject(RewardsStore);
  private readonly socketService = inject(SocketService);

  user$ = this.authService.user$;
  todayTasks$ = this.tasksStore.todayTasks$;
  mustDoTasks$ = this.tasksStore.mustDoTasks$;
  overdueTasks$ = this.tasksStore.overdueTasks$;
  members$ = this.householdStore.members$;
  memberCount$ = this.householdStore.memberCount$;
  pendingRedemptions$ = this.rewardsStore.pendingRedemptions$;
  connected$ = this.socketService.connected$;

  constructor() {
    this.tasksStore.loadTasks();
    this.householdStore.loadHousehold();
    this.rewardsStore.loadRedemptions();
  }
}
