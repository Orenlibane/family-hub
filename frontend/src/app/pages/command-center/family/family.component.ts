import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HouseholdStore } from '../../../core/stores';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="family-page" dir="rtl">
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
            <span class="header-icon">👨‍👩‍👧‍👦</span>
            <div>
              <h1>המשפחה שלנו</h1>
              <p>נהל את בני המשפחה</p>
            </div>
            <span class="header-mascot">🐿️</span>
          </div>
        </header>

        <!-- Household Card -->
        <section class="household-card">
          <div class="household-info">
            <div class="household-planet">
              <span class="planet-icon">🌍</span>
              <div class="planet-ring"></div>
            </div>
            <div class="household-details">
              <h2>{{ (household$ | async)?.name }}</h2>
              <p>{{ (memberCount$ | async) }} בני משפחה</p>
            </div>
          </div>
          <div class="invite-section">
            <div class="invite-code">
              <span class="code-label">קוד הזמנה</span>
              <span class="code-value">{{ (household$ | async)?.inviteCode }}</span>
            </div>
            <button class="invite-btn" (click)="copyInviteLink()">
              <span>📋</span> העתק קישור
            </button>
          </div>
        </section>

        <!-- Family Portrait -->
        <section class="family-portrait">
          <div class="portrait-header">
            <span class="star">⭐</span>
            <h3>צוות החלל שלנו</h3>
            <span class="star">⭐</span>
          </div>
          <div class="portrait-grid">
            @for (member of members$ | async; track member.id) {
              <div class="portrait-member" [class.is-you]="member.id === (user$ | async)?.id">
                <div class="member-planet" [class]="getRoleClass(member.role)">
                  <span class="member-initial">{{ member.avatar || member.name?.charAt(0) || '?' }}</span>
                  <div class="orbit-ring"></div>
                  @if (member.currentMood) {
                    <span class="mood-badge">{{ getMoodEmoji(member.currentMood) }}</span>
                  }
                </div>
                <div class="member-info">
                  <p class="member-name">
                    {{ member.name }}
                    @if (member.id === (user$ | async)?.id) {
                      <span class="you-badge">זה אני!</span>
                    }
                  </p>
                  <p class="member-email">{{ member.email }}</p>
                </div>
                <div class="member-stats">
                  <span class="coins">
                    <span class="coin-icon">⭐</span>
                    {{ member.famCoins }}
                  </span>
                  <span class="role-badge" [class]="getRoleClass(member.role)">
                    {{ getRoleLabel(member.role) }}
                  </span>
                </div>
                <div class="member-mascot">🐿️</div>
              </div>
            } @empty {
              <div class="empty-state">
                <div class="empty-icon">👨‍👩‍👧‍👦</div>
                <h3>עדיין אין בני משפחה</h3>
                <p>שתף את קוד ההזמנה כדי להוסיף חברים!</p>
                <div class="empty-mascot">🐿️💫</div>
              </div>
            }
          </div>
        </section>

        <!-- Members List -->
        <section class="members-section">
          <div class="section-header">
            <span class="section-icon">🚀</span>
            <h3>רשימת צוות</h3>
          </div>
          <div class="members-list">
            @for (member of members$ | async; track member.id) {
              <div class="member-card">
                <div class="member-avatar" [class]="getRoleClass(member.role)">
                  {{ member.avatar || member.name?.charAt(0) || '?' }}
                </div>
                <div class="member-details">
                  <div class="member-name-row">
                    <p class="name">{{ member.name }}</p>
                    @if (member.id === (user$ | async)?.id) {
                      <span class="self-badge">👋</span>
                    }
                  </div>
                  <p class="email">{{ member.email }}</p>
                </div>
                <div class="member-meta">
                  <span class="star-count">
                    <span>⭐</span> {{ member.famCoins }}
                  </span>
                  <span class="role" [class]="getRoleClass(member.role)">
                    {{ getRoleLabel(member.role) }}
                  </span>
                  @if (member.currentMood) {
                    <span class="mood">{{ getMoodEmoji(member.currentMood) }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      </div>

      <!-- Toast -->
      @if (showCopyToast) {
        <div class="toast">
          <span>✅</span> הקישור הועתק!
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .family-page {
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
      background: radial-gradient(circle, #3b82f6, transparent);
      top: -200px;
      right: -200px;
    }

    .nebula-2 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, #8b5cf6, transparent);
      bottom: -150px;
      left: -150px;
    }

    /* Content */
    .content-wrapper {
      position: relative;
      z-index: 10;
      padding: 24px;
      padding-bottom: 100px;
    }

    /* Header */
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

    .header-icon {
      font-size: 2.5rem;
    }

    .header-content h1 {
      font-size: 1.75rem;
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
      left: 24px;
      font-size: 2rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    /* Household Card */
    .household-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 24px;
    }

    .household-info {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .household-planet {
      position: relative;
      width: 70px;
      height: 70px;
    }

    .planet-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      z-index: 1;
    }

    .planet-ring {
      position: absolute;
      inset: -5px;
      border: 2px solid rgba(59,130,246,0.4);
      border-radius: 50%;
      animation: ring-rotate 8s linear infinite;
    }

    @keyframes ring-rotate {
      from { transform: rotateZ(0deg); }
      to { transform: rotateZ(360deg); }
    }

    .household-details h2 {
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 4px;
    }

    .household-details p {
      color: rgba(255,255,255,0.6);
      font-size: 0.95rem;
      margin: 0;
    }

    .invite-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .invite-code {
      text-align: left;
      padding: 12px 20px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .code-label {
      display: block;
      color: rgba(255,255,255,0.5);
      font-size: 0.75rem;
      margin-bottom: 4px;
    }

    .code-value {
      display: block;
      color: #22d3ee;
      font-family: monospace;
      font-size: 1.2rem;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .invite-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border: none;
      border-radius: 16px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(59,130,246,0.4);
      transition: all 0.2s;
    }

    .invite-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(59,130,246,0.5);
    }

    /* Family Portrait */
    .family-portrait {
      background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 2px solid rgba(255,255,255,0.1);
      padding: 24px;
      margin-bottom: 24px;
    }

    .portrait-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .portrait-header h3 {
      color: white;
      font-size: 1.3rem;
      margin: 0;
    }

    .star {
      font-size: 1.5rem;
      animation: twinkle 2s ease-in-out infinite;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    .portrait-grid {
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
    }

    .portrait-member {
      text-align: center;
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.05);
      transition: all 0.3s;
      position: relative;
    }

    .portrait-member:hover {
      background: rgba(255,255,255,0.08);
      transform: translateY(-5px);
    }

    .portrait-member.is-you {
      border-color: rgba(59,130,246,0.4);
      box-shadow: 0 0 30px rgba(59,130,246,0.2);
    }

    .member-planet {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 0 30px rgba(255,255,255,0.1);
    }

    .member-planet.parent {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }

    .member-planet.child {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
    }

    .member-planet.admin {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .member-initial {
      font-size: 2rem;
      font-weight: 700;
      color: white;
    }

    .orbit-ring {
      position: absolute;
      inset: -8px;
      border: 2px dashed rgba(255,255,255,0.2);
      border-radius: 50%;
      animation: orbit 10s linear infinite;
    }

    @keyframes orbit {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .mood-badge {
      position: absolute;
      bottom: -5px;
      right: -5px;
      font-size: 1.5rem;
      animation: bounce 2s ease-in-out infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    .member-info {
      margin-bottom: 12px;
    }

    .member-name {
      color: white;
      font-weight: 600;
      margin: 0 0 4px;
    }

    .you-badge {
      display: inline-block;
      padding: 2px 8px;
      background: rgba(59,130,246,0.3);
      border-radius: 10px;
      font-size: 0.7rem;
      margin-right: 6px;
    }

    .member-email {
      color: rgba(255,255,255,0.5);
      font-size: 0.8rem;
      margin: 0;
    }

    .member-stats {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .coins {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #fbbf24;
      font-weight: 700;
    }

    .coin-icon {
      animation: star-pulse 1.5s ease-in-out infinite;
    }

    @keyframes star-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    .role-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .role-badge.parent {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
    }

    .role-badge.child {
      background: rgba(139,92,246,0.2);
      color: #a78bfa;
    }

    .role-badge.admin {
      background: rgba(245,158,11,0.2);
      color: #fbbf24;
    }

    .member-mascot {
      position: absolute;
      bottom: 10px;
      left: 10px;
      font-size: 1.2rem;
      animation: bounce 2.5s ease-in-out infinite;
    }

    /* Members Section */
    .members-section {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      background: rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .section-icon {
      font-size: 1.5rem;
    }

    .section-header h3 {
      color: white;
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0;
    }

    .members-list {
      display: flex;
      flex-direction: column;
    }

    .member-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.2s;
    }

    .member-card:hover {
      background: rgba(255,255,255,0.03);
    }

    .member-card:last-child {
      border-bottom: none;
    }

    .member-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      font-weight: 700;
      color: white;
    }

    .member-avatar.parent {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    }

    .member-avatar.child {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
    }

    .member-avatar.admin {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }

    .member-details {
      flex: 1;
    }

    .member-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .name {
      color: white;
      font-weight: 600;
      margin: 0;
    }

    .self-badge {
      font-size: 1rem;
    }

    .email {
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
      margin: 4px 0 0;
    }

    .member-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .star-count {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #fbbf24;
      font-weight: 700;
    }

    .role {
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .role.parent {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
    }

    .role.child {
      background: rgba(139,92,246,0.2);
      color: #a78bfa;
    }

    .role.admin {
      background: rgba(245,158,11,0.2);
      color: #fbbf24;
    }

    .mood {
      font-size: 1.5rem;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 24px;
      width: 100%;
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 20px;
      animation: float 3s ease-in-out infinite;
    }

    .empty-state h3 {
      color: white;
      font-size: 1.5rem;
      margin: 0 0 8px;
    }

    .empty-state p {
      color: rgba(255,255,255,0.5);
      margin: 0;
    }

    .empty-mascot {
      font-size: 2.5rem;
      margin-top: 24px;
      animation: bounce 2s ease-in-out infinite;
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #10b981, #059669);
      backdrop-filter: blur(12px);
      border-radius: 30px;
      color: white;
      font-weight: 600;
      box-shadow: 0 10px 40px rgba(16,185,129,0.4);
      animation: toast-in 0.3s ease-out;
      z-index: 200;
    }

    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .household-card {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }

      .household-info {
        flex-direction: column;
      }

      .invite-section {
        flex-direction: column;
        width: 100%;
      }

      .invite-code {
        text-align: center;
        width: 100%;
      }

      .invite-btn {
        width: 100%;
        justify-content: center;
      }

      .portrait-grid {
        gap: 16px;
      }

      .member-meta {
        flex-wrap: wrap;
        justify-content: flex-end;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FamilyComponent {
  private readonly householdStore = inject(HouseholdStore);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  household$ = this.authService.household$;
  members$ = this.householdStore.members$;
  memberCount$ = this.householdStore.memberCount$;
  user$ = this.authService.user$;

  showCopyToast = false;

  constructor() {
    this.householdStore.loadHousehold();
  }

  copyInviteLink(): void {
    const household = this.authService.getSnapshot().household;
    if (household) {
      const link = `${window.location.origin}/join/${household.inviteCode}`;
      navigator.clipboard.writeText(link).then(() => {
        this.showCopyToast = true;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.showCopyToast = false;
          this.cdr.markForCheck();
        }, 3000);
      });
    }
  }

  getMoodEmoji(mood: string): string {
    const moods: Record<string, string> = {
      'HAPPY': '😊',
      'EXCITED': '🤩',
      'CALM': '😌',
      'TIRED': '😴',
      'SAD': '😢',
      'ANGRY': '😠',
      'ANXIOUS': '😰'
    };
    return moods[mood] || '😐';
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'ADMIN': return 'admin';
      case 'ADULT': return 'parent';
      case 'KID': return 'child';
      default: return 'child';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return '👑 מנהל';
      case 'ADULT': return '👨‍👩‍👧 הורה';
      case 'KID': return '🧒 ילד';
      default: return role;
    }
  }
}
