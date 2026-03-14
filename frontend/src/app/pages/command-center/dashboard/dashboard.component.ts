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
    <div class="cosmic-dashboard" dir="rtl">
      <!-- Animated Stars Background -->
      <div class="stars-container">
        <div class="stars stars-1"></div>
        <div class="stars stars-2"></div>
        <div class="stars stars-3"></div>
        <div class="nebula nebula-1"></div>
        <div class="nebula nebula-2"></div>
      </div>

      <!-- Main Content -->
      <div class="relative z-10 p-6">
        <!-- Header with Logo -->
        <header class="text-center mb-8">
          <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-6 py-3 border border-white/20">
            <span class="text-4xl animate-pulse">⭐</span>
            <div>
              <h1 class="text-2xl font-bold text-white">מרכז המשפחה שלי</h1>
              <p class="text-white/70 text-sm">שלום, {{ (user$ | async)?.name }}! 🚀</p>
            </div>
            <span class="text-3xl">👨‍👩‍👧‍👦</span>
          </div>
        </header>

        <!-- Planet Stats Row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <!-- Tasks Planet -->
          <div class="planet-widget planet-blue">
            <div class="planet-ring"></div>
            <div class="planet-content">
              <span class="planet-icon">🪐</span>
              <span class="planet-value">{{ (todayTasks$ | async)?.length || 0 }}</span>
              <span class="planet-label">משימות היום</span>
            </div>
            <div class="planet-mascot">🤖</div>
          </div>

          <!-- Overdue Planet -->
          <div class="planet-widget planet-red">
            <div class="planet-ring"></div>
            <div class="planet-content">
              <span class="planet-icon">☄️</span>
              <span class="planet-value">{{ (overdueTasks$ | async)?.length || 0 }}</span>
              <span class="planet-label">באיחור</span>
            </div>
            <div class="planet-mascot">🐿️</div>
          </div>

          <!-- Family Planet -->
          <div class="planet-widget planet-purple">
            <div class="planet-ring"></div>
            <div class="planet-content">
              <span class="planet-icon">🌍</span>
              <span class="planet-value">{{ (memberCount$ | async) || 0 }}</span>
              <span class="planet-label">בני משפחה</span>
            </div>
            <div class="planet-mascot">🐨</div>
          </div>

          <!-- Points Planet -->
          <div class="planet-widget planet-gold">
            <div class="planet-ring"></div>
            <div class="planet-content">
              <span class="planet-icon">⭐</span>
              <span class="planet-value">{{ totalFamilyCoins }}</span>
              <span class="planet-label">נקודות כוכב</span>
            </div>
            <div class="planet-mascot crown">🐿️</div>
          </div>
        </div>

        <!-- Main Widgets Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <!-- Tasks Widget (Space Console) -->
          <section class="console-widget col-span-1 lg:col-span-2">
            <div class="console-header">
              <div class="console-title">
                <span class="console-icon">🤖</span>
                <h2>משימות חשובות</h2>
              </div>
              <a routerLink="/command-center/tasks" class="console-link">
                צפה בהכל <span>→</span>
              </a>
            </div>
            <div class="console-body">
              @if ((mustDoTasks$ | async)?.length) {
                <ul class="task-list">
                  @for (task of mustDoTasks$ | async; track task.id) {
                    <li class="task-card">
                      <div class="task-robot">🤖</div>
                      <div class="task-checkbox">
                        <div class="star-check">⭐</div>
                      </div>
                      <div class="task-content">
                        <p class="task-title">{{ task.title }}</p>
                        @if (task.assignedTo) {
                          <p class="task-assignee">
                            <span class="avatar-mini">{{ task.assignedTo.name?.charAt(0) }}</span>
                            {{ task.assignedTo.name }}
                          </p>
                        }
                      </div>
                      <div class="task-reward">
                        <span class="coin-glow">🪙</span>
                        <span>{{ task.coinReward }}</span>
                      </div>
                      <div class="task-priority">
                        @for (star of [1,2,3]; track star) {
                          <span class="priority-star" [class.active]="star <= (task.isMustDo ? 3 : 1)">⭐</span>
                        }
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <div class="empty-state">
                  <div class="empty-rocket">🚀</div>
                  <p class="empty-text">אין משימות דחופות!</p>
                  <p class="empty-subtext">הכל מסודר בחלל 🌟</p>
                  <div class="chinchilla-celebrate">🐿️✨</div>
                </div>
              }
            </div>
          </section>

          <!-- Points Widget -->
          <section class="console-widget points-widget">
            <div class="console-header">
              <div class="console-title">
                <span class="console-icon">⭐</span>
                <h2>נקודות משפחתיות</h2>
              </div>
            </div>
            <div class="console-body">
              <div class="points-display">
                <div class="points-orb">
                  <div class="orb-glow"></div>
                  <span class="points-value">{{ totalFamilyCoins }}</span>
                  <span class="points-label">כוכבים</span>
                </div>
                <div class="chinchilla-king">
                  <span class="crown-icon">👑</span>
                  <span class="chinchilla-icon">🐿️</span>
                </div>
              </div>
              <div class="points-breakdown">
                @for (member of members$ | async; track member.id) {
                  <div class="member-points">
                    <span class="member-avatar">{{ member.name?.charAt(0) }}</span>
                    <span class="member-name">{{ member.name }}</span>
                    <span class="member-coins">
                      <span class="star-mini">⭐</span>
                      {{ member.famCoins }}
                    </span>
                  </div>
                }
              </div>
            </div>
          </section>
        </div>

        <!-- Second Row: Events & Family -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- Upcoming Events Widget -->
          <section class="console-widget">
            <div class="console-header">
              <div class="console-title">
                <span class="console-icon">📅</span>
                <h2>אירועים קרובים</h2>
              </div>
              <a routerLink="/command-center/calendar" class="console-link">
                לוח שנה <span>→</span>
              </a>
            </div>
            <div class="console-body">
              <div class="events-list">
                <div class="event-card">
                  <div class="event-planet">🪐</div>
                  <div class="event-content">
                    <p class="event-title">ישיבת הורים</p>
                    <p class="event-date">יום שלישי, 15:00</p>
                  </div>
                  <div class="event-avatar">👩</div>
                </div>
                <div class="event-card">
                  <div class="event-planet pink">🌸</div>
                  <div class="event-content">
                    <p class="event-title">יום הולדת סבתא</p>
                    <p class="event-date">יום שישי, 18:00</p>
                  </div>
                  <div class="event-avatar">👵</div>
                </div>
                <div class="event-card">
                  <div class="event-planet green">🌿</div>
                  <div class="event-content">
                    <p class="event-title">חוג כדורגל</p>
                    <p class="event-date">כל יום ראשון</p>
                  </div>
                  <div class="event-avatar">⚽</div>
                </div>
              </div>
            </div>
          </section>

          <!-- Pending Rewards Widget -->
          <section class="console-widget rewards-widget">
            <div class="console-header">
              <div class="console-title">
                <span class="console-icon">🎁</span>
                <h2>פרסים ממתינים</h2>
              </div>
              <a routerLink="/command-center/rewards" class="console-link">
                חנות פרסים <span>→</span>
              </a>
            </div>
            <div class="console-body">
              @if ((pendingRedemptions$ | async)?.length) {
                <ul class="rewards-list">
                  @for (redemption of pendingRedemptions$ | async; track redemption.id) {
                    <li class="reward-card">
                      <div class="reward-pedestal">
                        <span class="reward-icon">🎁</span>
                      </div>
                      <div class="reward-content">
                        <p class="reward-name">{{ redemption.reward?.name }}</p>
                        <p class="reward-user">{{ redemption.user?.name }}</p>
                      </div>
                      <div class="reward-cost">
                        <span>⭐</span> {{ redemption.coinsSpent }}
                      </div>
                    </li>
                  }
                </ul>
              } @else {
                <div class="empty-state small">
                  <span class="empty-icon">🎁</span>
                  <p>אין פרסים ממתינים</p>
                  <div class="chinchilla-shop">🐿️🛒</div>
                </div>
              }
            </div>
          </section>
        </div>

        <!-- Family Portrait Section -->
        <section class="family-portrait">
          <div class="portrait-frame">
            <div class="portrait-header">
              <span class="portrait-star">⭐</span>
              <h2>המשפחה שלנו</h2>
              <span class="portrait-star">⭐</span>
            </div>
            <div class="portrait-members">
              @for (member of members$ | async; track member.id) {
                <div class="portrait-member">
                  <div class="member-planet" [class]="getMemberColor(member.role)">
                    <span class="member-initial">{{ member.name?.charAt(0) }}</span>
                    <div class="member-chinchilla">🐿️</div>
                  </div>
                  <p class="member-label">{{ member.name }}</p>
                  <div class="member-stars">
                    <span>⭐</span> {{ member.famCoins }}
                  </div>
                </div>
              }
            </div>
            <a routerLink="/command-center/family" class="portrait-link">
              נהל משפחה <span>👨‍👩‍👧‍👦</span>
            </a>
          </div>
        </section>

        <!-- Rainbow Rocket Progress -->
        <div class="rocket-progress">
          <div class="progress-track">
            <div class="progress-stars">
              @for (i of [1,2,3,4,5,6,7,8,9,10]; track i) {
                <span class="track-star" [class.passed]="i <= progressPercent / 10">⭐</span>
              }
            </div>
            <div class="rocket-container" [style.left.%]="progressPercent">
              <div class="rocket-trail"></div>
              <span class="rocket-icon">🚀</span>
            </div>
          </div>
          <p class="progress-label">התקדמות חודשית: {{ progressPercent }}%</p>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <a routerLink="/command-center/tasks" class="action-button blue">
            <span class="action-icon">✅</span>
            <span class="action-label">משימה חדשה</span>
            <span class="action-robot">🤖</span>
          </a>
          <a routerLink="/command-center/rewards" class="action-button purple">
            <span class="action-icon">🎁</span>
            <span class="action-label">הוסף פרס</span>
            <span class="action-robot">🐿️</span>
          </a>
          <a routerLink="/command-center/family" class="action-button teal">
            <span class="action-icon">👥</span>
            <span class="action-label">הזמן חבר</span>
            <span class="action-robot">🌟</span>
          </a>
          <a routerLink="/command-center/calendar" class="action-button orange">
            <span class="action-icon">📅</span>
            <span class="action-label">לוח שנה</span>
            <span class="action-robot">🪐</span>
          </a>
        </div>

        <!-- Activity Feed -->
        <section class="activity-feed">
          <h3 class="feed-title">
            <span>📡</span> פעילות אחרונה
          </h3>
          <div class="feed-scroll">
            <div class="feed-item">
              <span class="feed-icon green">✅</span>
              <span class="feed-text">דני סיים את המשימה "לסדר חדר"</span>
              <span class="feed-coins">+10 ⭐</span>
            </div>
            <div class="feed-item">
              <span class="feed-icon purple">🎁</span>
              <span class="feed-text">שירה קיבלה פרס "גלידה"</span>
              <span class="feed-coins">-15 ⭐</span>
            </div>
            <div class="feed-item">
              <span class="feed-icon blue">➕</span>
              <span class="feed-text">אמא הוסיפה משימה חדשה</span>
              <span class="feed-time">לפני 5 דקות</span>
            </div>
          </div>
        </section>

        <!-- Connection Status -->
        <div class="connection-status" [class.online]="connected$ | async">
          <span class="status-dot"></span>
          <span class="status-text">{{ (connected$ | async) ? 'מחובר לחלל' : 'לא מחובר' }}</span>
          <span class="status-icon">{{ (connected$ | async) ? '🛸' : '📡' }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ========== COSMIC THEME VARIABLES ========== */
    :host {
      --space-dark: #0a0a1a;
      --space-deep: #12122a;
      --nebula-purple: #6b21a8;
      --nebula-pink: #db2777;
      --nebula-blue: #1d4ed8;
      --star-gold: #fbbf24;
      --planet-blue: #3b82f6;
      --planet-red: #ef4444;
      --planet-purple: #8b5cf6;
      --planet-green: #10b981;
      --planet-orange: #f97316;
      --glow-cyan: #22d3ee;
    }

    /* ========== COSMIC DASHBOARD CONTAINER ========== */
    .cosmic-dashboard {
      min-height: 100vh;
      background: linear-gradient(135deg, var(--space-dark) 0%, var(--space-deep) 50%, #1a1a3a 100%);
      position: relative;
      overflow-x: hidden;
    }

    /* ========== ANIMATED STARS ========== */
    .stars-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
    }

    .stars {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-repeat: repeat;
    }

    .stars-1 {
      background-image: radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                        radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
                        radial-gradient(1px 1px at 90px 40px, #fff, transparent),
                        radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent);
      background-size: 200px 200px;
      animation: stars-move 100s linear infinite;
    }

    .stars-2 {
      background-image: radial-gradient(1px 1px at 50px 80px, #fff, transparent),
                        radial-gradient(2px 2px at 100px 150px, rgba(255,255,255,0.7), transparent),
                        radial-gradient(1px 1px at 130px 50px, #fff, transparent);
      background-size: 300px 300px;
      animation: stars-move 150s linear infinite;
    }

    .stars-3 {
      background-image: radial-gradient(3px 3px at 70px 20px, var(--star-gold), transparent),
                        radial-gradient(2px 2px at 180px 100px, var(--glow-cyan), transparent);
      background-size: 400px 400px;
      animation: twinkle 4s ease-in-out infinite, stars-move 200s linear infinite;
    }

    @keyframes stars-move {
      from { transform: translateY(0); }
      to { transform: translateY(-100%); }
    }

    @keyframes twinkle {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    /* ========== NEBULA EFFECTS ========== */
    .nebula {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.3;
      animation: nebula-pulse 8s ease-in-out infinite;
    }

    .nebula-1 {
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, var(--nebula-purple), transparent);
      top: -200px;
      right: -200px;
    }

    .nebula-2 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, var(--nebula-pink), transparent);
      bottom: -150px;
      left: -150px;
      animation-delay: 4s;
    }

    @keyframes nebula-pulse {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.1); opacity: 0.4; }
    }

    /* ========== PLANET WIDGETS ========== */
    .planet-widget {
      position: relative;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 24px 16px;
      border: 1px solid rgba(255,255,255,0.1);
      text-align: center;
      overflow: hidden;
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .planet-widget:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }

    .planet-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 80%;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 50%;
      transform: translate(-50%, -50%) rotateX(70deg);
    }

    .planet-content {
      position: relative;
      z-index: 1;
    }

    .planet-icon {
      display: block;
      font-size: 2.5rem;
      margin-bottom: 8px;
      animation: float 3s ease-in-out infinite;
    }

    .planet-value {
      display: block;
      font-size: 2rem;
      font-weight: 800;
      color: white;
      text-shadow: 0 0 20px currentColor;
    }

    .planet-label {
      display: block;
      font-size: 0.75rem;
      color: rgba(255,255,255,0.7);
      margin-top: 4px;
    }

    .planet-mascot {
      position: absolute;
      bottom: 8px;
      left: 8px;
      font-size: 1.25rem;
      animation: bounce 2s ease-in-out infinite;
    }

    .planet-mascot.crown::before {
      content: '👑';
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.75rem;
    }

    .planet-blue { --planet-glow: var(--planet-blue); }
    .planet-red { --planet-glow: var(--planet-red); }
    .planet-purple { --planet-glow: var(--planet-purple); }
    .planet-gold { --planet-glow: var(--star-gold); }

    .planet-widget::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 30% 30%, var(--planet-glow), transparent 70%);
      opacity: 0.2;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    /* ========== CONSOLE WIDGETS ========== */
    .console-widget {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
    }

    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .console-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .console-title h2 {
      font-size: 1.1rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }

    .console-icon {
      font-size: 1.5rem;
    }

    .console-link {
      color: var(--glow-cyan);
      font-size: 0.85rem;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.2s;
    }

    .console-link:hover {
      color: white;
    }

    .console-body {
      padding: 16px;
    }

    /* ========== TASK LIST ========== */
    .task-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .task-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05));
      border-radius: 16px;
      border: 1px solid rgba(239,68,68,0.3);
      position: relative;
      animation: task-glow 2s ease-in-out infinite;
    }

    @keyframes task-glow {
      0%, 100% { box-shadow: 0 0 10px rgba(239,68,68,0.3); }
      50% { box-shadow: 0 0 25px rgba(239,68,68,0.5); }
    }

    .task-robot {
      font-size: 1.5rem;
      animation: robot-work 1s ease-in-out infinite;
    }

    @keyframes robot-work {
      0%, 100% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
    }

    .task-checkbox {
      width: 32px;
      height: 32px;
      border: 2px solid var(--star-gold);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .star-check {
      font-size: 1rem;
      opacity: 0.3;
    }

    .task-content {
      flex: 1;
      min-width: 0;
    }

    .task-title {
      color: white;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .task-assignee {
      color: rgba(255,255,255,0.6);
      font-size: 0.8rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .avatar-mini {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--planet-purple);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: white;
    }

    .task-reward {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--star-gold);
      font-weight: 700;
      font-size: 1rem;
    }

    .coin-glow {
      animation: coin-pulse 1.5s ease-in-out infinite;
    }

    @keyframes coin-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }

    .task-priority {
      display: flex;
      gap: 2px;
    }

    .priority-star {
      font-size: 0.7rem;
      opacity: 0.3;
    }

    .priority-star.active {
      opacity: 1;
      animation: star-shine 1s ease-in-out infinite;
    }

    @keyframes star-shine {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.5); }
    }

    /* ========== EMPTY STATES ========== */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }

    .empty-state.small {
      padding: 24px 16px;
    }

    .empty-rocket {
      font-size: 4rem;
      animation: rocket-fly 2s ease-in-out infinite;
    }

    @keyframes rocket-fly {
      0%, 100% { transform: translateY(0) rotate(-10deg); }
      50% { transform: translateY(-15px) rotate(10deg); }
    }

    .empty-text {
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 16px 0 8px;
    }

    .empty-subtext {
      color: rgba(255,255,255,0.5);
      font-size: 0.9rem;
      margin: 0;
    }

    .empty-icon {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 12px;
    }

    .chinchilla-celebrate, .chinchilla-shop {
      font-size: 2rem;
      margin-top: 16px;
      animation: bounce 1.5s ease-in-out infinite;
    }

    /* ========== POINTS WIDGET ========== */
    .points-widget .console-body {
      padding: 24px;
    }

    .points-display {
      text-align: center;
      position: relative;
      margin-bottom: 24px;
    }

    .points-orb {
      width: 120px;
      height: 120px;
      margin: 0 auto;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, var(--star-gold), #b45309);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 0 40px rgba(251,191,36,0.5);
      animation: orb-glow 3s ease-in-out infinite;
    }

    .orb-glow {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(251,191,36,0.3), transparent);
      animation: pulse-glow 2s ease-in-out infinite;
    }

    @keyframes orb-glow {
      0%, 100% { box-shadow: 0 0 40px rgba(251,191,36,0.5); }
      50% { box-shadow: 0 0 60px rgba(251,191,36,0.8); }
    }

    @keyframes pulse-glow {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.2); opacity: 0.8; }
    }

    .points-value {
      font-size: 2rem;
      font-weight: 800;
      color: white;
      text-shadow: 0 2px 10px rgba(0,0,0,0.3);
      position: relative;
      z-index: 1;
    }

    .points-label {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.8);
      position: relative;
      z-index: 1;
    }

    .chinchilla-king {
      position: absolute;
      bottom: 0;
      right: 20%;
      font-size: 2rem;
    }

    .crown-icon {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 1.2rem;
      animation: crown-bounce 2s ease-in-out infinite;
    }

    @keyframes crown-bounce {
      0%, 100% { transform: translateX(-50%) translateY(0); }
      50% { transform: translateX(-50%) translateY(-5px); }
    }

    .points-breakdown {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .member-points {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
    }

    .member-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--planet-purple);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .member-name {
      flex: 1;
      color: rgba(255,255,255,0.8);
      font-size: 0.9rem;
    }

    .member-coins {
      color: var(--star-gold);
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .star-mini {
      font-size: 0.8rem;
    }

    /* ========== EVENTS LIST ========== */
    .events-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .event-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      transition: background 0.2s;
    }

    .event-card:hover {
      background: rgba(255,255,255,0.1);
    }

    .event-planet {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--planet-blue), #1e40af);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      box-shadow: 0 0 15px rgba(59,130,246,0.4);
    }

    .event-planet.pink {
      background: linear-gradient(135deg, var(--nebula-pink), #9d174d);
      box-shadow: 0 0 15px rgba(219,39,119,0.4);
    }

    .event-planet.green {
      background: linear-gradient(135deg, var(--planet-green), #047857);
      box-shadow: 0 0 15px rgba(16,185,129,0.4);
    }

    .event-content {
      flex: 1;
    }

    .event-title {
      color: white;
      font-weight: 600;
      margin: 0 0 4px 0;
      font-size: 0.95rem;
    }

    .event-date {
      color: rgba(255,255,255,0.5);
      font-size: 0.8rem;
      margin: 0;
    }

    .event-avatar {
      font-size: 1.5rem;
    }

    /* ========== REWARDS LIST ========== */
    .rewards-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .reward-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05));
      border-radius: 12px;
      border: 1px solid rgba(139,92,246,0.2);
    }

    .reward-pedestal {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--planet-purple), #5b21b6);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      box-shadow: 0 4px 15px rgba(139,92,246,0.4);
    }

    .reward-content {
      flex: 1;
    }

    .reward-name {
      color: white;
      font-weight: 600;
      margin: 0 0 2px 0;
    }

    .reward-user {
      color: rgba(255,255,255,0.5);
      font-size: 0.8rem;
      margin: 0;
    }

    .reward-cost {
      color: var(--star-gold);
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ========== FAMILY PORTRAIT ========== */
    .family-portrait {
      margin-bottom: 24px;
    }

    .portrait-frame {
      background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 2px solid rgba(255,255,255,0.1);
      padding: 24px;
      text-align: center;
    }

    .portrait-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .portrait-header h2 {
      color: white;
      font-size: 1.3rem;
      margin: 0;
    }

    .portrait-star {
      font-size: 1.5rem;
      animation: twinkle 2s ease-in-out infinite;
    }

    .portrait-members {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    .portrait-member {
      text-align: center;
    }

    .member-planet {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 8px;
      position: relative;
      box-shadow: 0 0 25px rgba(255,255,255,0.2);
    }

    .member-planet.parent {
      background: linear-gradient(135deg, var(--planet-blue), #1e40af);
    }

    .member-planet.child {
      background: linear-gradient(135deg, var(--planet-purple), #5b21b6);
    }

    .member-initial {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
    }

    .member-chinchilla {
      position: absolute;
      bottom: -5px;
      right: -5px;
      font-size: 1.2rem;
      animation: bounce 2s ease-in-out infinite;
    }

    .member-label {
      color: white;
      font-weight: 500;
      margin: 0 0 4px 0;
      font-size: 0.9rem;
    }

    .member-stars {
      color: var(--star-gold);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .portrait-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--glow-cyan);
      text-decoration: none;
      font-weight: 500;
      padding: 8px 16px;
      border: 1px solid var(--glow-cyan);
      border-radius: 20px;
      transition: all 0.2s;
    }

    .portrait-link:hover {
      background: var(--glow-cyan);
      color: var(--space-dark);
    }

    /* ========== ROCKET PROGRESS ========== */
    .rocket-progress {
      margin-bottom: 24px;
      padding: 20px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .progress-track {
      position: relative;
      height: 40px;
      background: linear-gradient(90deg,
        rgba(139,92,246,0.3),
        rgba(59,130,246,0.3),
        rgba(16,185,129,0.3),
        rgba(251,191,36,0.3));
      border-radius: 20px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    .progress-stars {
      position: absolute;
      top: 50%;
      left: 5%;
      right: 5%;
      transform: translateY(-50%);
      display: flex;
      justify-content: space-between;
    }

    .track-star {
      font-size: 1.2rem;
      opacity: 0.3;
      transition: all 0.3s;
    }

    .track-star.passed {
      opacity: 1;
      animation: star-shine 1s ease-in-out infinite;
    }

    .rocket-container {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      transition: left 0.5s ease-out;
    }

    .rocket-trail {
      position: absolute;
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      width: 60px;
      height: 8px;
      background: linear-gradient(90deg, transparent, rgba(251,191,36,0.8), rgba(249,115,22,0.8));
      border-radius: 4px;
      filter: blur(3px);
    }

    .rocket-icon {
      font-size: 2rem;
      display: block;
      animation: rocket-wobble 0.5s ease-in-out infinite;
    }

    @keyframes rocket-wobble {
      0%, 100% { transform: rotate(-5deg); }
      50% { transform: rotate(5deg); }
    }

    .progress-label {
      text-align: center;
      color: rgba(255,255,255,0.7);
      font-size: 0.9rem;
      margin: 0;
    }

    /* ========== QUICK ACTIONS ========== */
    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    @media (min-width: 768px) {
      .quick-actions {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .action-button {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 16px;
      border-radius: 20px;
      text-decoration: none;
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
    }

    .action-button:hover {
      transform: translateY(-5px);
    }

    .action-button.blue {
      background: linear-gradient(135deg, var(--planet-blue), #1e40af);
      box-shadow: 0 10px 30px rgba(59,130,246,0.4);
    }

    .action-button.purple {
      background: linear-gradient(135deg, var(--planet-purple), #5b21b6);
      box-shadow: 0 10px 30px rgba(139,92,246,0.4);
    }

    .action-button.teal {
      background: linear-gradient(135deg, var(--planet-green), #047857);
      box-shadow: 0 10px 30px rgba(16,185,129,0.4);
    }

    .action-button.orange {
      background: linear-gradient(135deg, var(--planet-orange), #c2410c);
      box-shadow: 0 10px 30px rgba(249,115,22,0.4);
    }

    .action-icon {
      font-size: 2rem;
    }

    .action-label {
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .action-robot {
      position: absolute;
      bottom: 8px;
      left: 8px;
      font-size: 1rem;
      opacity: 0.5;
    }

    /* ========== ACTIVITY FEED ========== */
    .activity-feed {
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      padding: 16px;
      margin-bottom: 24px;
    }

    .feed-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 12px 0;
    }

    .feed-scroll {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .feed-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
    }

    .feed-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
    }

    .feed-icon.green { background: rgba(16,185,129,0.2); }
    .feed-icon.purple { background: rgba(139,92,246,0.2); }
    .feed-icon.blue { background: rgba(59,130,246,0.2); }

    .feed-text {
      flex: 1;
      color: rgba(255,255,255,0.8);
      font-size: 0.85rem;
    }

    .feed-coins {
      color: var(--star-gold);
      font-weight: 600;
      font-size: 0.85rem;
    }

    .feed-time {
      color: rgba(255,255,255,0.4);
      font-size: 0.75rem;
    }

    /* ========== CONNECTION STATUS ========== */
    .connection-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: rgba(239,68,68,0.2);
      border-radius: 20px;
      border: 1px solid rgba(239,68,68,0.3);
    }

    .connection-status.online {
      background: rgba(16,185,129,0.2);
      border-color: rgba(16,185,129,0.3);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--planet-red);
      animation: pulse 2s infinite;
    }

    .connection-status.online .status-dot {
      background: var(--planet-green);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .status-text {
      color: rgba(255,255,255,0.8);
      font-size: 0.85rem;
    }

    .status-icon {
      font-size: 1rem;
    }
  `],
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

  totalFamilyCoins = 0;
  progressPercent = 65; // TODO: Calculate from actual data

  constructor() {
    this.tasksStore.loadTasks();
    this.householdStore.loadHousehold();
    this.rewardsStore.loadRedemptions();

    // Calculate total family coins
    this.members$.subscribe(members => {
      this.totalFamilyCoins = members.reduce((sum, m) => sum + (m.famCoins || 0), 0);
    });
  }

  getMemberColor(role: string): string {
    return role === 'ADULT' ? 'parent' : 'child';
  }
}
