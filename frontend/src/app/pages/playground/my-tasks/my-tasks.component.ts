import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services';
import { TasksStore } from '../../../core/stores';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

type TaskFilter = 'all' | 'todo' | 'done' | 'pending';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-primary via-kid-secondary to-kid-accent p-4 pb-24" dir="rtl">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white">המשימות שלי</h1>
          <p class="text-white/80">בואו נסיים הכל היום! 💪</p>
        </div>
        <div class="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center gap-2">
          <span class="text-2xl">🪙</span>
          <span class="text-2xl font-bold text-white">{{ (user$ | async)?.famCoins || 0 }}</span>
        </div>
      </header>

      <!-- Progress Card -->
      <div class="bg-white rounded-3xl p-4 mb-6 shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <span class="font-bold text-gray-800">ההתקדמות שלי היום</span>
          <span class="text-kid-primary font-bold">{{ completedToday }}/{{ totalToday }}</span>
        </div>
        <div class="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-kid-primary to-kid-secondary rounded-full transition-all duration-500"
            [style.width.%]="progressPercent"
          ></div>
        </div>
        @if (progressPercent === 100) {
          <p class="text-center mt-3 text-kid-primary font-bold">🎉 כל הכבוד! סיימת הכל!</p>
        }
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
        @for (filter of filters; track filter.value) {
          <button
            (click)="setFilter(filter.value)"
            class="px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all"
            [class.bg-white]="(currentFilter$ | async) === filter.value"
            [class.text-kid-primary]="(currentFilter$ | async) === filter.value"
            [class.shadow-lg]="(currentFilter$ | async) === filter.value"
            [class.bg-white/20]="(currentFilter$ | async) !== filter.value"
            [class.text-white]="(currentFilter$ | async) !== filter.value"
          >
            {{ filter.icon }} {{ filter.label }}
          </button>
        }
      </div>

      <!-- Tasks List -->
      <div class="space-y-4">
        @for (task of filteredTasks$ | async; track task.id) {
          <div
            class="bg-white rounded-3xl p-4 shadow-lg transform transition-all"
            [class.opacity-60]="task.status === 'COMPLETED'"
            [class.must-do-glow]="task.isMustDo && task.status === 'PENDING'"
          >
            <div class="flex items-start gap-4">
              <!-- Completion Button -->
              <button
                (click)="toggleTask(task)"
                class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all flex-shrink-0"
                [class.bg-kid-primary]="task.status === 'COMPLETED'"
                [class.text-white]="task.status === 'COMPLETED'"
                [class.bg-gray-100]="task.status !== 'COMPLETED'"
                [class.hover:bg-kid-primary/20]="task.status !== 'COMPLETED'"
                [disabled]="task.status === 'AWAITING_APPROVAL'"
              >
                @if (task.status === 'COMPLETED') {
                  ✓
                } @else if (task.status === 'AWAITING_APPROVAL') {
                  ⏳
                } @else {
                  ○
                }
              </button>

              <!-- Task Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  @if (task.isMustDo) {
                    <span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full font-bold">חובה!</span>
                  }
                  <span class="text-2xl">{{ getCategoryIcon(task.category) }}</span>
                </div>
                <h3
                  class="font-bold text-gray-800 text-lg"
                  [class.line-through]="task.status === 'COMPLETED'"
                >
                  {{ task.title }}
                </h3>
                @if (task.description) {
                  <p class="text-gray-500 text-sm mt-1">{{ task.description }}</p>
                }

                <!-- Status Badge -->
                @if (task.status === 'AWAITING_APPROVAL') {
                  <div class="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    <span>⏳</span> מחכה לאישור הורה
                  </div>
                }
              </div>

              <!-- Coin Reward -->
              <div class="flex flex-col items-center gap-1">
                <div
                  class="flex items-center gap-1 px-3 py-2 rounded-xl font-bold"
                  [class.bg-fam-coin/20]="task.status !== 'COMPLETED'"
                  [class.text-fam-coin]="task.status !== 'COMPLETED'"
                  [class.bg-green-100]="task.status === 'COMPLETED'"
                  [class.text-green-600]="task.status === 'COMPLETED'"
                >
                  <span class="text-xl">🪙</span>
                  <span>{{ task.coinReward }}</span>
                </div>
                @if (task.status === 'COMPLETED') {
                  <span class="text-xs text-green-600">נאסף!</span>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="bg-white rounded-3xl p-8 text-center shadow-lg">
            @if ((currentFilter$ | async) === 'all') {
              <p class="text-6xl mb-4">📭</p>
              <p class="text-gray-500 font-medium">אין משימות עדיין</p>
              <p class="text-gray-400 text-sm">בקש מההורים להוסיף משימות</p>
            } @else if ((currentFilter$ | async) === 'todo') {
              <p class="text-6xl mb-4">🎉</p>
              <p class="text-gray-500 font-medium">אין משימות לעשות!</p>
              <p class="text-gray-400 text-sm">סיימת הכל, יופי!</p>
            } @else if ((currentFilter$ | async) === 'done') {
              <p class="text-6xl mb-4">📋</p>
              <p class="text-gray-500 font-medium">עוד לא סיימת משימות</p>
              <p class="text-gray-400 text-sm">בוא נתחיל!</p>
            } @else {
              <p class="text-6xl mb-4">✨</p>
              <p class="text-gray-500 font-medium">אין משימות ממתינות</p>
            }
          </div>
        }
      </div>

      <!-- Completion Animation Overlay -->
      @if (showCelebration) {
        <div class="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div class="text-center animate-bounce">
            <p class="text-8xl mb-4">🎉</p>
            <p class="text-4xl font-bold text-white drop-shadow-lg">+{{ lastReward }} 🪙</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .must-do-glow {
      animation: glow 2s ease-in-out infinite;
      border: 2px solid #F59E0B;
    }

    @keyframes glow {
      0%, 100% { box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
      50% { box-shadow: 0 0 25px rgba(245, 158, 11, 0.9); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyTasksComponent {
  private readonly authService = inject(AuthService);
  private readonly tasksStore = inject(TasksStore);

  user$ = this.authService.user$;

  currentFilter$ = new BehaviorSubject<TaskFilter>('all');

  filters: { value: TaskFilter; label: string; icon: string }[] = [
    { value: 'all', label: 'הכל', icon: '📋' },
    { value: 'todo', label: 'לעשות', icon: '⏰' },
    { value: 'pending', label: 'ממתין', icon: '⏳' },
    { value: 'done', label: 'הושלם', icon: '✅' }
  ];

  filteredTasks$ = combineLatest([
    this.tasksStore.tasks$,
    this.currentFilter$
  ]).pipe(
    map(([tasks, filter]: [any[], TaskFilter]) => {
      if (filter === 'todo') {
        return tasks.filter((t: any) => t.status === 'PENDING');
      } else if (filter === 'done') {
        return tasks.filter((t: any) => t.status === 'COMPLETED');
      } else if (filter === 'pending') {
        return tasks.filter((t: any) => t.status === 'AWAITING_APPROVAL');
      }
      return tasks;
    })
  );

  showCelebration = false;
  lastReward = 0;
  completedToday = 0;
  totalToday = 0;
  progressPercent = 0;

  constructor() {
    this.tasksStore.loadTasks();
    this.calculateProgress();
  }

  private calculateProgress(): void {
    this.tasksStore.todayTasks$.subscribe((tasks: any[]) => {
      this.totalToday = tasks.length;
      this.completedToday = tasks.filter((t: any) => t.status === 'COMPLETED').length;
      this.progressPercent = this.totalToday > 0
        ? Math.round((this.completedToday / this.totalToday) * 100)
        : 0;
    });
  }

  setFilter(filter: TaskFilter): void {
    this.currentFilter$.next(filter);
  }

  toggleTask(task: any): void {
    if (task.status === 'PENDING') {
      // Mark as awaiting approval
      this.tasksStore.completeTask(task.id);
      this.lastReward = task.coinReward;
      this.showCelebration = true;
      setTimeout(() => this.showCelebration = false, 1500);
    }
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'CHORE': '🧹',
      'HOMEWORK': '📚',
      'ERRAND': '🏃',
      'HEALTH': '💪',
      'SOCIAL': '👋',
      'OTHER': '📌'
    };
    return icons[category] || '📌';
  }
}
