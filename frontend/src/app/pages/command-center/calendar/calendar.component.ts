import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, map } from 'rxjs';
import { TasksStore } from '../../../core/stores';
import { ThemeService, UITheme } from '../../../core/services';

type EventCategory = 'SCHOOL' | 'WORK' | 'FAMILY' | 'MEDICAL' | 'ACTIVITY' | 'TASK';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  category: EventCategory;
  color: string;
  assignee?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="calendar-page" dir="rtl">
      <!-- Animated Space Background -->
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

      <!-- Header Panel -->
      <header class="header-panel">
        <div class="header-content">
          <div class="header-title">
            <span class="header-icon">📅</span>
            <div>
              <h1>לוח השנה הקוסמי</h1>
              <p>מרכז המשפחה שלי</p>
            </div>
          </div>
          <div class="header-mascots">
            <span class="mascot chinchilla">🐹</span>
            <span class="mascot robot">🤖</span>
          </div>
        </div>
        <button class="add-event-btn" (click)="openEventModal()">
          <span>✨</span> אירוע חדש
        </button>
      </header>

      <!-- Month Navigation -->
      <div class="month-nav">
        <button class="nav-planet prev" (click)="previousMonth()">
          <span class="planet-icon">🪐</span>
          <span class="arrow">→</span>
        </button>
        <div class="current-month">
          <span class="month-star">⭐</span>
          <h2>{{ currentMonthName }} {{ currentYear }}</h2>
          <span class="month-star">⭐</span>
        </div>
        <button class="nav-planet next" (click)="nextMonth()">
          <span class="arrow">←</span>
          <span class="planet-icon">🪐</span>
        </button>
      </div>

      <!-- Calendar Grid -->
      <div class="calendar-container">
        <!-- Days of Week Header -->
        <div class="weekdays-header">
          @for (day of hebrewDays; track day; let i = $index) {
            <div class="weekday" [class.shabbat]="i === 6">
              <span class="star-icon">{{ i === 6 ? '✡️' : '⋆' }}</span>
              {{ day }}
            </div>
          }
        </div>

        <!-- Calendar Days Grid -->
        <div class="days-grid">
          @for (day of calendarDays$ | async; track day.date.toISOString()) {
            <div
              class="day-card"
              [class.other-month]="!day.isCurrentMonth"
              [class.today]="day.isToday"
              [class.has-events]="day.events.length > 0"
              (click)="openEventModal(day.date)"
            >
              <!-- Day Number as Planet -->
              <div class="day-number" [class.sun]="day.isToday">
                @if (day.isToday) {
                  <span class="sun-glow"></span>
                }
                {{ day.date.getDate() }}
              </div>

              <!-- Events -->
              <div class="day-events">
                @for (event of day.events.slice(0, 2); track event.id) {
                  <div
                    class="event-chip"
                    [style.--event-color]="event.color"
                    (click)="editEvent(event, $event)"
                  >
                    <span class="event-icon">{{ getCategoryIcon(event.category) }}</span>
                    <span class="event-title">{{ event.title }}</span>
                  </div>
                }
                @if (day.events.length > 2) {
                  <div class="more-events">
                    +{{ day.events.length - 2 }} 🐹
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Rainbow Rocket Progress -->
      <div class="progress-track">
        <div class="track-line"></div>
        <div class="rocket-container" [style.left]="getRocketPosition() + '%'">
          <span class="rocket">🚀</span>
          <div class="rainbow-trail"></div>
        </div>
        <div class="track-stars">
          @for (i of [1,2,3,4]; track i) {
            <span class="track-star" [style.left]="i * 25 + '%'">⭐</span>
          }
        </div>
      </div>

      <!-- Upcoming Events Panel -->
      <div class="upcoming-panel">
        <div class="panel-header">
          <span class="panel-icon">🛸</span>
          <h3>אירועים קרובים</h3>
          <span class="chinchilla-guide">🐹</span>
        </div>

        <div class="events-list">
          @if ((upcomingEvents$ | async)?.length) {
            @for (event of upcomingEvents$ | async; track event.id) {
              <div class="event-card" [style.--event-color]="event.color">
                <div class="event-planet">
                  <span>{{ getCategoryIcon(event.category) }}</span>
                </div>
                <div class="event-details">
                  <h4>{{ event.title }}</h4>
                  <p>
                    <span class="event-date">{{ event.date | date:'EEEE, d בMMM' }}</span>
                    @if (event.time) {
                      <span class="event-time">🕐 {{ event.time }}</span>
                    }
                  </p>
                </div>
                <div class="event-mascot">
                  {{ ['🐹', '🤖'][($index % 2)] }}
                </div>
              </div>
            }
          } @else {
            <div class="empty-state">
              <span class="empty-icon">🌙</span>
              <p>אין אירועים קרובים</p>
              <span class="sleeping-chinchilla">😴🐹</span>
            </div>
          }
        </div>
      </div>

      <!-- Event Modal -->
      @if (showModal) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <span class="modal-icon">{{ editingEvent ? '✏️' : '✨' }}</span>
              <h2>{{ editingEvent ? 'עריכת אירוע' : 'אירוע חדש' }}</h2>
              <span class="modal-mascot">🐹</span>
            </div>

            <form (ngSubmit)="saveEvent()" class="modal-form">
              <!-- Title -->
              <div class="form-group">
                <label>
                  <span class="label-icon">📝</span>
                  כותרת האירוע
                </label>
                <input
                  type="text"
                  [(ngModel)]="eventForm.title"
                  name="title"
                  required
                  placeholder="למשל: ישיבת הורים בבית הספר"
                  class="cosmic-input"
                />
              </div>

              <!-- Date & Time -->
              <div class="form-row">
                <div class="form-group">
                  <label>
                    <span class="label-icon">📅</span>
                    תאריך
                  </label>
                  <input
                    type="date"
                    [(ngModel)]="eventForm.date"
                    name="date"
                    required
                    class="cosmic-input"
                  />
                </div>
                <div class="form-group">
                  <label>
                    <span class="label-icon">🕐</span>
                    שעה
                  </label>
                  <input
                    type="time"
                    [(ngModel)]="eventForm.time"
                    name="time"
                    class="cosmic-input"
                  />
                </div>
              </div>

              <!-- Category -->
              <div class="form-group">
                <label>
                  <span class="label-icon">🏷️</span>
                  קטגוריה
                </label>
                <div class="category-grid">
                  @for (cat of categories; track cat.value) {
                    <button
                      type="button"
                      class="category-btn"
                      [class.selected]="eventForm.category === cat.value"
                      [style.--cat-color]="cat.color"
                      (click)="setCategory(cat.value)"
                    >
                      <span class="cat-icon">{{ cat.icon }}</span>
                      <span class="cat-label">{{ cat.label }}</span>
                    </button>
                  }
                </div>
              </div>

              <!-- Actions -->
              <div class="modal-actions">
                @if (editingEvent) {
                  <button type="button" class="btn-delete" (click)="deleteEvent()">
                    <span>🗑️</span> מחק
                  </button>
                }
                <button type="button" class="btn-cancel" (click)="closeModal()">
                  ביטול
                </button>
                <button type="submit" class="btn-save">
                  <span>{{ editingEvent ? '💾' : '✨' }}</span>
                  {{ editingEvent ? 'שמור' : 'צור אירוע' }}
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

    .calendar-page {
      min-height: 100vh;
      padding: 24px;
      position: relative;
      overflow: hidden;
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
        radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.9), transparent),
        radial-gradient(1px 1px at 230px 80px, white, transparent);
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
      animation-delay: 0.5s;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .add-event-btn {
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

    .add-event-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 40px rgba(107, 33, 168, 0.5);
    }

    /* Month Navigation */
    .month-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 32px;
      margin-bottom: 24px;
    }

    .nav-planet {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(30, 20, 50, 0.6);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      color: white;
      cursor: pointer;
      transition: all 0.3s;
    }

    .nav-planet:hover {
      background: rgba(107, 33, 168, 0.4);
      transform: scale(1.05);
    }

    .planet-icon {
      font-size: 1.5rem;
    }

    .arrow {
      font-size: 1.25rem;
    }

    .current-month {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 32px;
      background: rgba(30, 20, 50, 0.8);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .current-month h2 {
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .month-star {
      font-size: 1.25rem;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(0.9); }
    }

    /* Calendar Container */
    .calendar-container {
      background: rgba(30, 20, 50, 0.7);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
      margin-bottom: 24px;
    }

    /* Weekdays Header */
    .weekdays-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: rgba(107, 33, 168, 0.3);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .weekday {
      padding: 16px 8px;
      text-align: center;
      color: rgba(255,255,255,0.8);
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .weekday.shabbat {
      color: #fbbf24;
    }

    .star-icon {
      font-size: 0.7rem;
      opacity: 0.6;
    }

    /* Days Grid */
    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
    }

    .day-card {
      min-height: 100px;
      padding: 8px;
      border-left: 1px solid rgba(255,255,255,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .day-card:hover {
      background: rgba(107, 33, 168, 0.2);
    }

    .day-card.other-month {
      opacity: 0.4;
    }

    .day-card.today {
      background: rgba(251, 191, 36, 0.1);
    }

    .day-card.has-events {
      background: rgba(107, 33, 168, 0.1);
    }

    /* Day Number */
    .day-number {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-weight: 600;
      color: white;
      font-size: 0.9rem;
      margin-bottom: 8px;
      position: relative;
    }

    .day-number.sun {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
    }

    .sun-glow {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent);
      animation: glow 2s ease-in-out infinite;
    }

    @keyframes glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    /* Day Events */
    .day-events {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .event-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      font-size: 0.7rem;
      color: white;
      border-right: 3px solid var(--event-color);
      transition: all 0.2s;
    }

    .event-chip:hover {
      background: rgba(255,255,255,0.2);
      transform: translateX(-2px);
    }

    .event-icon {
      font-size: 0.8rem;
    }

    .event-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .more-events {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.6);
      text-align: center;
      padding: 2px;
    }

    /* Progress Track */
    .progress-track {
      position: relative;
      height: 60px;
      margin-bottom: 24px;
      padding: 0 20px;
    }

    .track-line {
      position: absolute;
      top: 50%;
      left: 20px;
      right: 20px;
      height: 8px;
      background: linear-gradient(90deg,
        rgba(107, 33, 168, 0.3),
        rgba(219, 39, 119, 0.3),
        rgba(251, 191, 36, 0.3)
      );
      border-radius: 4px;
      transform: translateY(-50%);
    }

    .rocket-container {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      transition: left 0.5s ease-out;
    }

    .rocket {
      font-size: 2rem;
      display: block;
      animation: rocketFloat 2s ease-in-out infinite;
    }

    @keyframes rocketFloat {
      0%, 100% { transform: translateY(0) rotate(-10deg); }
      50% { transform: translateY(-5px) rotate(-10deg); }
    }

    .rainbow-trail {
      position: absolute;
      right: 100%;
      top: 50%;
      width: 60px;
      height: 6px;
      background: linear-gradient(90deg,
        transparent,
        #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6
      );
      border-radius: 3px;
      transform: translateY(-50%);
      opacity: 0.8;
    }

    .track-stars {
      position: absolute;
      inset: 0;
    }

    .track-star {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.25rem;
      animation: pulse 2s ease-in-out infinite;
    }

    /* Upcoming Events Panel */
    .upcoming-panel {
      background: rgba(30, 20, 50, 0.8);
      backdrop-filter: blur(12px);
      border-radius: 24px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .panel-icon {
      font-size: 1.75rem;
    }

    .panel-header h3 {
      flex: 1;
      color: white;
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    .chinchilla-guide {
      font-size: 1.5rem;
      animation: bounce 2s ease-in-out infinite;
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .event-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.1);
      transition: all 0.2s;
    }

    .event-card:hover {
      background: rgba(255,255,255,0.1);
      transform: translateX(-4px);
    }

    .event-planet {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--event-color), rgba(255,255,255,0.2));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 0 20px rgba(var(--event-color), 0.3);
    }

    .event-details {
      flex: 1;
    }

    .event-details h4 {
      color: white;
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px;
    }

    .event-details p {
      color: rgba(255,255,255,0.6);
      font-size: 0.85rem;
      margin: 0;
      display: flex;
      gap: 12px;
    }

    .event-mascot {
      font-size: 1.5rem;
      animation: float 3s ease-in-out infinite;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
    }

    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 12px;
    }

    .empty-state p {
      color: rgba(255,255,255,0.5);
      margin-bottom: 8px;
    }

    .sleeping-chinchilla {
      font-size: 1.5rem;
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
      max-width: 500px;
      background: linear-gradient(135deg, #1a0a2e, #0a1a2e);
      border-radius: 24px;
      border: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .category-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 8px;
      background: rgba(255,255,255,0.05);
      border: 2px solid transparent;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .category-btn:hover {
      background: rgba(255,255,255,0.1);
    }

    .category-btn.selected {
      border-color: var(--cat-color);
      background: rgba(255,255,255,0.1);
      box-shadow: 0 0 20px rgba(var(--cat-color), 0.3);
    }

    .cat-icon {
      font-size: 1.75rem;
    }

    .cat-label {
      color: rgba(255,255,255,0.8);
      font-size: 0.8rem;
      font-weight: 600;
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

    .btn-delete {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 14px 20px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 14px;
      color: #ef4444;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-delete:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .calendar-page {
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

      .month-nav {
        gap: 16px;
      }

      .current-month {
        padding: 12px 20px;
      }

      .current-month h2 {
        font-size: 1.25rem;
      }

      .day-card {
        min-height: 70px;
        padding: 4px;
      }

      .day-number {
        width: 24px;
        height: 24px;
        font-size: 0.75rem;
      }

      .event-chip {
        padding: 2px 4px;
        font-size: 0.6rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .category-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent {
  private readonly tasksStore = inject(TasksStore);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  currentTheme: UITheme = this.themeService.getCurrentTheme();

  hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  constructor() {
    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });
  }

  isUnicornTheme(): boolean {
    return this.currentTheme.id === 'candy' || this.currentTheme.id === 'princess';
  }

  hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  categories = [
    { value: 'SCHOOL' as const, label: 'לימודים', icon: '📚', color: '#8B5CF6' },
    { value: 'WORK' as const, label: 'עבודה', icon: '💼', color: '#3B82F6' },
    { value: 'FAMILY' as const, label: 'משפחה', icon: '👨‍👩‍👧', color: '#EC4899' },
    { value: 'MEDICAL' as const, label: 'רפואי', icon: '🏥', color: '#EF4444' },
    { value: 'ACTIVITY' as const, label: 'פעילות', icon: '⚽', color: '#10B981' },
    { value: 'TASK' as const, label: 'משימה', icon: '✅', color: '#F59E0B' }
  ];

  currentDate = new Date();
  currentYear = this.currentDate.getFullYear();
  currentMonth = this.currentDate.getMonth();

  private readonly events$ = new BehaviorSubject<CalendarEvent[]>([
    {
      id: '1',
      title: 'ישיבת הורים',
      date: new Date(this.currentYear, this.currentMonth, 15),
      time: '18:00',
      category: 'SCHOOL',
      color: '#8B5CF6'
    },
    {
      id: '2',
      title: 'יום הולדת סבתא',
      date: new Date(this.currentYear, this.currentMonth, 20),
      time: '14:00',
      category: 'FAMILY',
      color: '#EC4899'
    },
    {
      id: '3',
      title: 'בדיקה אצל רופא',
      date: new Date(this.currentYear, this.currentMonth, 10),
      time: '10:30',
      category: 'MEDICAL',
      color: '#EF4444'
    },
    {
      id: '4',
      title: 'אימון כדורגל',
      date: new Date(this.currentYear, this.currentMonth, 12),
      time: '16:00',
      category: 'ACTIVITY',
      color: '#10B981'
    }
  ]);

  calendarDays$ = this.events$.pipe(
    map(events => this.generateCalendarDays(events))
  );

  upcomingEvents$ = this.events$.pipe(
    map(events => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return events
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 5);
    })
  );

  showModal = false;
  editingEvent: CalendarEvent | null = null;
  eventForm = this.getEmptyForm();

  get currentMonthName(): string {
    return this.hebrewMonths[this.currentMonth];
  }

  getRocketPosition(): number {
    const today = new Date();
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    const currentDay = today.getMonth() === this.currentMonth ? today.getDate() : 0;
    return (currentDay / daysInMonth) * 100;
  }

  previousMonth(): void {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.events$.next(this.events$.value);
  }

  nextMonth(): void {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    this.events$.next(this.events$.value);
  }

  generateCalendarDays(events: CalendarEvent[]): CalendarDay[] {
    const days: CalendarDay[] = [];
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(this.currentYear, this.currentMonth - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: this.getEventsForDate(events, date)
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        events: this.getEventsForDate(events, date)
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: this.getEventsForDate(events, date)
      });
    }

    return days;
  }

  getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
    return events.filter(e => {
      const eventDate = new Date(e.date);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  }

  getCategoryIcon(category: string): string {
    return this.categories.find(c => c.value === category)?.icon || '📅';
  }

  openEventModal(date?: Date): void {
    this.editingEvent = null;
    this.eventForm = this.getEmptyForm();
    if (date) {
      this.eventForm.date = this.formatDateForInput(date);
    }
    this.showModal = true;
  }

  editEvent(event: CalendarEvent, e: Event): void {
    e.stopPropagation();
    this.editingEvent = event;
    this.eventForm = {
      title: event.title,
      date: this.formatDateForInput(event.date),
      time: event.time || '',
      category: event.category
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingEvent = null;
  }

  saveEvent(): void {
    if (!this.eventForm.title || !this.eventForm.date) return;

    const category = this.categories.find(c => c.value === this.eventForm.category);
    const event: CalendarEvent = {
      id: this.editingEvent?.id || crypto.randomUUID(),
      title: this.eventForm.title,
      date: new Date(this.eventForm.date),
      time: this.eventForm.time || undefined,
      category: this.eventForm.category,
      color: category?.color || '#6B7280'
    };

    const currentEvents = this.events$.value;
    if (this.editingEvent) {
      this.events$.next(currentEvents.map(e => e.id === event.id ? event : e));
    } else {
      this.events$.next([...currentEvents, event]);
    }

    this.closeModal();
  }

  deleteEvent(): void {
    if (!this.editingEvent) return;
    if (confirm('האם למחוק את האירוע?')) {
      this.events$.next(this.events$.value.filter(e => e.id !== this.editingEvent!.id));
      this.closeModal();
    }
  }

  setCategory(value: EventCategory): void {
    this.eventForm.category = value;
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getEmptyForm(): { title: string; date: string; time: string; category: EventCategory } {
    return {
      title: '',
      date: this.formatDateForInput(new Date()),
      time: '',
      category: 'FAMILY'
    };
  }
}
