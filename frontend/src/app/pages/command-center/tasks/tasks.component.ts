import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksStore, HouseholdStore } from '../../../core/stores';
import { AuthService } from '../../../core/services';
import { Task, CreateTaskDto, TaskCategory, TaskStatus } from '../../../core/models';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-adult-dark">Tasks</h1>
          <p class="text-gray-600">Manage family tasks and assignments</p>
        </div>
        <button
          (click)="openCreateModal()"
          class="bg-adult-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-adult-dark transition-colors flex items-center gap-2"
        >
          <span>+</span> New Task
        </button>
      </header>

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div class="flex flex-wrap gap-4">
          <!-- Status Filter -->
          <div class="flex items-center gap-2">
            <span class="text-gray-500 text-sm">Status:</span>
            <div class="flex gap-1">
              @for (status of statusFilters; track status.value) {
                <button
                  (click)="filterByStatus(status.value)"
                  [class.bg-adult-primary]="(currentStatusFilter$ | async) === status.value"
                  [class.text-white]="(currentStatusFilter$ | async) === status.value"
                  [class.bg-gray-100]="(currentStatusFilter$ | async) !== status.value"
                  class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  {{ status.label }}
                </button>
              }
            </div>
          </div>

          <!-- Category Filter -->
          <div class="flex items-center gap-2">
            <span class="text-gray-500 text-sm">Category:</span>
            <select
              [ngModel]="currentCategoryFilter$ | async"
              (ngModelChange)="filterByCategory($event)"
              class="bg-gray-100 rounded-lg px-3 py-1 text-sm"
            >
              <option value="">All</option>
              @for (cat of categories; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Tasks List -->
      <div class="space-y-4">
        @for (task of filteredTasks$ | async; track task.id) {
          <div
            class="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            [class.border-l-4]="task.isMustDo"
            [class.border-orange-500]="task.isMustDo"
            [class.opacity-60]="task.status === 'COMPLETED'"
          >
            <div class="flex items-start gap-4">
              <!-- Checkbox -->
              <button
                (click)="toggleComplete(task)"
                class="w-6 h-6 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center transition-colors"
                [class.border-gray-300]="task.status !== 'COMPLETED'"
                [class.border-green-500]="task.status === 'COMPLETED'"
                [class.bg-green-500]="task.status === 'COMPLETED'"
              >
                @if (task.status === 'COMPLETED') {
                  <span class="text-white text-sm">✓</span>
                }
              </button>

              <!-- Task Details -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-semibold text-lg" [class.line-through]="task.status === 'COMPLETED'">
                      {{ task.title }}
                      @if (task.isMustDo) {
                        <span class="text-orange-500 text-sm ml-2">⚡ Must Do</span>
                      }
                    </h3>
                    @if (task.description) {
                      <p class="text-gray-600 text-sm mt-1">{{ task.description }}</p>
                    }
                    <div class="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      @if (task.assignedTo) {
                        <span class="flex items-center gap-1">
                          <span>👤</span> {{ task.assignedTo.name }}
                        </span>
                      }
                      @if (task.dueDate) {
                        <span class="flex items-center gap-1" [class.text-red-500]="isOverdue(task)">
                          <span>📅</span> {{ task.dueDate | date:'short' }}
                        </span>
                      }
                      <span class="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full">
                        {{ task.category }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="flex items-center gap-1 text-fam-coin font-bold bg-yellow-50 px-3 py-1 rounded-full">
                      🪙 {{ task.coinReward }}
                    </span>
                    <button
                      (click)="openEditModal(task)"
                      class="p-2 text-gray-400 hover:text-adult-primary transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      (click)="deleteTask(task)"
                      class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="bg-white rounded-2xl p-12 shadow-sm text-center">
            <p class="text-6xl mb-4">📋</p>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">No tasks found</h3>
            <p class="text-gray-400 mb-4">Create your first task to get started!</p>
            <button
              (click)="openCreateModal()"
              class="bg-adult-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-adult-dark transition-colors"
            >
              Create Task
            </button>
          </div>
        }
      </div>

      <!-- Create/Edit Modal -->
      @if (showModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeModal()">
          <div class="bg-white rounded-2xl p-6 w-full max-w-lg" (click)="$event.stopPropagation()">
            <h2 class="text-2xl font-bold text-adult-dark mb-6">
              {{ editingTask ? 'Edit Task' : 'Create Task' }}
            </h2>

            <form (ngSubmit)="saveTask()" class="space-y-4">
              <!-- Title -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  [(ngModel)]="taskForm.title"
                  name="title"
                  required
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary focus:ring-2 focus:ring-adult-primary/20 outline-none"
                  placeholder="e.g., Clean your room"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  [(ngModel)]="taskForm.description"
                  name="description"
                  rows="3"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary focus:ring-2 focus:ring-adult-primary/20 outline-none resize-none"
                  placeholder="Add more details..."
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Category -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    [(ngModel)]="taskForm.category"
                    name="category"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary outline-none"
                  >
                    @for (cat of categories; track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                </div>

                <!-- Coin Reward -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Coin Reward</label>
                  <input
                    type="number"
                    [(ngModel)]="taskForm.coinReward"
                    name="coinReward"
                    min="1"
                    max="1000"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Due Date -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    [(ngModel)]="taskForm.dueDate"
                    name="dueDate"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary outline-none"
                  />
                </div>

                <!-- Assign To -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    [(ngModel)]="taskForm.assignedToId"
                    name="assignedToId"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary outline-none"
                  >
                    <option value="">Unassigned</option>
                    @for (member of members$ | async; track member.id) {
                      <option [value]="member.id">{{ member.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Must Do Toggle -->
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  [(ngModel)]="taskForm.isMustDo"
                  name="isMustDo"
                  id="isMustDo"
                  class="w-5 h-5 rounded border-gray-300 text-adult-primary focus:ring-adult-primary"
                />
                <label for="isMustDo" class="text-sm font-medium text-gray-700">
                  ⚡ Mark as Must-Do (glows on kid's screen!)
                </label>
              </div>

              <!-- Actions -->
              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 px-6 py-3 rounded-xl font-semibold bg-adult-primary text-white hover:bg-adult-dark transition-colors"
                >
                  {{ editingTask ? 'Update' : 'Create' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent {
  private readonly tasksStore = inject(TasksStore);
  private readonly householdStore = inject(HouseholdStore);
  private readonly authService = inject(AuthService);

  // Filters
  private readonly statusFilter$ = new BehaviorSubject<TaskStatus | ''>('');
  private readonly categoryFilter$ = new BehaviorSubject<TaskCategory | ''>('');

  currentStatusFilter$ = this.statusFilter$.asObservable();
  currentCategoryFilter$ = this.categoryFilter$.asObservable();

  // Data
  members$ = this.householdStore.members$;

  filteredTasks$ = combineLatest([
    this.tasksStore.tasks$,
    this.statusFilter$,
    this.categoryFilter$
  ]).pipe(
    map(([tasks, status, category]) => {
      return tasks.filter(task => {
        if (status && task.status !== status) return false;
        if (category && task.category !== category) return false;
        return true;
      });
    })
  );

  // UI State
  showModal = false;
  editingTask: Task | null = null;
  taskForm: Partial<CreateTaskDto> = this.getEmptyForm();

  // Filter options
  statusFilters: { value: TaskStatus | '', label: string }[] = [
    { value: '', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' }
  ];

  categories: TaskCategory[] = ['CHORE', 'HOMEWORK', 'ERRAND', 'HEALTH', 'SOCIAL', 'OTHER'];

  constructor() {
    this.tasksStore.loadTasks();
    this.householdStore.loadHousehold();
  }

  filterByStatus(status: TaskStatus | ''): void {
    this.statusFilter$.next(status);
  }

  filterByCategory(category: TaskCategory | ''): void {
    this.categoryFilter$.next(category);
  }

  openCreateModal(): void {
    this.editingTask = null;
    this.taskForm = this.getEmptyForm();
    this.showModal = true;
  }

  openEditModal(task: Task): void {
    this.editingTask = task;
    this.taskForm = {
      title: task.title,
      description: task.description || '',
      category: task.category,
      coinReward: task.coinReward,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
      assignedToId: task.assignedToId || '',
      isMustDo: task.isMustDo
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingTask = null;
  }

  saveTask(): void {
    if (!this.taskForm.title) return;

    const dto: CreateTaskDto = {
      title: this.taskForm.title!,
      description: this.taskForm.description,
      category: this.taskForm.category || 'OTHER',
      coinReward: this.taskForm.coinReward || 10,
      dueDate: this.taskForm.dueDate || undefined,
      assignedToId: this.taskForm.assignedToId || undefined,
      isMustDo: this.taskForm.isMustDo || false
    };

    if (this.editingTask) {
      this.tasksStore.updateTask(this.editingTask.id, dto).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.tasksStore.createTask(dto).subscribe(() => {
        this.closeModal();
      });
    }
  }

  toggleComplete(task: Task): void {
    if (task.status === 'COMPLETED') {
      this.tasksStore.updateTask(task.id, { status: 'PENDING' }).subscribe();
    } else {
      this.tasksStore.completeTask(task.id).subscribe();
    }
  }

  deleteTask(task: Task): void {
    if (confirm(`Delete "${task.title}"?`)) {
      this.tasksStore.deleteTask(task.id).subscribe();
    }
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  }

  private getEmptyForm(): Partial<CreateTaskDto> {
    return {
      title: '',
      description: '',
      category: 'CHORE',
      coinReward: 10,
      dueDate: '',
      assignedToId: '',
      isMustDo: false
    };
  }
}
