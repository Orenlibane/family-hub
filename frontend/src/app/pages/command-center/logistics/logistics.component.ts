import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, CdkDrag, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { LogisticsStore, HouseholdStore } from '../../../core/stores';
import { AuthService, ThemeService, UITheme } from '../../../core/services';
import {
  LogisticsItem,
  LogisticsCategory,
  LOGISTICS_CATEGORY_LABELS,
  HEBREW_DAYS,
  CreateLogisticsDto
} from '../../../core/models';
import { User } from '../../../core/models';

interface DropZone {
  category: LogisticsCategory;
  dayOfWeek: number;
}

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="logistics-page" [class.unicorn-theme]="currentTheme?.id === 'unicorn'" [class.cosmic-theme]="currentTheme?.id !== 'unicorn'" dir="rtl">
      <!-- Background -->
      <div class="theme-bg">
        @if (currentTheme?.id === 'unicorn') {
          <div class="clouds cloud-1"></div>
          <div class="clouds cloud-2"></div>
          <div class="rainbow-arc"></div>
          <div class="sparkles"></div>
          @for (i of [1,2,3,4,5]; track i) {
            <div class="floating-magic" [style.animation-delay]="i * 1.5 + 's'" [style.left.%]="i * 18">
              {{ ['✨', '🌸', '💫', '⭐', '🦋'][i-1] }}
            </div>
          }
        } @else {
          <div class="stars"></div>
          <div class="nebula"></div>
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="floating-planet" [style.animation-delay]="i * 2 + 's'" [style.left.%]="i * 15">
              {{ ['🪐', '⭐', '🌙', '✨', '🚀', '💫'][i-1] }}
            </div>
          }
        }
      </div>

      <div class="content-wrapper">
        <!-- Header -->
        <header class="page-header">
          <div class="header-pill">
            <span class="header-icon">📋</span>
            <div>
              <h1>לוח פיקוד שבועי</h1>
              <p>מי עושה מה השבוע?</p>
            </div>
            <span class="header-mascot">{{ currentTheme?.id === 'unicorn' ? '🦄' : '🚀' }}</span>
          </div>
        </header>

        <!-- Week Navigation -->
        <div class="week-nav">
          <button class="nav-btn" (click)="previousWeek()" [title]="'שבוע קודם'">
            <span class="nav-arrow">◀</span>
            <span class="nav-label">קודם</span>
          </button>

          <div class="week-indicator">
            <div class="week-title">{{ getWeekTitle() }}</div>
            <div class="week-dates">
              {{ formatDate(weekStartDate) }} - {{ formatDate(weekEndDate) }}
            </div>
            @if (currentWeekOffset !== 0) {
              <button class="back-to-current" (click)="goToCurrentWeek()">
                חזור לשבוע הנוכחי ⚡
              </button>
            }
          </div>

          <button class="nav-btn" (click)="nextWeek()" [title]="'שבוע הבא'">
            <span class="nav-label">הבא</span>
            <span class="nav-arrow">▶</span>
          </button>
        </div>

        <!-- Avatar Dock - Make it a drop list source -->
        <div class="avatar-dock" cdkDropList #avatarList="cdkDropList" [cdkDropListData]="membersArray" [cdkDropListConnectedTo]="dropListIds" cdkDropListSortingDisabled>
          <div class="dock-label">גרור אותי לזון! 👇</div>
          <div class="avatars-row">
            @for (member of members$ | async; track member.id) {
              <div
                class="avatar-item"
                cdkDrag
                [cdkDragData]="member"
              >
                <div class="avatar-circle" [style.background]="getAvatarGradient(member.role)" [class.has-image]="member.avatarUrl">
                  @if (member.avatarUrl) {
                    <img [src]="member.avatarUrl" alt="" class="avatar-circle-img" />
                  } @else {
                    <span class="avatar-emoji">{{ member.avatar || member.name?.charAt(0) || '?' }}</span>
                  }
                </div>
                <span class="avatar-name">{{ member.name }}</span>
                <div class="avatar-glow"></div>

                <!-- Drag Preview -->
                <div *cdkDragPreview class="drag-preview">
                  <div class="preview-avatar" [style.background]="getAvatarGradient(member.role)" [class.has-image]="member.avatarUrl">
                    @if (member.avatarUrl) {
                      <img [src]="member.avatarUrl" alt="" class="preview-avatar-img" />
                    } @else {
                      {{ member.avatar || member.name?.charAt(0) || '?' }}
                    }
                  </div>
                  <span>{{ member.name }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Week Grid -->
        <div class="week-grid">
          @for (day of [0,1,2,3,4,5,6]; track day) {
            <div class="day-card" [class.shabbat]="day === 6" [class.today]="isToday(day)">
              <div class="day-header">
                <div class="day-title-row">
                  <span class="day-icon">{{ getDayIcon(day) }}</span>
                  <span class="day-name">יום {{ hebrewDays[day] }}</span>
                  @if (day === 6) {
                    <span class="shabbat-icon">✡️</span>
                  }
                  @if (isToday(day)) {
                    <span class="today-badge">היום</span>
                  }
                </div>
                <div class="day-date">{{ formatDate(getDateForDay(day)) }}</div>
              </div>

              <div class="day-zones">
                @for (category of categories; track category) {
                  <div
                    class="drop-zone"
                    cdkDropList
                    #dropList="cdkDropList"
                    [id]="'drop-' + day + '-' + category"
                    [cdkDropListData]="{category: category, dayOfWeek: day}"
                    [cdkDropListConnectedTo]="[avatarList]"
                    (cdkDropListDropped)="onMemberDrop($event, day, category)"
                  >
                    <div class="zone-header">
                      <span>{{ getCategoryEmoji(category) }}</span>
                      <span>{{ getCategoryLabel(category) }}</span>
                    </div>
                    <div class="zone-items">
                      @for (item of getItemsForZone(day, category); track item.id) {
                        <div class="logistics-item" [class.has-assignee]="item.assignedTo">
                          @if (item.assignedTo) {
                            <div class="item-avatar" [style.background]="getAvatarGradient(item.assignedTo.role || 'KID')" [class.has-image]="item.assignedTo.avatarUrl">
                              @if (item.assignedTo.avatarUrl) {
                                <img [src]="item.assignedTo.avatarUrl" alt="" class="item-avatar-img" />
                              } @else {
                                {{ item.assignedTo.avatar || item.assignedTo.name?.charAt(0) || '?' }}
                              }
                            </div>
                          } @else {
                            <div class="item-avatar unassigned">?</div>
                          }
                          <div class="item-content">
                            <span class="item-title">{{ item.title }}</span>
                            @if (item.timeSlot) {
                              <span class="item-time">{{ item.timeSlot }}</span>
                            }
                          </div>
                          @if (isAdult$ | async) {
                            <button class="item-remove" (click)="removeItem(item.id)">✖</button>
                          }
                        </div>
                      }
                      @if (getItemsForZone(day, category).length === 0) {
                        <div class="empty-zone">
                          <span class="empty-icon">{{ currentTheme?.id === 'unicorn' ? '🌈' : '🌌' }}</span>
                          <span>שחרר כאן</span>
                        </div>
                      }
                    </div>
                    @if (isAdult$ | async) {
                      <button class="add-item-btn" (click)="openAddModal(day, category)">
                        <span>➕</span> הוסף
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Save Button -->
        @if ((hasUnsavedChanges$ | async) && (isAdult$ | async)) {
          <button class="save-fab" (click)="saveAll()" [disabled]="isSaving$ | async">
            <span class="fab-icon">{{ currentTheme?.id === 'unicorn' ? '🪄' : '🚀' }}</span>
            <span>סנכרן שבוע</span>
          </button>
        }
      </div>

      <!-- Add Item Modal -->
      @if (showAddModal) {
        <div class="modal-overlay" (click)="closeAddModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-icon">{{ currentTheme?.id === 'unicorn' ? '✨' : '🌟' }}</span>
              <h2>הוסף פריט</h2>
              <span class="modal-mascot">{{ currentTheme?.id === 'unicorn' ? '🦄' : '🚀' }}</span>
            </div>
            <form (ngSubmit)="addItem()" class="modal-form">
              <div class="form-group">
                <label><span class="label-icon">📝</span> כותרת</label>
                <input type="text" [(ngModel)]="itemForm.title" name="title" class="form-input" required placeholder="מה לעשות?" />
              </div>
              <div class="form-group">
                <label><span class="label-icon">🕐</span> שעה (אופציונלי)</label>
                <input type="time" [(ngModel)]="itemForm.timeSlot" name="timeSlot" class="form-input" />
              </div>
              <div class="form-group">
                <label><span class="label-icon">📋</span> הערות (אופציונלי)</label>
                <textarea [(ngModel)]="itemForm.notes" name="notes" class="form-input textarea" placeholder="פרטים נוספים..."></textarea>
              </div>
              <div class="form-group">
                <label><span class="label-icon">👤</span> שייך ל:</label>
                <div class="assignee-grid">
                  <button
                    type="button"
                    class="assignee-btn"
                    [class.selected]="!itemForm.assignedToId"
                    (click)="itemForm.assignedToId = undefined"
                  >
                    <span>❓</span>
                    <span>לא משויך</span>
                  </button>
                  @for (member of members$ | async; track member.id) {
                    <button
                      type="button"
                      class="assignee-btn"
                      [class.selected]="itemForm.assignedToId === member.id"
                      (click)="itemForm.assignedToId = member.id"
                    >
                      <span class="assignee-avatar" [style.background]="getAvatarGradient(member.role)" [class.has-image]="member.avatarUrl">
                        @if (member.avatarUrl) {
                          <img [src]="member.avatarUrl" alt="" class="assignee-avatar-img" />
                        } @else {
                          {{ member.avatar || member.name?.charAt(0) }}
                        }
                      </span>
                      <span>{{ member.name }}</span>
                    </button>
                  }
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeAddModal()">ביטול</button>
                <button type="submit" class="btn-save" [disabled]="!itemForm.title.trim()">
                  הוסף {{ currentTheme?.id === 'unicorn' ? '✨' : '🚀' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .logistics-page {
      min-height: 100vh;
      position: relative;
      overflow-x: auto;
    }

    /* ===== UNICORN THEME ===== */
    .unicorn-theme .theme-bg {
      position: fixed;
      inset: 0;
      background: linear-gradient(180deg, #fce7f3 0%, #ddd6fe 50%, #c4b5fd 100%);
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .unicorn-theme .clouds {
      position: absolute;
      width: 100%;
      height: 100px;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><ellipse cx="20" cy="15" rx="18" ry="8" fill="white" opacity="0.6"/><ellipse cx="50" cy="12" rx="25" ry="10" fill="white" opacity="0.5"/><ellipse cx="80" cy="14" rx="15" ry="7" fill="white" opacity="0.6"/></svg>') repeat-x;
      background-size: 400px 100px;
    }

    .unicorn-theme .cloud-1 { top: 5%; animation: clouds-move 60s linear infinite; }
    .unicorn-theme .cloud-2 { top: 15%; animation: clouds-move 80s linear infinite reverse; opacity: 0.7; }

    @keyframes clouds-move {
      from { transform: translateX(0); }
      to { transform: translateX(-400px); }
    }

    .unicorn-theme .rainbow-arc {
      position: absolute;
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 300px;
      border-radius: 0 0 300px 300px;
      background: linear-gradient(180deg,
        rgba(255,0,0,0.2) 0%, rgba(255,165,0,0.2) 16%, rgba(255,255,0,0.2) 33%,
        rgba(0,128,0,0.2) 50%, rgba(0,0,255,0.2) 66%, rgba(75,0,130,0.2) 83%, rgba(238,130,238,0.2) 100%
      );
      filter: blur(20px);
    }

    .unicorn-theme .sparkles {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(2px 2px at 10% 20%, #fcd34d, transparent),
        radial-gradient(2px 2px at 30% 40%, #f9a8d4, transparent),
        radial-gradient(3px 3px at 50% 10%, #c4b5fd, transparent),
        radial-gradient(2px 2px at 70% 30%, #fcd34d, transparent),
        radial-gradient(2px 2px at 90% 50%, #f9a8d4, transparent);
      animation: sparkle 3s ease-in-out infinite;
    }

    .unicorn-theme .floating-magic {
      position: absolute;
      font-size: 2rem;
      animation: float-magic 6s ease-in-out infinite;
      top: 20%;
    }

    .unicorn-theme .header-pill {
      background: rgba(255,255,255,0.8);
      border: 2px solid rgba(168,85,247,0.2);
      box-shadow: 0 8px 32px rgba(168,85,247,0.2);
    }

    .unicorn-theme .header-pill h1 { color: #7c3aed; }
    .unicorn-theme .header-pill p { color: #a78bfa; }

    .unicorn-theme .avatar-dock {
      background: rgba(255,255,255,0.7);
      box-shadow: 0 4px 20px rgba(168,85,247,0.15);
    }

    .unicorn-theme .dock-label { color: #7c3aed; }
    .unicorn-theme .avatar-name { color: #6b21a8; }

    .unicorn-theme .day-card {
      background: rgba(255,255,255,0.5);
      border: 2px solid rgba(255,255,255,0.8);
      box-shadow: 0 4px 20px rgba(168,85,247,0.1);
    }

    .unicorn-theme .day-card.shabbat {
      background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(253,230,138,0.3));
      border-color: rgba(251,191,36,0.5);
    }

    .unicorn-theme .day-header {
      background: rgba(255,255,255,0.6);
      border-bottom: 1px solid rgba(168,85,247,0.1);
    }

    .unicorn-theme .day-name { color: #6b21a8; }

    .unicorn-theme .drop-zone {
      background: rgba(255,255,255,0.5);
      border: 2px dashed rgba(168,85,247,0.2);
    }

    .unicorn-theme .drop-zone.cdk-drop-list-dragging {
      background: rgba(236,72,153,0.1);
      border-color: rgba(236,72,153,0.5);
      border-style: solid;
    }

    .unicorn-theme .zone-header {
      background: rgba(168,85,247,0.1);
      color: #6b21a8;
    }

    .unicorn-theme .add-item-btn {
      background: rgba(168,85,247,0.1);
      border: 1px dashed rgba(168,85,247,0.3);
      color: #7c3aed;
    }

    .unicorn-theme .add-item-btn:hover {
      background: rgba(168,85,247,0.2);
      border-style: solid;
    }

    .unicorn-theme .save-fab {
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      box-shadow: 0 8px 30px rgba(236,72,153,0.4);
    }

    .unicorn-theme .modal-content {
      background: linear-gradient(180deg, #fdf4ff, #faf5ff);
      border: 2px solid rgba(168,85,247,0.2);
    }

    .unicorn-theme .modal-header {
      background: linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.1));
      border-bottom: 1px solid rgba(168,85,247,0.1);
    }

    .unicorn-theme .modal-header h2 { color: #6b21a8; }

    .unicorn-theme .form-group label { color: #6b21a8; }

    .unicorn-theme .form-input {
      border: 2px solid rgba(168,85,247,0.2);
    }

    .unicorn-theme .form-input:focus {
      border-color: #a855f7;
      box-shadow: 0 0 20px rgba(168,85,247,0.2);
    }

    .unicorn-theme .assignee-btn {
      border: 2px solid rgba(168,85,247,0.2);
      color: #6b21a8;
    }

    .unicorn-theme .assignee-btn:hover {
      border-color: rgba(168,85,247,0.4);
      background: rgba(168,85,247,0.05);
    }

    .unicorn-theme .assignee-btn.selected {
      border-color: #a855f7;
      background: rgba(168,85,247,0.1);
    }

    .unicorn-theme .btn-cancel {
      background: rgba(168,85,247,0.1);
      color: #6b21a8;
    }

    .unicorn-theme .btn-cancel:hover { background: rgba(168,85,247,0.2); }

    .unicorn-theme .btn-save {
      background: linear-gradient(135deg, #ec4899, #a855f7);
    }

    /* ===== COSMIC THEME ===== */
    .cosmic-theme .theme-bg {
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, #0f0c29 0%, #1a1a4e 50%, #24243e 100%);
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .cosmic-theme .stars {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(2px 2px at 20% 30%, white, transparent),
        radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 60% 20%, white, transparent),
        radial-gradient(2px 2px at 80% 50%, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 10% 80%, white, transparent),
        radial-gradient(2px 2px at 70% 85%, rgba(255,255,255,0.7), transparent),
        radial-gradient(1px 1px at 90% 10%, white, transparent);
      animation: twinkle 4s ease-in-out infinite;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    .cosmic-theme .nebula {
      position: absolute;
      width: 600px;
      height: 600px;
      top: -100px;
      right: -100px;
      background: radial-gradient(circle, rgba(139,92,246,0.3), rgba(59,130,246,0.2), transparent 70%);
      filter: blur(60px);
      animation: nebula-pulse 8s ease-in-out infinite;
    }

    @keyframes nebula-pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.7; }
    }

    .cosmic-theme .floating-planet {
      position: absolute;
      font-size: 2rem;
      animation: float-planet 8s ease-in-out infinite;
      top: 15%;
    }

    @keyframes float-planet {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
      50% { transform: translateY(-20px) rotate(5deg); opacity: 1; }
    }

    .cosmic-theme .header-pill {
      background: rgba(30, 27, 75, 0.8);
      border: 2px solid rgba(139, 92, 246, 0.3);
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
    }

    .cosmic-theme .header-pill h1 { color: #c4b5fd; }
    .cosmic-theme .header-pill p { color: #a78bfa; }

    .cosmic-theme .avatar-dock {
      background: rgba(30, 27, 75, 0.7);
      border: 1px solid rgba(139, 92, 246, 0.2);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2);
    }

    .cosmic-theme .dock-label { color: #c4b5fd; }
    .cosmic-theme .avatar-name { color: #a78bfa; }

    .cosmic-theme .day-card {
      background: rgba(30, 27, 75, 0.6);
      border: 2px solid rgba(139, 92, 246, 0.2);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.15);
    }

    .cosmic-theme .day-card.shabbat {
      background: linear-gradient(180deg, rgba(30, 27, 75, 0.7), rgba(251, 191, 36, 0.1));
      border-color: rgba(251, 191, 36, 0.3);
    }

    .cosmic-theme .day-header {
      background: rgba(139, 92, 246, 0.1);
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }

    .cosmic-theme .day-name { color: #c4b5fd; }

    .cosmic-theme .drop-zone {
      background: rgba(30, 27, 75, 0.5);
      border: 2px dashed rgba(139, 92, 246, 0.3);
    }

    .cosmic-theme .drop-zone.cdk-drop-list-dragging {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.5);
      border-style: solid;
    }

    .cosmic-theme .zone-header {
      background: rgba(139, 92, 246, 0.15);
      color: #c4b5fd;
    }

    .cosmic-theme .logistics-item {
      background: rgba(30, 27, 75, 0.8);
      border: 1px solid rgba(139, 92, 246, 0.2);
    }

    .cosmic-theme .item-title { color: #e0e7ff; }
    .cosmic-theme .item-time { color: #a78bfa; }

    .cosmic-theme .empty-zone { color: #a78bfa; }

    .cosmic-theme .add-item-btn {
      background: rgba(139, 92, 246, 0.15);
      border: 1px dashed rgba(139, 92, 246, 0.3);
      color: #c4b5fd;
    }

    .cosmic-theme .add-item-btn:hover {
      background: rgba(139, 92, 246, 0.25);
      border-style: solid;
    }

    .cosmic-theme .save-fab {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4);
    }

    .cosmic-theme .modal-content {
      background: linear-gradient(180deg, #1e1b4b, #312e81);
      border: 2px solid rgba(139, 92, 246, 0.3);
    }

    .cosmic-theme .modal-header {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }

    .cosmic-theme .modal-header h2 { color: #c4b5fd; }

    .cosmic-theme .form-group label { color: #c4b5fd; }

    .cosmic-theme .form-input {
      background: rgba(30, 27, 75, 0.8);
      border: 2px solid rgba(139, 92, 246, 0.3);
      color: #e0e7ff;
    }

    .cosmic-theme .form-input:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }

    .cosmic-theme .form-input::placeholder { color: #6366f1; }

    .cosmic-theme .assignee-btn {
      background: rgba(30, 27, 75, 0.8);
      border: 2px solid rgba(139, 92, 246, 0.3);
      color: #c4b5fd;
    }

    .cosmic-theme .assignee-btn:hover {
      border-color: rgba(139, 92, 246, 0.5);
      background: rgba(139, 92, 246, 0.1);
    }

    .cosmic-theme .assignee-btn.selected {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.2);
    }

    .cosmic-theme .btn-cancel {
      background: rgba(139, 92, 246, 0.15);
      color: #c4b5fd;
    }

    .cosmic-theme .btn-cancel:hover { background: rgba(139, 92, 246, 0.25); }

    .cosmic-theme .btn-save {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    }

    /* ===== SHARED STYLES ===== */
    @keyframes sparkle {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    @keyframes float-magic {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
      50% { transform: translateY(-30px) rotate(10deg); opacity: 1; }
    }

    .content-wrapper {
      position: relative;
      z-index: 10;
      padding: 20px;
      padding-bottom: 100px;
    }

    .page-header { margin-bottom: 20px; }

    .header-pill {
      display: flex;
      align-items: center;
      gap: 16px;
      backdrop-filter: blur(12px);
      border-radius: 30px;
      padding: 16px 24px;
      position: relative;
    }

    .header-icon { font-size: 2rem; }
    .header-pill h1 { font-size: 1.5rem; font-weight: 700; margin: 0; }
    .header-pill p { margin: 2px 0 0; font-size: 0.9rem; }
    .header-mascot {
      position: absolute;
      left: 24px;
      font-size: 2rem;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    /* Week Navigation */
    .week-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }

    .nav-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(255,255,255,0.1);
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 16px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .nav-btn:hover {
      background: rgba(255,255,255,0.2);
      border-color: rgba(255,255,255,0.3);
      transform: translateY(-2px);
    }

    .nav-arrow {
      font-size: 1.2rem;
    }

    .nav-label {
      font-size: 0.95rem;
    }

    .week-indicator {
      flex: 1;
      text-align: center;
    }

    .week-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: white;
      margin-bottom: 4px;
    }

    .week-dates {
      font-size: 0.9rem;
      color: rgba(255,255,255,0.8);
      font-weight: 500;
    }

    .back-to-current {
      margin-top: 8px;
      padding: 6px 14px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }

    .back-to-current:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
    }

    /* Avatar Dock */
    .avatar-dock {
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 20px 24px;
      margin-bottom: 24px;
    }

    .dock-label {
      text-align: center;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: rgba(255,255,255,0.9);
    }

    .avatars-row {
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .avatar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      cursor: grab;
      transition: all 0.2s;
      position: relative;
    }

    .avatar-item:active { cursor: grabbing; }
    .avatar-item:hover { transform: scale(1.1); }
    .avatar-item:hover .avatar-glow { opacity: 1; }

    .avatar-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1.2rem;
      border: 3px solid white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }

    .avatar-emoji { font-size: 1.4rem; }

    .avatar-circle.has-image {
      padding: 0;
      overflow: hidden;
    }

    .avatar-circle-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-name {
      font-size: 0.75rem;
      font-weight: 600;
    }

    .avatar-glow {
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%);
      opacity: 0;
      transition: opacity 0.2s;
      z-index: -1;
    }

    /* Drag Preview */
    .drag-preview {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      font-weight: 600;
      color: #374151;
    }

    .preview-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1rem;
    }

    .preview-avatar.has-image {
      padding: 0;
      overflow: hidden;
    }

    .preview-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .cdk-drag-preview { z-index: 1000 !important; }
    .cdk-drag-placeholder { opacity: 0.4; }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }

    /* Week Grid */
    .week-grid {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 20px;
      padding-top: 8px;
    }

    .day-card {
      flex: 0 0 320px;
      backdrop-filter: blur(12px);
      border-radius: 24px;
      overflow: hidden;
      transition: all 0.3s;
    }

    .day-card:hover {
      transform: translateY(-4px);
    }

    .day-card.today {
      box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.6);
    }

    .day-header {
      padding: 16px 20px;
    }

    .day-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }

    .day-icon { font-size: 1.4rem; }
    .day-name { font-weight: 700; font-size: 1.05rem; }
    .shabbat-icon { margin-right: auto; font-size: 1.3rem; }

    .today-badge {
      padding: 4px 10px;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 10px;
      font-size: 0.75rem;
      font-weight: 700;
      color: white;
      margin-right: auto;
    }

    .day-date {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
      padding-right: 40px;
    }

    .day-zones {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .drop-zone {
      border-radius: 18px;
      padding: 14px;
      min-height: 100px;
      transition: all 0.3s;
    }

    .drop-zone:hover {
      transform: scale(1.02);
    }

    .zone-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      padding: 6px 10px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .zone-items {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 50px;
    }

    .empty-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      opacity: 0.6;
      font-size: 0.8rem;
    }

    .empty-icon { font-size: 1.5rem; margin-bottom: 4px; }

    .logistics-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: white;
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      transition: all 0.3s;
    }

    .logistics-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
    }

    .item-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.85rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .item-avatar.has-image {
      padding: 0;
      overflow: hidden;
    }

    .item-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .item-avatar.unassigned {
      background: #9ca3af;
      font-size: 0.85rem;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      display: block;
      font-size: 0.9rem;
      color: #374151;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-time {
      display: block;
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 2px;
    }

    .item-remove {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: none;
      background: rgba(239,68,68,0.1);
      color: #ef4444;
      font-size: 0.7rem;
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s;
    }

    .logistics-item:hover .item-remove { opacity: 1; }
    .item-remove:hover { background: rgba(239,68,68,0.2); }

    .add-item-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      margin-top: 10px;
    }

    .add-item-btn:hover {
      transform: translateY(-2px);
    }

    /* Save FAB */
    .save-fab {
      position: fixed;
      bottom: 90px;
      left: 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 28px;
      border: none;
      border-radius: 30px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 50;
    }

    .save-fab:hover:not(:disabled) {
      transform: translateY(-3px);
    }

    .save-fab:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .fab-icon {
      font-size: 1.3rem;
      animation: wand-wave 2s ease-in-out infinite;
    }

    @keyframes wand-wave {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-10deg); }
      75% { transform: rotate(10deg); }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }

    .modal-content {
      width: 100%;
      max-width: 450px;
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
    }

    .modal-icon { font-size: 1.8rem; }
    .modal-header h2 { flex: 1; font-size: 1.3rem; margin: 0; }
    .modal-mascot { font-size: 1.5rem; animation: bounce 2s ease-in-out infinite; }

    .modal-form { padding: 20px 24px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; }
    .label-icon { margin-left: 6px; }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      background: white;
      border-radius: 14px;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }

    .form-input::placeholder { color: #9ca3af; }
    .textarea { min-height: 70px; resize: vertical; }

    .assignee-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 10px;
    }

    .assignee-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 10px;
      background: white;
      border-radius: 14px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .assignee-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 0.85rem;
    }

    .assignee-avatar.has-image {
      padding: 0;
      overflow: hidden;
    }

    .assignee-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid rgba(0,0,0,0.1);
    }

    .btn-cancel, .btn-save {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 14px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save {
      color: white;
      font-weight: 700;
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(139,92,246,0.4);
    }

    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 768px) {
      .week-grid { flex-direction: column; }
      .day-card { flex: none; width: 100%; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogisticsComponent {
  private readonly logisticsStore = inject(LogisticsStore);
  private readonly householdStore = inject(HouseholdStore);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  items$ = this.logisticsStore.items$;
  members$ = this.householdStore.members$;
  isAdult$ = this.authService.isAdult$;
  hasUnsavedChanges$ = this.logisticsStore.hasUnsavedChanges$;
  isSaving$ = this.logisticsStore.isSaving$;

  hebrewDays = HEBREW_DAYS;
  categories: LogisticsCategory[] = ['PICKUP', 'ACTIVITY', 'SHOPPING', 'CHORE'];

  currentTheme: UITheme | null = null;
  showAddModal = false;
  membersArray: User[] = [];

  // Week navigation
  currentWeekOffset = 0; // 0 = current week, -1 = last week, +1 = next week
  weekStartDate: Date = new Date();
  weekEndDate: Date = new Date();

  // Generate drop list IDs for connecting
  dropListIds: string[] = [];

  itemForm = {
    title: '',
    timeSlot: '',
    notes: '',
    assignedToId: undefined as string | undefined,
    category: 'CHORE' as LogisticsCategory,
    dayOfWeek: 0
  };

  private itemsCache: LogisticsItem[] = [];

  constructor() {
    // Generate all drop list IDs
    for (let day = 0; day <= 6; day++) {
      for (const cat of this.categories) {
        this.dropListIds.push(`drop-${day}-${cat}`);
      }
    }

    this.calculateWeekDates();
    this.logisticsStore.loadItems();
    this.householdStore.loadHousehold();

    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });

    this.items$.subscribe(items => {
      this.itemsCache = items;
      this.cdr.markForCheck();
    });

    this.members$.subscribe(members => {
      this.membersArray = members;
      this.cdr.markForCheck();
    });
  }

  calculateWeekDates(): void {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday

    // Calculate start of week (Sunday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + (this.currentWeekOffset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    // Calculate end of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    this.weekStartDate = startOfWeek;
    this.weekEndDate = endOfWeek;
  }

  previousWeek(): void {
    this.currentWeekOffset--;
    this.calculateWeekDates();
    this.cdr.markForCheck();
  }

  nextWeek(): void {
    this.currentWeekOffset++;
    this.calculateWeekDates();
    this.cdr.markForCheck();
  }

  goToCurrentWeek(): void {
    this.currentWeekOffset = 0;
    this.calculateWeekDates();
    this.cdr.markForCheck();
  }

  getWeekTitle(): string {
    if (this.currentWeekOffset === 0) {
      return 'השבוע';
    } else if (this.currentWeekOffset === -1) {
      return 'שבוע שעבר';
    } else if (this.currentWeekOffset === 1) {
      return 'שבוע הבא';
    } else if (this.currentWeekOffset < 0) {
      return `לפני ${Math.abs(this.currentWeekOffset)} שבועות`;
    } else {
      return `בעוד ${this.currentWeekOffset} שבועות`;
    }
  }

  getDateForDay(dayOfWeek: number): Date {
    const date = new Date(this.weekStartDate);
    date.setDate(this.weekStartDate.getDate() + dayOfWeek);
    return date;
  }

  formatDate(date: Date): string {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}/${month}`;
  }

  isToday(dayOfWeek: number): boolean {
    const today = new Date();
    const dayDate = this.getDateForDay(dayOfWeek);
    return today.toDateString() === dayDate.toDateString();
  }

  getDayIcon(day: number): string {
    const icons = ['☀️', '🌙', '⭐', '🌈', '🌸', '💫', '✡️'];
    return icons[day];
  }

  getCategoryEmoji(category: LogisticsCategory): string {
    return LOGISTICS_CATEGORY_LABELS[category]?.emoji || '📋';
  }

  getCategoryLabel(category: LogisticsCategory): string {
    return LOGISTICS_CATEGORY_LABELS[category]?.label || category;
  }

  getAvatarGradient(role: string): string {
    switch (role) {
      case 'ADMIN': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'ADULT': return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
      case 'KID': return 'linear-gradient(135deg, #ec4899, #be185d)';
      case 'PET': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default: return 'linear-gradient(135deg, #8b5cf6, #6366f1)';
    }
  }

  getItemsForZone(dayOfWeek: number, category: LogisticsCategory): LogisticsItem[] {
    return this.itemsCache.filter(item =>
      item.dayOfWeek === dayOfWeek && item.category === category
    );
  }

  onMemberDrop(event: CdkDragDrop<any>, dayOfWeek: number, category: LogisticsCategory): void {
    const member = event.item.data as User;
    if (!member) return;

    // Get items in this zone
    const zoneItems = this.getItemsForZone(dayOfWeek, category);

    if (zoneItems.length > 0) {
      // Assign member to first unassigned item, or the first item
      const targetItem = zoneItems.find(i => !i.assignedTo) || zoneItems[0];
      this.logisticsStore.assignItem(targetItem.id, member.id).subscribe({
        next: () => this.cdr.markForCheck(),
        error: (err) => console.error('Error assigning item:', err)
      });
    } else {
      // No items in zone - create a quick task assigned to this member
      const dto: CreateLogisticsDto = {
        title: `משימה של ${member.name}`,
        category,
        dayOfWeek,
        assignedToId: member.id
      };
      this.logisticsStore.createItem(dto).subscribe({
        next: () => this.cdr.markForCheck(),
        error: (err) => console.error('Error creating item:', err)
      });
    }
  }

  openAddModal(dayOfWeek: number, category: LogisticsCategory): void {
    this.itemForm = {
      title: '',
      timeSlot: '',
      notes: '',
      assignedToId: undefined,
      category,
      dayOfWeek
    };
    this.showAddModal = true;
    this.cdr.markForCheck();
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.cdr.markForCheck();
  }

  addItem(): void {
    if (!this.itemForm.title.trim()) return;

    const dto: CreateLogisticsDto = {
      title: this.itemForm.title.trim(),
      category: this.itemForm.category,
      dayOfWeek: this.itemForm.dayOfWeek,
      timeSlot: this.itemForm.timeSlot || undefined,
      notes: this.itemForm.notes || undefined,
      assignedToId: this.itemForm.assignedToId
    };

    this.logisticsStore.createItem(dto).subscribe({
      next: () => {
        this.closeAddModal();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error creating item:', err)
    });
  }

  removeItem(itemId: string): void {
    this.logisticsStore.deleteItem(itemId).subscribe({
      next: () => this.cdr.markForCheck(),
      error: (err) => console.error('Error removing item:', err)
    });
  }

  saveAll(): void {
    this.cdr.markForCheck();
  }
}
