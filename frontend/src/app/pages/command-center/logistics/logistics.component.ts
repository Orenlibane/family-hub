import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { LogisticsStore, HouseholdStore } from '../../../core/stores';
import { AuthService, ThemeService, UITheme } from '../../../core/services';
import {
  LogisticsItem,
  LogisticsCategory,
  LOGISTICS_CATEGORY_LABELS,
  HEBREW_DAYS,
  CreateLogisticsDto
} from '../../../core/models';

interface DropZone {
  category: LogisticsCategory;
  dayOfWeek: number;
}

@Component({
  selector: 'app-logistics',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="logistics-page unicorn-theme" dir="rtl">
      <!-- Magical Background -->
      <div class="magical-bg">
        <div class="clouds cloud-1"></div>
        <div class="clouds cloud-2"></div>
        <div class="rainbow-arc"></div>
        <div class="sparkles"></div>
        @for (i of [1,2,3,4,5]; track i) {
          <div class="floating-magic" [style.animation-delay]="i * 1.5 + 's'" [style.left.%]="i * 18">
            {{ ['✨', '🌸', '💫', '⭐', '🦋'][i-1] }}
          </div>
        }
      </div>

      <div class="content-wrapper">
        <!-- Header -->
        <header class="page-header">
          <div class="cloud-pill">
            <span class="header-icon">📋</span>
            <div>
              <h1>לוח פיקוד שבועי</h1>
              <p>מי עושה מה השבוע?</p>
            </div>
            <span class="header-mascot">🦄</span>
          </div>
        </header>

        <!-- Avatar Dock -->
        <div class="avatar-dock">
          <div class="dock-label">גרור אותי! 👇</div>
          <div class="avatars-row">
            @for (member of members$ | async; track member.id) {
              <div
                class="avatar-item"
                cdkDrag
                [cdkDragData]="member"
              >
                <div class="avatar-circle" [style.background]="getAvatarGradient(member.role)">
                  <span class="avatar-initial">{{ member.name?.charAt(0) || '?' }}</span>
                </div>
                <span class="avatar-name">{{ member.name }}</span>
                <div class="avatar-glow"></div>
              </div>
            }
            <!-- Chinchilla placeholder -->
            <div class="avatar-item pet" cdkDrag [cdkDragData]="{id: 'pet', name: 'שינשילות', role: 'PET'}">
              <div class="avatar-circle pet-avatar">
                <span class="avatar-initial">🐿️</span>
              </div>
              <span class="avatar-name">שינשילות</span>
              <div class="avatar-glow"></div>
            </div>
          </div>
        </div>

        <!-- Week Grid -->
        <div class="week-grid">
          @for (day of [0,1,2,3,4,5,6]; track day) {
            <div class="day-card" [class.shabbat]="day === 6">
              <div class="day-header">
                <span class="day-icon">{{ getDayIcon(day) }}</span>
                <span class="day-name">יום {{ hebrewDays[day] }}</span>
                @if (day === 6) {
                  <span class="shabbat-icon">✡️</span>
                }
              </div>

              <div class="day-zones">
                @for (category of categories; track category) {
                  <div
                    class="drop-zone"
                    cdkDropList
                    [cdkDropListData]="{category: category, dayOfWeek: day}"
                    (cdkDropListDropped)="onDrop($event)"
                    [class.highlight]="isDragOver"
                  >
                    <div class="zone-header">
                      <span>{{ getCategoryEmoji(category) }}</span>
                      <span>{{ getCategoryLabel(category) }}</span>
                    </div>
                    <div class="zone-items">
                      @for (item of getItemsForZone(day, category); track item.id) {
                        <div class="logistics-item">
                          @if (item.assignedTo) {
                            <div class="item-avatar" [style.background]="getAvatarGradient(item.assignedTo.id === 'pet' ? 'PET' : 'KID')">
                              {{ item.assignedTo.name?.charAt(0) || '?' }}
                            </div>
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
                    </div>
                    @if (isAdult$ | async) {
                      <button class="add-item-btn" (click)="openAddModal(day, category)">
                        <span>➕</span>
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
            <span class="fab-icon">🪄</span>
            <span>סנכרן שבוע</span>
          </button>
        }
      </div>

      <!-- Add Item Modal -->
      @if (showAddModal) {
        <div class="modal-overlay" (click)="closeAddModal()">
          <div class="modal-content unicorn-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-icon">✨</span>
              <h2>הוסף פריט</h2>
              <span class="modal-mascot">🦄</span>
            </div>
            <form (ngSubmit)="addItem()" class="modal-form">
              <div class="form-group">
                <label><span class="label-icon">📝</span> כותרת</label>
                <input type="text" [(ngModel)]="itemForm.title" name="title" class="unicorn-input" required placeholder="מה לעשות?" />
              </div>
              <div class="form-group">
                <label><span class="label-icon">🕐</span> שעה (אופציונלי)</label>
                <input type="time" [(ngModel)]="itemForm.timeSlot" name="timeSlot" class="unicorn-input" />
              </div>
              <div class="form-group">
                <label><span class="label-icon">📋</span> הערות (אופציונלי)</label>
                <textarea [(ngModel)]="itemForm.notes" name="notes" class="unicorn-input textarea" placeholder="פרטים נוספים..."></textarea>
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
                      <span class="assignee-avatar" [style.background]="getAvatarGradient(member.role)">
                        {{ member.name?.charAt(0) }}
                      </span>
                      <span>{{ member.name }}</span>
                    </button>
                  }
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeAddModal()">ביטול</button>
                <button type="submit" class="btn-save" [disabled]="!itemForm.title.trim()">
                  הוסף ✨
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

    /* Magical Unicorn Background */
    .magical-bg {
      position: fixed;
      inset: 0;
      background: linear-gradient(180deg, #fce7f3 0%, #ddd6fe 50%, #c4b5fd 100%);
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }

    .clouds {
      position: absolute;
      width: 100%;
      height: 100px;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><ellipse cx="20" cy="15" rx="18" ry="8" fill="white" opacity="0.6"/><ellipse cx="50" cy="12" rx="25" ry="10" fill="white" opacity="0.5"/><ellipse cx="80" cy="14" rx="15" ry="7" fill="white" opacity="0.6"/></svg>') repeat-x;
      background-size: 400px 100px;
    }

    .cloud-1 {
      top: 5%;
      animation: clouds-move 60s linear infinite;
    }

    .cloud-2 {
      top: 15%;
      animation: clouds-move 80s linear infinite reverse;
      opacity: 0.7;
    }

    @keyframes clouds-move {
      from { transform: translateX(0); }
      to { transform: translateX(-400px); }
    }

    .rainbow-arc {
      position: absolute;
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 300px;
      border-radius: 0 0 300px 300px;
      background: linear-gradient(180deg,
        rgba(255,0,0,0.2) 0%,
        rgba(255,165,0,0.2) 16%,
        rgba(255,255,0,0.2) 33%,
        rgba(0,128,0,0.2) 50%,
        rgba(0,0,255,0.2) 66%,
        rgba(75,0,130,0.2) 83%,
        rgba(238,130,238,0.2) 100%
      );
      filter: blur(20px);
    }

    .sparkles {
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

    @keyframes sparkle {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    .floating-magic {
      position: absolute;
      font-size: 2rem;
      animation: float-magic 6s ease-in-out infinite;
      top: 20%;
    }

    @keyframes float-magic {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
      50% { transform: translateY(-30px) rotate(10deg); opacity: 1; }
    }

    /* Content */
    .content-wrapper {
      position: relative;
      z-index: 10;
      padding: 20px;
      padding-bottom: 100px;
    }

    /* Header */
    .page-header {
      margin-bottom: 20px;
    }

    .cloud-pill {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255,255,255,0.8);
      backdrop-filter: blur(12px);
      border-radius: 30px;
      padding: 16px 24px;
      box-shadow: 0 8px 32px rgba(168,85,247,0.2);
      position: relative;
    }

    .header-icon { font-size: 2rem; }
    .cloud-pill h1 { font-size: 1.5rem; font-weight: 700; color: #7c3aed; margin: 0; }
    .cloud-pill p { color: #a78bfa; margin: 2px 0 0; font-size: 0.9rem; }
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

    /* Avatar Dock */
    .avatar-dock {
      background: rgba(255,255,255,0.7);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 16px 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 20px rgba(168,85,247,0.15);
    }

    .dock-label {
      text-align: center;
      color: #7c3aed;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .avatars-row {
      display: flex;
      gap: 16px;
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

    .avatar-item:hover {
      transform: scale(1.1);
    }

    .avatar-item:hover .avatar-glow {
      opacity: 1;
    }

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

    .pet-avatar {
      background: linear-gradient(135deg, #f59e0b, #d97706) !important;
    }

    .avatar-name {
      font-size: 0.75rem;
      color: #6b21a8;
      font-weight: 600;
    }

    .avatar-glow {
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(168,85,247,0.4), transparent 70%);
      opacity: 0;
      transition: opacity 0.2s;
      z-index: -1;
    }

    .cdk-drag-preview {
      transform: scale(1.15) !important;
      box-shadow: 0 8px 30px rgba(168,85,247,0.4);
    }

    .cdk-drag-placeholder {
      opacity: 0.4;
    }

    /* Week Grid */
    .week-grid {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 20px;
    }

    .day-card {
      flex: 0 0 280px;
      background: rgba(255,255,255,0.5);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 2px solid rgba(255,255,255,0.8);
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(168,85,247,0.1);
    }

    .day-card.shabbat {
      background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(253,230,138,0.3));
      border-color: rgba(251,191,36,0.5);
    }

    .day-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.6);
      border-bottom: 1px solid rgba(168,85,247,0.1);
    }

    .day-icon { font-size: 1.3rem; }
    .day-name { font-weight: 700; color: #6b21a8; font-size: 1rem; }
    .shabbat-icon { margin-right: auto; font-size: 1.2rem; }

    .day-zones {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .drop-zone {
      background: rgba(255,255,255,0.5);
      border-radius: 16px;
      border: 2px dashed rgba(168,85,247,0.2);
      padding: 10px;
      min-height: 80px;
      transition: all 0.2s;
    }

    .drop-zone.highlight,
    .drop-zone.cdk-drop-list-dragging {
      background: rgba(236,72,153,0.1);
      border-color: rgba(236,72,153,0.5);
      border-style: solid;
    }

    .zone-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding: 4px 8px;
      background: rgba(168,85,247,0.1);
      border-radius: 10px;
      font-size: 0.8rem;
      color: #6b21a8;
      font-weight: 600;
    }

    .zone-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .logistics-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .item-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      display: block;
      font-size: 0.85rem;
      color: #374151;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-time {
      display: block;
      font-size: 0.7rem;
      color: #9ca3af;
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

    .logistics-item:hover .item-remove {
      opacity: 1;
    }

    .item-remove:hover {
      background: rgba(239,68,68,0.2);
    }

    .add-item-btn {
      width: 100%;
      padding: 8px;
      background: rgba(168,85,247,0.1);
      border: 1px dashed rgba(168,85,247,0.3);
      border-radius: 10px;
      color: #7c3aed;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }

    .add-item-btn:hover {
      background: rgba(168,85,247,0.2);
      border-style: solid;
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
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      border: none;
      border-radius: 30px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(236,72,153,0.4);
      transition: all 0.2s;
      z-index: 50;
    }

    .save-fab:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(236,72,153,0.5);
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

    .unicorn-modal {
      width: 100%;
      max-width: 450px;
      max-height: 90vh;
      overflow-y: auto;
      background: linear-gradient(180deg, #fdf4ff, #faf5ff);
      border-radius: 24px;
      border: 2px solid rgba(168,85,247,0.2);
      box-shadow: 0 20px 60px rgba(168,85,247,0.3);
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      background: linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.1));
      border-bottom: 1px solid rgba(168,85,247,0.1);
    }

    .modal-icon { font-size: 1.8rem; }
    .modal-header h2 { flex: 1; color: #6b21a8; font-size: 1.3rem; margin: 0; }
    .modal-mascot { font-size: 1.5rem; animation: bounce 2s ease-in-out infinite; }

    .modal-form { padding: 20px 24px; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; color: #6b21a8; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; }
    .label-icon { margin-left: 6px; }

    .unicorn-input {
      width: 100%;
      padding: 12px 16px;
      background: white;
      border: 2px solid rgba(168,85,247,0.2);
      border-radius: 14px;
      color: #374151;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }

    .unicorn-input:focus {
      border-color: #a855f7;
      box-shadow: 0 0 20px rgba(168,85,247,0.2);
    }

    .unicorn-input::placeholder { color: #9ca3af; }
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
      border: 2px solid rgba(168,85,247,0.2);
      border-radius: 14px;
      color: #6b21a8;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .assignee-btn:hover {
      border-color: rgba(168,85,247,0.4);
      background: rgba(168,85,247,0.05);
    }

    .assignee-btn.selected {
      border-color: #a855f7;
      background: rgba(168,85,247,0.1);
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

    .modal-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid rgba(168,85,247,0.1);
    }

    .btn-cancel {
      flex: 1;
      padding: 14px;
      background: rgba(168,85,247,0.1);
      border: none;
      border-radius: 14px;
      color: #6b21a8;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover { background: rgba(168,85,247,0.2); }

    .btn-save {
      flex: 1;
      padding: 14px;
      background: linear-gradient(135deg, #ec4899, #a855f7);
      border: none;
      border-radius: 14px;
      color: white;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(168,85,247,0.4);
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

  currentTheme: UITheme = this.themeService.getCurrentTheme();
  showAddModal = false;
  isDragOver = false;

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

  onDrop(event: CdkDragDrop<DropZone>): void {
    const member = event.item.data;
    const target = event.container.data;

    if (!member || !target) return;

    // Get items in this zone
    const zoneItems = this.getItemsForZone(target.dayOfWeek, target.category);

    if (zoneItems.length > 0) {
      // Assign member to first unassigned item, or the first item
      const targetItem = zoneItems.find(i => !i.assignedTo) || zoneItems[0];
      this.logisticsStore.assignItem(targetItem.id, member.id).subscribe({
        next: () => this.cdr.markForCheck(),
        error: (err) => console.error('Error assigning item:', err)
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
    // Items are saved automatically via API, but this can trigger a bulk sync
    this.cdr.markForCheck();
  }
}
