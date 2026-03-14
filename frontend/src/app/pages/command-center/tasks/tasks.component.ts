import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksStore, HouseholdStore } from '../../../core/stores';
import { AuthService, ThemeService, UITheme } from '../../../core/services';
import { Task, CreateTaskDto, TaskCategory, TaskStatus } from '../../../core/models';
import { BehaviorSubject, combineLatest, map } from 'rxjs';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tasks-page" [class.unicorn-theme]="isUnicornTheme()" dir="rtl">
      <!-- Theme-Aware Background -->
      @if (!isUnicornTheme()) {
        <div class="space-bg">
          <div class="stars"></div>
          <div class="nebula nebula-1"></div>
          <div class="nebula nebula-2"></div>
          @for (i of [1,2,3,4,5]; track i) {
            <div class="floating-element" [style.animation-delay]="i * 2 + 's'">
              {{ ['🪐', '⭐', '🌙', '☄️', '🛸'][i-1] }}
            </div>
          }
        </div>
      } @else {
        <div class="magical-bg">
          <div class="clouds"></div>
          <div class="rainbow-arc"></div>
          @for (i of [1,2,3,4,5]; track i) {
            <div class="floating-element" [style.animation-delay]="i * 1.5 + 's'">
              {{ ['✨', '🌸', '🦋', '💫', '🌈'][i-1] }}
            </div>
          }
        </div>
      }

      <!-- Header Panel -->
      <header class="header-panel">
        <div class="header-content">
          <div class="header-title">
            <span class="header-icon">{{ isUnicornTheme() ? '📚' : '✅' }}</span>
            <div>
              <h1>{{ isUnicornTheme() ? 'ספר המשימות הקסום' : 'תחנת המשימות' }}</h1>
              <p>מרכז המשפחה שלי</p>
            </div>
          </div>
          <div class="header-mascots">
            <span class="mascot">{{ currentTheme.assets.mascots[0] }}</span>
            <span class="mascot">{{ currentTheme.assets.mascots[1] || '🧚' }}</span>
          </div>
        </div>
        <button class="create-btn" (click)="openCreateModal()">
          <span>✨</span> {{ isUnicornTheme() ? 'משימה קסומה חדשה' : 'משימה חדשה' }}
        </button>
      </header>

      <!-- Status Filters - Planet Buttons -->
      <div class="filters-panel">
        <div class="filter-group">
          <span class="filter-label">🪐 מצב:</span>
          <div class="planet-filters">
            @for (status of statusFilters; track status.value) {
              <button
                class="planet-btn"
                [class.active]="(currentStatusFilter$ | async) === status.value"
                (click)="filterByStatus(status.value)"
              >
                <span class="planet-icon">{{ status.icon }}</span>
                <span class="planet-label">{{ status.label }}</span>
              </button>
            }
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">📂 קטגוריה:</span>
          <select
            [ngModel]="currentCategoryFilter$ | async"
            (ngModelChange)="filterByCategory($event)"
            class="cosmic-select"
          >
            <option value="">הכל</option>
            @for (cat of categoryOptions; track cat.value) {
              <option [value]="cat.value">{{ cat.icon }} {{ cat.label }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Tasks List -->
      <div class="tasks-container">
        @for (task of filteredTasks$ | async; track task.id) {
          <div
            class="task-card"
            [class.must-do]="task.isMustDo"
            [class.completed]="task.status === 'COMPLETED'"
          >
            <!-- Star Checkbox -->
            <button
              class="star-checkbox"
              [class.checked]="task.status === 'COMPLETED'"
              (click)="toggleComplete(task)"
            >
              @if (task.status === 'COMPLETED') {
                <span class="star-filled">⭐</span>
              } @else {
                <span class="star-empty">☆</span>
              }
            </button>

            <!-- Task Content -->
            <div class="task-content">
              <div class="task-header">
                <h3 [class.line-through]="task.status === 'COMPLETED'">
                  {{ task.title }}
                  @if (task.isMustDo) {
                    <span class="must-do-badge">⚡ חובה!</span>
                  }
                </h3>
                <div class="task-reward">
                  <span class="coin-icon">🪙</span>
                  <span class="coin-amount">{{ task.coinReward }}</span>
                </div>
              </div>

              @if (task.description) {
                <p class="task-description">{{ task.description }}</p>
              }

              <div class="task-meta">
                @if (task.assignedTo) {
                  <span class="meta-item assignee">
                    <span class="avatar" [class.has-image]="task.assignedTo.avatarUrl">
                      @if (task.assignedTo.avatarUrl) {
                        <img [src]="task.assignedTo.avatarUrl" alt="" class="avatar-img" />
                      } @else {
                        {{ task.assignedTo.name.charAt(0) }}
                      }
                    </span>
                    {{ task.assignedTo.name }}
                  </span>
                }
                @if (task.dueDate) {
                  <span class="meta-item due-date" [class.overdue]="isOverdue(task)">
                    <span>📅</span> {{ task.dueDate | date:'d/M' }}
                  </span>
                }
                <span class="meta-item category">
                  {{ getCategoryIcon(task.category) }} {{ getCategoryLabel(task.category) }}
                </span>
              </div>

              <!-- Robot Helper Status -->
              <div class="robot-status">
                @switch (task.status) {
                  @case ('PENDING') {
                    <span class="robot-helper waiting">🤖 מחכה למישהו...</span>
                  }
                  @case ('IN_PROGRESS') {
                    <span class="robot-helper working">👀 ממתין לאישור הורה</span>
                  }
                  @case ('COMPLETED') {
                    <span class="robot-helper done">🤖 סיימנו! 🎉</span>
                  }
                }
              </div>

              <!-- Approve Button for Adults (when IN_PROGRESS) -->
              @if ((isAdult$ | async) && task.status === 'IN_PROGRESS') {
                <button class="approve-btn" (click)="openApprovalModal(task)">
                  ✅ אשר השלמה
                </button>
              }
            </div>

            <!-- Actions -->
            @if (isAdult$ | async) {
              <div class="task-actions">
                <button class="action-btn edit" (click)="openEditModal(task)" title="עריכה">
                  ✏️
                </button>
                <button class="action-btn delete" (click)="deleteTask(task)" title="מחיקה">
                  🗑️
                </button>
              </div>
            }
          </div>
        } @empty {
          <div class="empty-state">
            <div class="empty-illustration">
              <span class="empty-robot">🤖</span>
              <span class="empty-chinchilla">🐹</span>
            </div>
            <h3>אין משימות כרגע</h3>
            <p>צור משימה חדשה כדי להתחיל!</p>
            <button class="create-btn" (click)="openCreateModal()">
              <span>✨</span> צור משימה ראשונה
            </button>
          </div>
        }
      </div>

      <!-- Progress Nebula -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-icon">🚀</span>
          <h4>התקדמות המשימות</h4>
        </div>
        <div class="nebula-progress">
          <div class="nebula-track">
            <div class="nebula-fill" [style.width]="getCompletionPercentage() + '%'"></div>
          </div>
          <span class="progress-text">{{ getCompletionPercentage() }}% הושלמו</span>
        </div>
        <div class="progress-stars">
          @for (i of [1,2,3,4,5]; track i) {
            <span class="progress-star" [class.earned]="getCompletionPercentage() >= i * 20">
              {{ getCompletionPercentage() >= i * 20 ? '⭐' : '☆' }}
            </span>
          }
        </div>
      </div>

      <!-- Create/Edit Modal -->
      @if (showModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" dir="rtl" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-icon">{{ editingTask ? '✏️' : '✨' }}</span>
              <h2>{{ editingTask ? 'עריכת משימה' : 'משימה חדשה' }}</h2>
              <span class="modal-mascot">🤖</span>
            </div>

            <form (ngSubmit)="saveTask()" class="modal-form">
              <!-- Title -->
              <div class="form-group">
                <label>
                  <span class="label-icon">📝</span>
                  שם המשימה
                </label>
                <input
                  type="text"
                  [(ngModel)]="taskForm.title"
                  name="title"
                  required
                  class="cosmic-input"
                  placeholder="למשל: לסדר את החדר"
                />
              </div>

              <!-- Description -->
              <div class="form-group">
                <label>
                  <span class="label-icon">📋</span>
                  תיאור
                </label>
                <textarea
                  [(ngModel)]="taskForm.description"
                  name="description"
                  rows="3"
                  class="cosmic-input"
                  placeholder="פרטים נוספים..."
                ></textarea>
              </div>

              <div class="form-row">
                <!-- Category -->
                <div class="form-group">
                  <label>
                    <span class="label-icon">📂</span>
                    קטגוריה
                  </label>
                  <select [(ngModel)]="taskForm.category" name="category" class="cosmic-input">
                    @for (cat of categoryOptions; track cat.value) {
                      <option [value]="cat.value">{{ cat.icon }} {{ cat.label }}</option>
                    }
                  </select>
                </div>

                <!-- Coin Reward -->
                <div class="form-group">
                  <label>
                    <span class="label-icon">🪙</span>
                    פרס מטבעות
                  </label>
                  <input
                    type="number"
                    [(ngModel)]="taskForm.coinReward"
                    name="coinReward"
                    min="1"
                    max="1000"
                    class="cosmic-input"
                  />
                </div>
              </div>

              <div class="form-row">
                <!-- Due Date -->
                <div class="form-group">
                  <label>
                    <span class="label-icon">📅</span>
                    תאריך יעד
                  </label>
                  <input
                    type="datetime-local"
                    [(ngModel)]="taskForm.dueDate"
                    name="dueDate"
                    class="cosmic-input"
                  />
                </div>

                <!-- Assign To -->
                <div class="form-group">
                  <label>
                    <span class="label-icon">👤</span>
                    הקצאה ל
                  </label>
                  <select [(ngModel)]="taskForm.assignedToId" name="assignedToId" class="cosmic-input">
                    <option value="">לא מוקצה</option>
                    @for (member of members$ | async; track member.id) {
                      <option [value]="member.id">{{ member.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Must Do Toggle -->
              <label class="must-do-toggle">
                <input
                  type="checkbox"
                  [(ngModel)]="taskForm.isMustDo"
                  name="isMustDo"
                />
                <span class="toggle-switch"></span>
                <span class="toggle-label">
                  <span>⚡</span> סמן כחובה (זוהר במסך הילדים!)
                </span>
              </label>

              <!-- Actions -->
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeModal()">
                  ביטול
                </button>
                <button type="submit" class="btn-save">
                  <span>{{ editingTask ? '💾' : '✨' }}</span>
                  {{ editingTask ? 'שמור' : 'צור משימה' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Approval Modal -->
      @if (showApprovalModal && taskToApprove) {
        <div class="modal-overlay" (click)="closeApprovalModal()">
          <div class="modal-content approval-modal" dir="rtl" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-icon">🎉</span>
              <h2>אשר השלמת משימה</h2>
              <span class="modal-mascot">🏆</span>
            </div>

            <div class="approval-content">
              <div class="task-info">
                <h3>{{ taskToApprove.title }}</h3>
                <div class="reward-display">
                  <span class="reward-icon">⭐</span>
                  <span class="reward-amount">{{ taskToApprove.coinReward }} כוכבים</span>
                </div>
              </div>

              <div class="form-group">
                <label>
                  <span class="label-icon">👤</span>
                  מי ביצע את המשימה?
                </label>
                <select [(ngModel)]="selectedCompleterId" class="cosmic-select">
                  <option value="">בחר בן משפחה...</option>
                  @for (member of members$ | async; track member.id) {
                    <option [value]="member.id">{{ member.name }}</option>
                  }
                </select>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeApprovalModal()">
                  ביטול
                </button>
                <button
                  type="button"
                  class="btn-approve"
                  [disabled]="!selectedCompleterId"
                  (click)="approveCompletion()"
                >
                  <span>✅</span> אשר ותגמל
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .tasks-page {
      min-height: 100vh;
      padding: 24px;
      position: relative;
    }

    /* Unicorn Theme Overrides */
    .tasks-page.unicorn-theme {
      color: #1f2937;
    }

    .tasks-page.unicorn-theme .header-panel,
    .tasks-page.unicorn-theme .filters-panel,
    .tasks-page.unicorn-theme .task-card {
      background: rgba(255,255,255,0.9);
      border-color: rgba(236,72,153,0.2);
    }

    .tasks-page.unicorn-theme h1,
    .tasks-page.unicorn-theme h2,
    .tasks-page.unicorn-theme h3 {
      color: #581c87;
    }

    .tasks-page.unicorn-theme p,
    .tasks-page.unicorn-theme .task-description {
      color: #6b7280;
    }

    .tasks-page.unicorn-theme .create-btn {
      background: linear-gradient(135deg, #ec4899, #a855f7);
    }

    .tasks-page.unicorn-theme .cosmic-select {
      background: rgba(255,255,255,0.9);
      color: #1f2937;
      border-color: rgba(236,72,153,0.3);
    }

    .tasks-page.unicorn-theme .planet-btn.active {
      background: linear-gradient(135deg, #ec4899, #a855f7);
    }

    .magical-bg {
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, #fdf2f8 0%, #fae8ff 30%, #e0f2fe 70%, #fdf2f8 100%);
      z-index: -1;
      overflow: hidden;
    }

    .magical-bg .clouds {
      position: absolute;
      width: 200%;
      height: 100%;
      background:
        radial-gradient(ellipse 100px 60px at 10% 20%, rgba(255,255,255,0.8) 0%, transparent 70%),
        radial-gradient(ellipse 120px 70px at 30% 60%, rgba(255,255,255,0.7) 0%, transparent 70%),
        radial-gradient(ellipse 80px 50px at 60% 30%, rgba(255,255,255,0.9) 0%, transparent 70%),
        radial-gradient(ellipse 100px 60px at 80% 70%, rgba(255,255,255,0.8) 0%, transparent 70%);
      animation: clouds-drift 60s linear infinite;
    }

    @keyframes clouds-drift {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }

    .magical-bg .rainbow-arc {
      position: absolute;
      top: -150px;
      left: -50px;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      background: conic-gradient(
        from 180deg,
        #ef4444, #f97316, #fbbf24, #22c55e, #3b82f6, #8b5cf6, transparent
      );
      opacity: 0.25;
      filter: blur(30px);
    }

    .magical-bg .floating-element {
      position: absolute;
      font-size: 2rem;
      animation: magic-drift 10s ease-in-out infinite;
      opacity: 0.7;
    }

    .magical-bg .floating-element:nth-child(3) { top: 10%; left: 15%; }
    .magical-bg .floating-element:nth-child(4) { top: 30%; right: 10%; }
    .magical-bg .floating-element:nth-child(5) { top: 50%; left: 5%; }
    .magical-bg .floating-element:nth-child(6) { top: 70%; right: 15%; }
    .magical-bg .floating-element:nth-child(7) { top: 85%; left: 25%; }

    @keyframes magic-drift {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(10deg); }
    }

    /* Space Background */
    .space-bg {
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a2e 100%);
      z-index: -1;
    }

    .stars {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(2px 2px at 20px 30px, white, transparent),
        radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 90px 40px, white, transparent),
        radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent);
      background-size: 250px 250px;
      animation: twinkle 4s ease-in-out infinite;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .nebula {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.3;
    }

    .nebula-1 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, #6b21a8, transparent);
      top: -100px;
      right: -100px;
      animation: float 20s ease-in-out infinite;
    }

    .nebula-2 {
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, #db2777, transparent);
      bottom: -50px;
      left: -50px;
      animation: float 25s ease-in-out infinite reverse;
    }

    .floating-element {
      position: absolute;
      font-size: 2rem;
      animation: float 15s ease-in-out infinite;
      opacity: 0.6;
    }

    .floating-element:nth-child(4) { top: 10%; right: 10%; }
    .floating-element:nth-child(5) { top: 30%; left: 5%; }
    .floating-element:nth-child(6) { top: 60%; right: 15%; }
    .floating-element:nth-child(7) { bottom: 20%; left: 10%; }
    .floating-element:nth-child(8) { top: 45%; right: 5%; }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(10deg); }
    }

    /* Header Panel */
    .header-panel {
      background: rgba(30, 20, 50, 0.8);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 20px 28px;
      margin-bottom: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 2.5rem;
    }

    .header-title h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .header-title p {
      color: rgba(255,255,255,0.6);
      margin: 4px 0 0;
      font-size: 0.9rem;
    }

    .header-mascots {
      display: flex;
      gap: 8px;
    }

    .mascot {
      font-size: 2rem;
      animation: bounce 2s ease-in-out infinite;
    }

    .mascot.robot {
      animation-delay: 0.3s;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .create-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #6b21a8, #db2777);
      border: none;
      border-radius: 16px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 8px 30px rgba(107, 33, 168, 0.4);
    }

    .create-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(107, 33, 168, 0.5);
    }

    /* Filters Panel */
    .filters-panel {
      background: rgba(30, 20, 50, 0.7);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      align-items: center;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .filter-label {
      color: rgba(255,255,255,0.7);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .planet-filters {
      display: flex;
      gap: 8px;
    }

    .planet-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: rgba(255,255,255,0.7);
      cursor: pointer;
      transition: all 0.2s;
    }

    .planet-btn:hover {
      background: rgba(255,255,255,0.1);
    }

    .planet-btn.active {
      background: linear-gradient(135deg, #6b21a8, #db2777);
      border-color: transparent;
      color: white;
      box-shadow: 0 4px 15px rgba(107, 33, 168, 0.4);
    }

    .planet-icon {
      font-size: 1rem;
    }

    .planet-label {
      font-size: 0.85rem;
      font-weight: 600;
    }

    .cosmic-select {
      padding: 10px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: white;
      font-size: 0.9rem;
      cursor: pointer;
      outline: none;
    }

    .cosmic-select option {
      background: #1a0a2e;
      color: white;
    }

    /* Tasks Container */
    .tasks-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    /* Task Card */
    .task-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      background: rgba(30, 20, 50, 0.7);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.3s;
    }

    .task-card:hover {
      background: rgba(40, 30, 60, 0.8);
      transform: translateX(-4px);
    }

    .task-card.must-do {
      border: 2px solid #fbbf24;
      box-shadow: 0 0 30px rgba(251, 191, 36, 0.2);
      animation: must-do-glow 2s ease-in-out infinite;
    }

    @keyframes must-do-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); }
      50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.4); }
    }

    .task-card.completed {
      opacity: 0.6;
    }

    /* Star Checkbox */
    .star-checkbox {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.05);
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 50%;
      cursor: pointer;
      transition: all 0.3s;
      flex-shrink: 0;
    }

    .star-checkbox:hover {
      background: rgba(255,255,255,0.1);
      transform: scale(1.1);
    }

    .star-checkbox.checked {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      border-color: #fbbf24;
    }

    .star-empty {
      font-size: 1.5rem;
      color: rgba(255,255,255,0.4);
    }

    .star-filled {
      font-size: 1.5rem;
      animation: star-pop 0.3s ease-out;
    }

    @keyframes star-pop {
      0% { transform: scale(0.5); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    /* Task Content */
    .task-content {
      flex: 1;
      min-width: 0;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 8px;
    }

    .task-header h3 {
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }

    .task-header h3.line-through {
      text-decoration: line-through;
      opacity: 0.6;
    }

    .must-do-badge {
      display: inline-block;
      padding: 2px 8px;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      border-radius: 8px;
      font-size: 0.75rem;
      color: #78350f;
      font-weight: 700;
      margin-right: 8px;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .task-reward {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: rgba(251, 191, 36, 0.2);
      border-radius: 12px;
      flex-shrink: 0;
    }

    .coin-icon {
      font-size: 1rem;
    }

    .coin-amount {
      color: #fbbf24;
      font-weight: 700;
      font-size: 1rem;
    }

    .task-description {
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      margin: 0 0 12px;
    }

    .task-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.7);
    }

    .meta-item.assignee .avatar {
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #6b21a8, #db2777);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: white;
      font-weight: 700;
    }

    .meta-item.assignee .avatar.has-image {
      padding: 0;
      overflow: hidden;
    }

    .meta-item.assignee .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .meta-item.overdue {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .robot-status {
      margin-top: 12px;
    }

    .robot-helper {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .robot-helper.waiting {
      background: rgba(156, 163, 175, 0.2);
      color: #9ca3af;
    }

    .robot-helper.working {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }

    .robot-helper.done {
      background: rgba(34, 197, 94, 0.2);
      color: #4ade80;
    }

    /* Task Actions */
    .task-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .action-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.edit:hover {
      background: rgba(107, 33, 168, 0.3);
    }

    .action-btn.delete:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: rgba(30, 20, 50, 0.6);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .empty-illustration {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .empty-illustration .empty-robot,
    .empty-illustration .empty-chinchilla {
      animation: float 3s ease-in-out infinite;
    }

    .empty-illustration .empty-chinchilla {
      animation-delay: 0.5s;
    }

    .empty-state h3 {
      color: white;
      font-size: 1.5rem;
      margin: 0 0 8px;
    }

    .empty-state p {
      color: rgba(255,255,255,0.5);
      margin: 0 0 24px;
    }

    /* Progress Section */
    .progress-section {
      background: rgba(30, 20, 50, 0.7);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .progress-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .progress-icon {
      font-size: 1.5rem;
    }

    .progress-header h4 {
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
    }

    .nebula-progress {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .nebula-track {
      flex: 1;
      height: 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 6px;
      overflow: hidden;
    }

    .nebula-fill {
      height: 100%;
      background: linear-gradient(90deg, #6b21a8, #db2777, #fbbf24);
      border-radius: 6px;
      transition: width 0.5s ease-out;
      box-shadow: 0 0 20px rgba(219, 39, 119, 0.5);
    }

    .progress-text {
      color: rgba(255,255,255,0.7);
      font-size: 0.9rem;
      font-weight: 600;
      min-width: 80px;
    }

    .progress-stars {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .progress-star {
      font-size: 1.5rem;
      transition: all 0.3s;
    }

    .progress-star.earned {
      animation: star-earned 0.5s ease-out;
    }

    @keyframes star-earned {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }

    .modal-content {
      width: 100%;
      max-width: 550px;
      max-height: 90vh;
      overflow-y: auto;
      background: linear-gradient(135deg, #1a0a2e, #0a1a2e);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px;
      background: rgba(107, 33, 168, 0.2);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .modal-icon {
      font-size: 1.75rem;
    }

    .modal-header h2 {
      flex: 1;
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .modal-mascot {
      font-size: 2rem;
      animation: bounce 2s ease-in-out infinite;
    }

    .modal-form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.8);
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 0.9rem;
    }

    .label-icon {
      font-size: 1rem;
    }

    .cosmic-input {
      width: 100%;
      padding: 14px 18px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      color: white;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }

    .cosmic-input:focus {
      border-color: #6b21a8;
      box-shadow: 0 0 20px rgba(107, 33, 168, 0.3);
    }

    .cosmic-input::placeholder {
      color: rgba(255,255,255,0.4);
    }

    textarea.cosmic-input {
      resize: none;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* Must Do Toggle */
    .must-do-toggle {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 14px;
      cursor: pointer;
      margin-bottom: 20px;
    }

    .must-do-toggle input {
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

    .must-do-toggle input:checked + .toggle-switch {
      background: #fbbf24;
    }

    .must-do-toggle input:checked + .toggle-switch::after {
      transform: translateX(20px);
    }

    .toggle-label {
      color: rgba(255,255,255,0.8);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .btn-cancel {
      flex: 1;
      padding: 14px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 14px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: rgba(255,255,255,0.2);
    }

    .btn-save {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      background: linear-gradient(135deg, #6b21a8, #db2777);
      border: none;
      border-radius: 14px;
      color: white;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(107, 33, 168, 0.4);
    }

    /* Approval Flow */
    .approve-btn {
      padding: 10px 16px;
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .approve-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    }

    .approval-modal {
      max-width: 500px;
    }

    .approval-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .task-info {
      text-align: center;
      padding: 20px;
      background: rgba(107, 33, 168, 0.1);
      border-radius: 16px;
      border: 1px solid rgba(107, 33, 168, 0.3);
    }

    .task-info h3 {
      color: white;
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 16px 0;
    }

    .reward-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      border-radius: 16px;
      box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
    }

    .reward-icon {
      font-size: 28px;
      animation: pulse-reward 2s ease-in-out infinite;
    }

    @keyframes pulse-reward {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    .reward-amount {
      color: white;
      font-size: 18px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .cosmic-select {
      width: 100%;
      padding: 14px;
      background: rgba(30, 20, 50, 0.8);
      border: 2px solid rgba(107, 33, 168, 0.4);
      border-radius: 12px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      direction: rtl;
    }

    .cosmic-select:hover {
      border-color: rgba(107, 33, 168, 0.6);
    }

    .cosmic-select:focus {
      outline: none;
      border-color: #6b21a8;
      box-shadow: 0 0 0 3px rgba(107, 33, 168, 0.2);
    }

    .cosmic-select option {
      background: #1a0a2e;
      color: white;
      padding: 10px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .tasks-page {
        padding: 16px;
      }

      .header-panel {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }

      .header-content {
        flex-direction: column;
      }

      .filters-panel {
        flex-direction: column;
        align-items: stretch;
      }

      .planet-filters {
        flex-wrap: wrap;
      }

      .task-card {
        flex-direction: column;
      }

      .star-checkbox {
        align-self: flex-start;
      }

      .task-actions {
        flex-direction: row;
        justify-content: flex-end;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent {
  private readonly tasksStore = inject(TasksStore);
  private readonly householdStore = inject(HouseholdStore);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly statusFilter$ = new BehaviorSubject<TaskStatus | ''>('');
  private readonly categoryFilter$ = new BehaviorSubject<TaskCategory | ''>('');

  currentTheme: UITheme = this.themeService.getCurrentTheme();

  constructor() {
    this.tasksStore.loadTasks();
    this.householdStore.loadHousehold();
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });
  }

  isUnicornTheme(): boolean {
    return this.currentTheme.id === 'candy' || this.currentTheme.id === 'princess';
  }

  currentStatusFilter$ = this.statusFilter$.asObservable();
  currentCategoryFilter$ = this.categoryFilter$.asObservable();

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

  showModal = false;
  editingTask: Task | null = null;
  taskForm: Partial<CreateTaskDto> = this.getEmptyForm();

  // Approval modal
  showApprovalModal = false;
  taskToApprove: Task | null = null;
  selectedCompleterId = '';

  isAdult$ = this.authService.isAdult$;

  statusFilters: { value: TaskStatus | '', label: string, icon: string }[] = [
    { value: '', label: 'הכל', icon: '🌍' },
    { value: 'PENDING', label: 'ממתין', icon: '⏳' },
    { value: 'IN_PROGRESS', label: 'ממתין לאישור', icon: '👀' },
    { value: 'COMPLETED', label: 'הושלם', icon: '✅' }
  ];

  categoryOptions = [
    { value: 'CHORE', label: 'מטלות בית', icon: '🏠' },
    { value: 'HOMEWORK', label: 'שיעורי בית', icon: '📚' },
    { value: 'ERRAND', label: 'סידורים', icon: '🛒' },
    { value: 'HEALTH', label: 'בריאות', icon: '💪' },
    { value: 'SOCIAL', label: 'חברתי', icon: '👥' },
    { value: 'OTHER', label: 'אחר', icon: '📌' }
  ];

  categories: TaskCategory[] = ['CHORE', 'HOMEWORK', 'ERRAND', 'HEALTH', 'SOCIAL', 'OTHER'];

  filterByStatus(status: TaskStatus | ''): void {
    this.statusFilter$.next(status);
  }

  filterByCategory(category: TaskCategory | ''): void {
    this.categoryFilter$.next(category);
  }

  getCategoryIcon(category: TaskCategory): string {
    return this.categoryOptions.find(c => c.value === category)?.icon || '📌';
  }

  getCategoryLabel(category: TaskCategory): string {
    return this.categoryOptions.find(c => c.value === category)?.label || 'אחר';
  }

  getCompletionPercentage(): number {
    // This would come from the store in a real app
    return 40;
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
      // Unmark as complete (adults only)
      this.tasksStore.updateTask(task.id, { status: 'PENDING' }).subscribe();
    } else if (task.status === 'IN_PROGRESS') {
      // Unmark as done - back to pending
      this.tasksStore.updateTask(task.id, { status: 'PENDING' }).subscribe();
    } else {
      // Mark as "done" - goes to IN_PROGRESS (awaiting approval)
      this.tasksStore.updateTask(task.id, { status: 'IN_PROGRESS' }).subscribe();
    }
  }

  deleteTask(task: Task): void {
    if (confirm(`למחוק את "${task.title}"?`)) {
      this.tasksStore.deleteTask(task.id).subscribe();
    }
  }

  openApprovalModal(task: Task): void {
    this.taskToApprove = task;
    this.selectedCompleterId = task.assignedToId || '';
    this.showApprovalModal = true;
  }

  closeApprovalModal(): void {
    this.showApprovalModal = false;
    this.taskToApprove = null;
    this.selectedCompleterId = '';
  }

  approveCompletion(): void {
    if (!this.taskToApprove || !this.selectedCompleterId) return;

    this.tasksStore.approveTaskCompletion(this.taskToApprove.id, this.selectedCompleterId).subscribe({
      next: () => {
        this.closeApprovalModal();
      },
      error: (err) => {
        alert('שגיאה באישור המשימה');
        console.error(err);
      }
    });
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
