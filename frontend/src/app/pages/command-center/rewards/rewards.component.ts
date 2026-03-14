import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RewardsStore } from '../../../core/stores';
import { ThemeService, UITheme } from '../../../core/services';
import { Reward, CreateRewardDto, RedemptionRecord } from '../../../core/models';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rewards-page" dir="rtl">
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
            <span class="header-icon">🎁</span>
            <div>
              <h1>חנות פרסים</h1>
              <p>נהל פרסים ואשר בקשות</p>
            </div>
            <span class="header-mascot">🐿️</span>
          </div>
          <button (click)="openCreateModal()" class="add-btn">
            <span>✨</span> פרס חדש
          </button>
        </header>

        <!-- Tabs -->
        <div class="tabs-container">
          <button
            (click)="activeTab = 'rewards'"
            class="tab-btn"
            [class.active]="activeTab === 'rewards'"
          >
            <span class="tab-icon">🎁</span>
            <span>פרסים ({{ (rewards$ | async)?.length || 0 }})</span>
          </button>
          <button
            (click)="activeTab = 'redemptions'"
            class="tab-btn"
            [class.active]="activeTab === 'redemptions'"
          >
            <span class="tab-icon">📋</span>
            <span>בקשות</span>
            @if ((pendingRedemptions$ | async)?.length) {
              <span class="badge-count">{{ (pendingRedemptions$ | async)?.length }}</span>
            }
          </button>
        </div>

        <!-- Rewards Grid -->
        @if (activeTab === 'rewards') {
          <div class="rewards-grid">
            @for (reward of rewards$ | async; track reward.id) {
              <div class="reward-card" [class.inactive]="!reward.isActive">
                <div class="card-glow"></div>
                <div class="card-header">
                  <div class="reward-icon-wrap">
                    <span class="reward-icon">🎁</span>
                    <div class="icon-ring"></div>
                  </div>
                  <div class="card-actions">
                    <button class="action-btn edit" (click)="openEditModal(reward)">✏️</button>
                    <button class="action-btn delete" (click)="deleteReward(reward)">🗑️</button>
                  </div>
                </div>
                <h3 class="reward-name">{{ reward.name }}</h3>
                @if (reward.description) {
                  <p class="reward-desc">{{ reward.description }}</p>
                }
                <div class="reward-footer">
                  <span class="coin-cost">
                    <span class="coin-icon">⭐</span>
                    {{ reward.coinCost }}
                  </span>
                  @if (reward.stock !== null) {
                    <span class="stock-info">מלאי: {{ reward.stock }}</span>
                  }
                </div>
                @if (!reward.isActive) {
                  <span class="inactive-badge">🔒 לא פעיל</span>
                }
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon">🎁</div>
                <h3>אין פרסים עדיין</h3>
                <p>צור פרסים שהמשפחה תוכל להרוויח!</p>
                <button (click)="openCreateModal()" class="create-btn">
                  <span>✨</span> צור פרס ראשון
                </button>
                <div class="empty-mascot">🐿️✨</div>
              </div>
            }
          </div>
        }

        <!-- Redemptions List -->
        @if (activeTab === 'redemptions') {
          <div class="redemptions-list">
            @for (redemption of redemptions$ | async; track redemption.id) {
              <div class="redemption-card">
                <div class="redemption-icon">
                  <span>🎁</span>
                </div>
                <div class="redemption-content">
                  <h3>{{ redemption.reward?.name }}</h3>
                  <p>{{ redemption.user?.name }} • {{ redemption.createdAt | date:'short' }}</p>
                </div>
                <span class="redemption-cost">
                  <span>⭐</span> {{ redemption.coinsSpent }}
                </span>
                <div class="redemption-actions">
                  @switch (redemption.status) {
                    @case ('PENDING') {
                      <button class="status-btn approve" (click)="approveRedemption(redemption)">
                        ✅ אשר
                      </button>
                      <button class="status-btn reject" (click)="rejectRedemption(redemption)">
                        ❌ דחה
                      </button>
                    }
                    @case ('APPROVED') {
                      <button class="status-btn fulfill" (click)="fulfillRedemption(redemption)">
                        🎉 בוצע
                      </button>
                    }
                    @case ('FULFILLED') {
                      <span class="status-badge fulfilled">✅ בוצע</span>
                    }
                    @case ('REJECTED') {
                      <span class="status-badge rejected">❌ נדחה</span>
                    }
                  }
                </div>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>אין בקשות עדיין</h3>
                <p>בקשות לפרסים יופיעו כאן</p>
                <div class="empty-mascot">🐿️💤</div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Create/Edit Modal -->
      @if (showModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>{{ editingReward ? '✏️ עריכת פרס' : '✨ פרס חדש' }}</h2>
              <button class="modal-close" (click)="closeModal()">✕</button>
            </div>

            <form (ngSubmit)="saveReward()" class="modal-form">
              <div class="form-group">
                <label>שם הפרס *</label>
                <input
                  type="text"
                  [(ngModel)]="rewardForm.name"
                  name="name"
                  required
                  class="form-input"
                  placeholder="לדוגמה: זמן מסך נוסף"
                />
              </div>

              <div class="form-group">
                <label>תיאור</label>
                <textarea
                  [(ngModel)]="rewardForm.description"
                  name="description"
                  rows="3"
                  class="form-input"
                  placeholder="תאר את הפרס..."
                ></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>עלות בכוכבים *</label>
                  <input
                    type="number"
                    [(ngModel)]="rewardForm.coinCost"
                    name="coinCost"
                    min="1"
                    max="10000"
                    required
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>מלאי (ריק = ללא הגבלה)</label>
                  <input
                    type="number"
                    [(ngModel)]="rewardForm.stock"
                    name="stock"
                    min="0"
                    class="form-input"
                    placeholder="ללא הגבלה"
                  />
                </div>
              </div>

              @if (editingReward) {
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [(ngModel)]="rewardForm.isActive"
                    name="isActive"
                  />
                  <span class="checkbox-custom"></span>
                  <span>פעיל (מוצג בחנות)</span>
                </label>
              }

              <div class="modal-footer">
                <button type="button" class="btn-cancel" (click)="closeModal()">ביטול</button>
                <button type="submit" class="btn-save">
                  <span>💾</span> {{ editingReward ? 'עדכן' : 'צור' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .rewards-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #1a1a3a 100%);
      position: relative;
      overflow-x: hidden;
    }

    /* Stars Background */
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
      background: radial-gradient(circle, #db2777, transparent);
      bottom: -150px;
      left: -150px;
    }

    /* Content Wrapper */
    .content-wrapper {
      position: relative;
      z-index: 10;
      padding: 24px;
      padding-bottom: 100px;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      padding: 16px 24px;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
    }

    .header-icon {
      font-size: 2.5rem;
    }

    .header-content h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .header-content p {
      color: rgba(255,255,255,0.6);
      margin: 4px 0 0;
      font-size: 0.9rem;
    }

    .header-mascot {
      position: absolute;
      left: 20px;
      font-size: 1.8rem;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #8b5cf6, #db2777);
      border: none;
      border-radius: 16px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(139,92,246,0.4);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .add-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(139,92,246,0.5);
    }

    /* Tabs */
    .tabs-container {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }

    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 24px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      color: rgba(255,255,255,0.7);
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .tab-btn:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }

    .tab-btn.active {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border-color: transparent;
      color: white;
      box-shadow: 0 8px 25px rgba(139,92,246,0.4);
    }

    .tab-icon {
      font-size: 1.2rem;
    }

    .badge-count {
      position: absolute;
      top: -8px;
      left: -8px;
      width: 24px;
      height: 24px;
      background: #ef4444;
      border-radius: 50%;
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }

    /* Rewards Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .reward-card {
      position: relative;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.3s, box-shadow 0.3s;
      overflow: hidden;
    }

    .reward-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }

    .reward-card.inactive {
      opacity: 0.6;
    }

    .card-glow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: linear-gradient(180deg, rgba(139,92,246,0.15), transparent);
      pointer-events: none;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      position: relative;
    }

    .reward-icon-wrap {
      position: relative;
      width: 64px;
      height: 64px;
    }

    .reward-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      z-index: 1;
    }

    .icon-ring {
      position: absolute;
      inset: 0;
      border: 2px solid rgba(139,92,246,0.5);
      border-radius: 50%;
      animation: ring-pulse 2s ease-in-out infinite;
    }

    @keyframes ring-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.5; }
    }

    .card-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(255,255,255,0.1);
    }

    .action-btn.delete:hover {
      background: rgba(239,68,68,0.2);
      border-color: rgba(239,68,68,0.3);
    }

    .reward-name {
      color: white;
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .reward-desc {
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      margin: 0 0 16px;
      line-height: 1.5;
    }

    .reward-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .coin-cost {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #fbbf24;
      font-size: 1.3rem;
      font-weight: 700;
    }

    .coin-icon {
      animation: star-glow 2s ease-in-out infinite;
    }

    @keyframes star-glow {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3); }
    }

    .stock-info {
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
    }

    .inactive-badge {
      position: absolute;
      top: 16px;
      left: 16px;
      padding: 6px 12px;
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      color: rgba(255,255,255,0.7);
      font-size: 0.75rem;
    }

    /* Redemptions List */
    .redemptions-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .redemption-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .redemption-icon {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 8px 20px rgba(139,92,246,0.3);
    }

    .redemption-content {
      flex: 1;
    }

    .redemption-content h3 {
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 4px;
    }

    .redemption-content p {
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
      margin: 0;
    }

    .redemption-cost {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #fbbf24;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .redemption-actions {
      display: flex;
      gap: 8px;
    }

    .status-btn {
      padding: 10px 16px;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .status-btn.approve {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .status-btn.reject {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
      border: 1px solid rgba(239,68,68,0.3);
    }

    .status-btn.fulfill {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
    }

    .status-btn:hover {
      transform: translateY(-2px);
    }

    .status-badge {
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .status-badge.fulfilled {
      background: rgba(16,185,129,0.2);
      color: #10b981;
    }

    .status-badge.rejected {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
    }

    /* Empty State */
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 24px;
      background: rgba(255,255,255,0.03);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 20px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-15px); }
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

    .create-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #8b5cf6, #db2777);
      border: none;
      border-radius: 16px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .create-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 30px rgba(139,92,246,0.4);
    }

    .empty-mascot {
      font-size: 2.5rem;
      margin-top: 24px;
      animation: bounce 2s ease-in-out infinite;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 24px;
    }

    .modal {
      background: linear-gradient(135deg, #1a1a3a, #12122a);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      width: 100%;
      max-width: 480px;
      padding: 24px;
      animation: modal-in 0.3s ease-out;
    }

    @keyframes modal-in {
      from { opacity: 0; transform: scale(0.95) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .modal-header h2 {
      color: white;
      font-size: 1.3rem;
      margin: 0;
    }

    .modal-close {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.7);
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      color: rgba(255,255,255,0.7);
      font-size: 0.9rem;
    }

    .form-input {
      padding: 14px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: white;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      border-color: #8b5cf6;
    }

    .form-input::placeholder {
      color: rgba(255,255,255,0.3);
    }

    textarea.form-input {
      resize: none;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
    }

    .checkbox-label input {
      display: none;
    }

    .checkbox-custom {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 6px;
      position: relative;
      transition: all 0.2s;
    }

    .checkbox-label input:checked + .checkbox-custom {
      background: #8b5cf6;
      border-color: #8b5cf6;
    }

    .checkbox-label input:checked + .checkbox-custom::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 0.9rem;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .btn-cancel {
      flex: 1;
      padding: 14px 20px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      color: rgba(255,255,255,0.7);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel:hover {
      background: rgba(255,255,255,0.1);
    }

    .btn-save {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 20px;
      background: linear-gradient(135deg, #8b5cf6, #db2777);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(139,92,246,0.4);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .header-content {
        width: 100%;
      }

      .add-btn {
        width: 100%;
        justify-content: center;
      }

      .tabs-container {
        flex-direction: column;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .redemption-card {
        flex-wrap: wrap;
      }

      .redemption-actions {
        width: 100%;
        justify-content: flex-end;
        margin-top: 8px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RewardsComponent {
  private readonly rewardsStore = inject(RewardsStore);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  rewards$ = this.rewardsStore.rewards$;
  redemptions$ = this.rewardsStore.redemptions$;
  pendingRedemptions$ = this.rewardsStore.pendingRedemptions$;

  currentTheme: UITheme = this.themeService.getCurrentTheme();
  activeTab: 'rewards' | 'redemptions' = 'rewards';
  showModal = false;
  editingReward: Reward | null = null;
  rewardForm: Partial<CreateRewardDto & { isActive: boolean }> = this.getEmptyForm();

  isUnicornTheme(): boolean {
    return this.currentTheme.id === 'candy' || this.currentTheme.id === 'princess';
  }

  constructor() {
    this.rewardsStore.loadRewards();
    this.rewardsStore.loadRedemptions();
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });
  }

  openCreateModal(): void {
    this.editingReward = null;
    this.rewardForm = this.getEmptyForm();
    this.showModal = true;
  }

  openEditModal(reward: Reward): void {
    this.editingReward = reward;
    this.rewardForm = {
      name: reward.name,
      description: reward.description || '',
      coinCost: reward.coinCost,
      stock: reward.stock ?? undefined,
      isActive: reward.isActive
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingReward = null;
  }

  saveReward(): void {
    if (!this.rewardForm.name || !this.rewardForm.coinCost) return;

    const dto: CreateRewardDto = {
      name: this.rewardForm.name!,
      description: this.rewardForm.description,
      coinCost: this.rewardForm.coinCost!,
      stock: this.rewardForm.stock
    };

    if (this.editingReward) {
      this.rewardsStore.updateReward(this.editingReward.id, {
        ...dto,
        isActive: this.rewardForm.isActive
      } as Partial<CreateRewardDto>).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.rewardsStore.createReward(dto).subscribe(() => {
        this.closeModal();
      });
    }
  }

  deleteReward(reward: Reward): void {
    if (confirm(`Delete "${reward.name}"?`)) {
      this.rewardsStore.deleteReward(reward.id).subscribe();
    }
  }

  approveRedemption(redemption: RedemptionRecord): void {
    this.rewardsStore.approveRedemption(redemption.id).subscribe();
  }

  rejectRedemption(redemption: RedemptionRecord): void {
    const reason = prompt('Reason for rejection (optional):');
    this.rewardsStore.rejectRedemption(redemption.id, reason || undefined).subscribe();
  }

  fulfillRedemption(redemption: RedemptionRecord): void {
    this.rewardsStore.fulfillRedemption(redemption.id).subscribe();
  }

  private getEmptyForm(): Partial<CreateRewardDto & { isActive: boolean }> {
    return {
      name: '',
      description: '',
      coinCost: 50,
      stock: undefined,
      isActive: true
    };
  }
}
