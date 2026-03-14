import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PollsStore } from '../../../core/stores';
import { AuthService, ThemeService, UITheme } from '../../../core/services';
import { Poll, CreatePollDto, PollCategory, POLL_CATEGORY_LABELS } from '../../../core/models';

@Component({
  selector: 'app-voting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="voting-page" dir="rtl">
      <!-- Animated Stars Background -->
      <div class="stars-container">
        <div class="stars stars-1"></div>
        <div class="stars stars-2"></div>
        <div class="nebula nebula-1"></div>
        <div class="nebula nebula-2"></div>
      </div>

      <div class="content-wrapper">
        <!-- Header -->
        <header class="page-header">
          <div class="header-content">
            <span class="header-icon">🗳️</span>
            <div>
              <h1>הצבעות משפחתיות</h1>
              <p>הצביעו ביחד על מה שחשוב!</p>
            </div>
            <span class="header-mascot">🐿️</span>
          </div>
        </header>

        <!-- Create Poll Button -->
        <button class="create-poll-btn" (click)="openCreateModal()">
          <span>✨</span> צור הצבעה חדשה
        </button>

        <!-- Active Polls Section -->
        <section class="polls-section">
          <div class="section-header">
            <span class="section-icon">📊</span>
            <h2>הצבעות פעילות</h2>
          </div>

          <div class="polls-grid">
            @for (poll of activePolls$ | async; track poll.id) {
              <div class="poll-card">
                <div class="poll-header">
                  <span class="poll-category">{{ getCategoryEmoji(poll.category) }}</span>
                  <h3>{{ poll.title }}</h3>
                  @if (poll.description) {
                    <p class="poll-description">{{ poll.description }}</p>
                  }
                </div>

                <div class="poll-options">
                  @for (option of poll.options; track option.id) {
                    <button
                      class="option-btn"
                      [class.voted]="poll.userVote?.optionId === option.id"
                      (click)="vote(poll.id, option.id)"
                    >
                      <div class="option-content">
                        @if (option.emoji) {
                          <span class="option-emoji">{{ option.emoji }}</span>
                        }
                        <span class="option-text">{{ option.text }}</span>
                      </div>
                      <div class="option-stats">
                        <div class="vote-bar" [style.width.%]="getVotePercentage(poll, option.id)"></div>
                        <span class="vote-count">{{ option.voteCount }} הצבעות</span>
                      </div>
                    </button>
                  }
                </div>

                <div class="poll-footer">
                  <span class="poll-meta">
                    <span>👤</span> {{ poll.createdBy.name }}
                  </span>
                  <span class="poll-meta">
                    <span>📊</span> {{ poll.totalVotes }} הצבעות סה"כ
                  </span>
                  @if (canClosePoll$ | async) {
                    <button class="close-poll-btn" (click)="closePoll(poll.id)">
                      <span>🔒</span> סגור
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon">🗳️</div>
                <h3>אין הצבעות פעילות</h3>
                <p>צרו הצבעה חדשה כדי להתחיל!</p>
                <div class="empty-mascot">🐿️✨</div>
              </div>
            }
          </div>
        </section>

        <!-- Closed Polls Section -->
        @if ((closedPolls$ | async)?.length) {
          <section class="polls-section closed-section">
            <div class="section-header">
              <span class="section-icon">📜</span>
              <h2>היסטוריית הצבעות</h2>
            </div>

            <div class="polls-grid">
              @for (poll of closedPolls$ | async; track poll.id) {
                <div class="poll-card closed">
                  <div class="closed-badge">נסגר</div>
                  <div class="poll-header">
                    <span class="poll-category">{{ getCategoryEmoji(poll.category) }}</span>
                    <h3>{{ poll.title }}</h3>
                  </div>

                  <div class="poll-results">
                    @for (option of getSortedOptions(poll); track option.id; let i = $index) {
                      <div class="result-row" [class.winner]="i === 0">
                        @if (i === 0) {
                          <span class="winner-badge">🏆</span>
                        }
                        <span class="result-text">{{ option.emoji }} {{ option.text }}</span>
                        <span class="result-count">{{ option.voteCount }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }
      </div>

      <!-- Create Poll Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="closeCreateModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-icon">🗳️</span>
              <h2>הצבעה חדשה</h2>
              <span class="modal-mascot">🐿️</span>
            </div>

            <form (ngSubmit)="createPoll()" class="modal-form">
              <div class="form-group">
                <label><span class="label-icon">📝</span> כותרת</label>
                <input type="text" [(ngModel)]="pollForm.title" name="title" class="cosmic-input" required placeholder="על מה נצביע?" />
              </div>

              <div class="form-group">
                <label><span class="label-icon">📋</span> תיאור (אופציונלי)</label>
                <textarea [(ngModel)]="pollForm.description" name="description" class="cosmic-input textarea" placeholder="פרטים נוספים..."></textarea>
              </div>

              <div class="form-group">
                <label><span class="label-icon">🏷️</span> קטגוריה</label>
                <div class="category-grid">
                  @for (cat of categories; track cat.value) {
                    <button
                      type="button"
                      class="category-btn"
                      [class.selected]="pollForm.category === cat.value"
                      (click)="pollForm.category = cat.value"
                    >
                      <span>{{ cat.emoji }}</span>
                      <span>{{ cat.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <div class="form-group">
                <label><span class="label-icon">📊</span> אפשרויות</label>
                <div class="options-list">
                  @for (option of pollForm.options; track $index; let i = $index) {
                    <div class="option-input-row">
                      <input
                        type="text"
                        [(ngModel)]="pollForm.options[i].emoji"
                        [name]="'emoji_' + i"
                        class="emoji-input"
                        placeholder="🎬"
                        maxlength="2"
                      />
                      <input
                        type="text"
                        [(ngModel)]="pollForm.options[i].text"
                        [name]="'option_' + i"
                        class="cosmic-input option-text-input"
                        placeholder="אפשרות {{ i + 1 }}"
                        required
                      />
                      @if (pollForm.options.length > 2) {
                        <button type="button" class="remove-option-btn" (click)="removeOption(i)">✖</button>
                      }
                    </div>
                  }
                </div>
                @if (pollForm.options.length < 10) {
                  <button type="button" class="add-option-btn" (click)="addOption()">
                    <span>➕</span> הוסף אפשרות
                  </button>
                }
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeCreateModal()">ביטול</button>
                <button type="submit" class="btn-save" [disabled]="!isFormValid()">
                  צור הצבעה
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

    .voting-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #1a1a3a 100%);
      position: relative;
      overflow-x: hidden;
    }

    .stars-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .stars {
      position: absolute;
      inset: 0;
      background-repeat: repeat;
    }

    .stars-1 {
      background-image: radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                        radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
                        radial-gradient(1px 1px at 90px 40px, #fff, transparent);
      background-size: 200px 200px;
      animation: stars-move 100s linear infinite;
    }

    .stars-2 {
      background-image: radial-gradient(1px 1px at 50px 80px, #fff, transparent),
                        radial-gradient(2px 2px at 100px 150px, rgba(255,255,255,0.7), transparent);
      background-size: 300px 300px;
      animation: stars-move 150s linear infinite;
    }

    @keyframes stars-move {
      from { transform: translateY(0); }
      to { transform: translateY(-100%); }
    }

    .nebula {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.3;
    }

    .nebula-1 {
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, #8b5cf6, transparent);
      top: -200px;
      right: -200px;
    }

    .nebula-2 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, #ec4899, transparent);
      bottom: -150px;
      left: -150px;
    }

    .content-wrapper {
      position: relative;
      z-index: 10;
      padding: 24px;
      padding-bottom: 100px;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 20px 24px;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
    }

    .header-icon { font-size: 2.5rem; }
    .header-content h1 { font-size: 1.75rem; font-weight: 700; color: white; margin: 0; }
    .header-content p { color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 0.9rem; }
    .header-mascot {
      position: absolute;
      left: 24px;
      font-size: 2rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .create-poll-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 18px 24px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      border-radius: 16px;
      color: white;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 24px;
      transition: all 0.2s;
      box-shadow: 0 8px 30px rgba(139,92,246,0.4);
    }

    .create-poll-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(139,92,246,0.5);
    }

    .polls-section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .section-icon { font-size: 1.5rem; }
    .section-header h2 { color: white; font-size: 1.3rem; margin: 0; }

    .polls-grid {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .poll-card {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 24px;
      position: relative;
    }

    .poll-card.closed {
      opacity: 0.7;
    }

    .closed-badge {
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 6px 14px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      color: rgba(255,255,255,0.6);
      font-size: 0.8rem;
    }

    .poll-header { margin-bottom: 20px; }
    .poll-category { font-size: 2rem; display: block; margin-bottom: 8px; }
    .poll-header h3 { color: white; font-size: 1.3rem; margin: 0 0 8px; }
    .poll-description { color: rgba(255,255,255,0.6); margin: 0; font-size: 0.9rem; }

    .poll-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .option-btn {
      width: 100%;
      padding: 16px 20px;
      background: rgba(255,255,255,0.05);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: right;
      position: relative;
      overflow: hidden;
    }

    .option-btn:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(139,92,246,0.5);
    }

    .option-btn.voted {
      border-color: #8b5cf6;
      background: rgba(139,92,246,0.2);
    }

    .option-content {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      position: relative;
      z-index: 1;
    }

    .option-emoji { font-size: 1.5rem; }
    .option-text { color: white; font-weight: 600; }

    .option-stats {
      position: relative;
      height: 24px;
    }

    .vote-bar {
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      background: linear-gradient(90deg, rgba(139,92,246,0.3), rgba(139,92,246,0.1));
      border-radius: 12px;
      transition: width 0.5s ease;
    }

    .vote-count {
      position: relative;
      z-index: 1;
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
    }

    .poll-footer {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .poll-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
    }

    .close-poll-btn {
      margin-right: auto;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(239,68,68,0.2);
      border: none;
      border-radius: 12px;
      color: #ef4444;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .close-poll-btn:hover {
      background: rgba(239,68,68,0.3);
    }

    .poll-results {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .result-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
    }

    .result-row.winner {
      background: rgba(139,92,246,0.2);
      border: 1px solid rgba(139,92,246,0.3);
    }

    .winner-badge { font-size: 1.2rem; }
    .result-text { flex: 1; color: white; }
    .result-count { color: rgba(255,255,255,0.6); font-weight: 700; }

    .closed-section {
      opacity: 0.8;
    }

    .empty-state {
      text-align: center;
      padding: 60px 24px;
      background: rgba(255,255,255,0.03);
      border-radius: 24px;
      border: 1px dashed rgba(255,255,255,0.1);
    }

    .empty-icon { font-size: 5rem; margin-bottom: 20px; animation: float 3s ease-in-out infinite; }
    .empty-state h3 { color: white; font-size: 1.5rem; margin: 0 0 8px; }
    .empty-state p { color: rgba(255,255,255,0.5); margin: 0; }
    .empty-mascot { font-size: 2.5rem; margin-top: 24px; }

    /* Modal Styles */
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
      max-width: 500px;
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
      background: rgba(139,92,246,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      position: sticky;
      top: 0;
    }

    .modal-icon { font-size: 1.8rem; }
    .modal-header h2 { flex: 1; color: white; font-size: 1.3rem; margin: 0; }
    .modal-mascot { font-size: 1.5rem; animation: float 3s ease-in-out infinite; }

    .modal-form { padding: 24px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-bottom: 8px; }
    .label-icon { margin-left: 6px; }

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
      border-color: #8b5cf6;
      box-shadow: 0 0 20px rgba(139,92,246,0.3);
    }

    .cosmic-input::placeholder { color: rgba(255,255,255,0.3); }
    .textarea { min-height: 80px; resize: vertical; }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 10px;
    }

    .category-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 12px;
      background: rgba(255,255,255,0.05);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      color: rgba(255,255,255,0.7);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .category-btn:hover {
      background: rgba(255,255,255,0.1);
    }

    .category-btn.selected {
      border-color: #8b5cf6;
      background: rgba(139,92,246,0.2);
      color: white;
    }

    .category-btn span:first-child { font-size: 1.5rem; }

    .options-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 12px;
    }

    .option-input-row {
      display: flex;
      gap: 10px;
    }

    .emoji-input {
      width: 50px;
      text-align: center;
      padding: 14px 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      color: white;
      font-size: 1.2rem;
      outline: none;
    }

    .option-text-input { flex: 1; }

    .remove-option-btn {
      width: 44px;
      background: rgba(239,68,68,0.2);
      border: none;
      border-radius: 14px;
      color: #ef4444;
      cursor: pointer;
      transition: all 0.2s;
    }

    .remove-option-btn:hover { background: rgba(239,68,68,0.3); }

    .add-option-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px dashed rgba(255,255,255,0.2);
      border-radius: 14px;
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .add-option-btn:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .btn-cancel {
      flex: 1;
      padding: 14px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 14px;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover { background: rgba(255,255,255,0.15); }

    .btn-save {
      flex: 1;
      padding: 14px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
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
      box-shadow: 0 8px 25px rgba(139,92,246,0.4);
    }

    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 768px) {
      .category-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VotingComponent {
  private readonly pollsStore = inject(PollsStore);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  activePolls$ = this.pollsStore.activePolls$;
  closedPolls$ = this.pollsStore.closedPolls$;
  canClosePoll$ = this.authService.isAdultOrAdmin$;

  currentTheme: UITheme = this.themeService.getCurrentTheme();
  showCreateModal = false;

  categories = [
    { value: 'MOVIE_NIGHT' as PollCategory, emoji: '🎬', label: 'ערב סרטים' },
    { value: 'FOOD_CHOICE' as PollCategory, emoji: '🍕', label: 'בחירת אוכל' },
    { value: 'ACTIVITY' as PollCategory, emoji: '🎯', label: 'פעילות' },
    { value: 'FAMILY_OUTING' as PollCategory, emoji: '👨‍👩‍👧‍👦', label: 'יציאה' },
    { value: 'OTHER' as PollCategory, emoji: '✨', label: 'אחר' }
  ];

  pollForm = {
    title: '',
    description: '',
    category: 'OTHER' as PollCategory,
    options: [{ text: '', emoji: '' }, { text: '', emoji: '' }]
  };

  constructor() {
    this.pollsStore.loadPolls();
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });
  }

  openCreateModal(): void {
    this.pollForm = {
      title: '',
      description: '',
      category: 'OTHER',
      options: [{ text: '', emoji: '' }, { text: '', emoji: '' }]
    };
    this.showCreateModal = true;
    this.cdr.markForCheck();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.cdr.markForCheck();
  }

  addOption(): void {
    if (this.pollForm.options.length < 10) {
      this.pollForm.options.push({ text: '', emoji: '' });
    }
  }

  removeOption(index: number): void {
    if (this.pollForm.options.length > 2) {
      this.pollForm.options.splice(index, 1);
    }
  }

  isFormValid(): boolean {
    return this.pollForm.title.trim().length > 0 &&
           this.pollForm.options.filter(o => o.text.trim().length > 0).length >= 2;
  }

  createPoll(): void {
    if (!this.isFormValid()) return;

    const dto: CreatePollDto = {
      title: this.pollForm.title.trim(),
      description: this.pollForm.description.trim() || undefined,
      category: this.pollForm.category,
      options: this.pollForm.options
        .filter(o => o.text.trim().length > 0)
        .map(o => ({ text: o.text.trim(), emoji: o.emoji || undefined }))
    };

    this.pollsStore.createPoll(dto).subscribe({
      next: () => {
        this.closeCreateModal();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error creating poll:', err);
      }
    });
  }

  vote(pollId: string, optionId: string): void {
    this.pollsStore.vote(pollId, { optionId }).subscribe({
      next: () => this.cdr.markForCheck(),
      error: (err) => console.error('Error voting:', err)
    });
  }

  closePoll(pollId: string): void {
    this.pollsStore.closePoll(pollId).subscribe({
      next: () => this.cdr.markForCheck(),
      error: (err) => console.error('Error closing poll:', err)
    });
  }

  getCategoryEmoji(category: PollCategory): string {
    return POLL_CATEGORY_LABELS[category]?.emoji || '✨';
  }

  getVotePercentage(poll: Poll, optionId: string): number {
    if (poll.totalVotes === 0) return 0;
    const option = poll.options.find(o => o.id === optionId);
    return option ? (option.voteCount / poll.totalVotes) * 100 : 0;
  }

  getSortedOptions(poll: Poll): typeof poll.options {
    return [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
  }
}
