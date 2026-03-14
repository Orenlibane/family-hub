import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, map } from 'rxjs';
import { TasksStore } from '../../../core/stores';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  category: 'SCHOOL' | 'WORK' | 'FAMILY' | 'MEDICAL' | 'ACTIVITY' | 'TASK';
  color: string;
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
    <div class="p-6" dir="rtl">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-adult-dark">לוח שנה משפחתי</h1>
          <p class="text-gray-600">נהל אירועים ומשימות משפחתיות</p>
        </div>
        <button
          (click)="openEventModal()"
          class="bg-adult-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-adult-dark transition-colors flex items-center gap-2"
        >
          <span>+</span> אירוע חדש
        </button>
      </header>

      <!-- Month Navigation -->
      <div class="bg-white rounded-2xl shadow-sm p-4 mb-6">
        <div class="flex items-center justify-between">
          <button
            (click)="previousMonth()"
            class="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <span class="text-2xl">→</span>
          </button>
          <h2 class="text-2xl font-bold text-adult-dark">
            {{ currentMonthName }} {{ currentYear }}
          </h2>
          <button
            (click)="nextMonth()"
            class="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <span class="text-2xl">←</span>
          </button>
        </div>
      </div>

      <!-- Calendar Grid -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <!-- Days of Week Header -->
        <div class="grid grid-cols-7 bg-gray-50 border-b">
          @for (day of hebrewDays; track day) {
            <div class="p-3 text-center font-semibold text-gray-600 text-sm">
              {{ day }}
            </div>
          }
        </div>

        <!-- Calendar Days -->
        <div class="grid grid-cols-7">
          @for (day of calendarDays$ | async; track day.date.toISOString()) {
            <div
              class="min-h-[120px] border-b border-l p-2 cursor-pointer hover:bg-gray-50 transition-colors"
              [class.bg-gray-100]="!day.isCurrentMonth"
              [class.bg-purple-50]="day.isToday"
              (click)="openEventModal(day.date)"
            >
              <div class="flex items-center justify-between mb-2">
                <span
                  class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
                  [class.bg-adult-primary]="day.isToday"
                  [class.text-white]="day.isToday"
                  [class.text-gray-400]="!day.isCurrentMonth"
                >
                  {{ day.date.getDate() }}
                </span>
              </div>
              <div class="space-y-1">
                @for (event of day.events.slice(0, 3); track event.id) {
                  <div
                    class="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                    [style.background-color]="event.color + '20'"
                    [style.color]="event.color"
                    [style.border-right]="'3px solid ' + event.color"
                    (click)="editEvent(event, $event)"
                  >
                    {{ event.title }}
                  </div>
                }
                @if (day.events.length > 3) {
                  <div class="text-xs text-gray-500 text-center">
                    +{{ day.events.length - 3 }} עוד
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Upcoming Events Sidebar -->
      <div class="mt-6 bg-white rounded-2xl shadow-sm p-6">
        <h3 class="text-xl font-bold text-adult-dark mb-4">אירועים קרובים</h3>
        @if ((upcomingEvents$ | async)?.length) {
          <div class="space-y-3">
            @for (event of upcomingEvents$ | async; track event.id) {
              <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div
                  class="w-3 h-12 rounded-full"
                  [style.background-color]="event.color"
                ></div>
                <div class="flex-1">
                  <p class="font-medium">{{ event.title }}</p>
                  <p class="text-sm text-gray-500">
                    {{ event.date | date:'EEEE, d בMMM' }}
                    @if (event.time) {
                      <span>בשעה {{ event.time }}</span>
                    }
                  </p>
                </div>
                <span class="text-2xl">{{ getCategoryIcon(event.category) }}</span>
              </div>
            }
          </div>
        } @else {
          <div class="text-center py-8 text-gray-400">
            <p class="text-4xl mb-2">📅</p>
            <p>אין אירועים קרובים</p>
          </div>
        }
      </div>

      <!-- Event Modal -->
      @if (showModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeModal()">
          <div class="bg-white rounded-2xl p-6 w-full max-w-md" dir="rtl" (click)="$event.stopPropagation()">
            <h2 class="text-2xl font-bold text-adult-dark mb-6">
              {{ editingEvent ? 'עריכת אירוע' : 'אירוע חדש' }}
            </h2>

            <form (ngSubmit)="saveEvent()" class="space-y-4">
              <!-- Title -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">כותרת *</label>
                <input
                  type="text"
                  [(ngModel)]="eventForm.title"
                  name="title"
                  required
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary focus:ring-2 focus:ring-adult-primary/20 outline-none"
                  placeholder="למשל: ישיבת הורים"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Date -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">תאריך *</label>
                  <input
                    type="date"
                    [(ngModel)]="eventForm.date"
                    name="date"
                    required
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary outline-none"
                  />
                </div>

                <!-- Time -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">שעה</label>
                  <input
                    type="time"
                    [(ngModel)]="eventForm.time"
                    name="time"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary outline-none"
                  />
                </div>
              </div>

              <!-- Category -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">קטגוריה</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (cat of categories; track cat.value) {
                    <button
                      type="button"
                      (click)="eventForm.category = cat.value"
                      class="p-3 rounded-xl border-2 text-center transition-all"
                      [class.border-adult-primary]="eventForm.category === cat.value"
                      [class.bg-adult-primary/10]="eventForm.category === cat.value"
                      [class.border-gray-200]="eventForm.category !== cat.value"
                    >
                      <div class="text-2xl mb-1">{{ cat.icon }}</div>
                      <div class="text-xs font-medium">{{ cat.label }}</div>
                    </button>
                  }
                </div>
              </div>

              <!-- Actions -->
              <div class="flex gap-3 pt-4">
                @if (editingEvent) {
                  <button
                    type="button"
                    (click)="deleteEvent()"
                    class="px-4 py-3 rounded-xl font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  >
                    מחק
                  </button>
                }
                <button
                  type="button"
                  (click)="closeModal()"
                  class="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  class="flex-1 px-6 py-3 rounded-xl font-semibold bg-adult-primary text-white hover:bg-adult-dark transition-colors"
                >
                  {{ editingEvent ? 'עדכן' : 'צור' }}
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
export class CalendarComponent {
  private readonly tasksStore = inject(TasksStore);

  // Hebrew day names (Sunday first for Israel)
  hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

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
    // Sample events
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

  // Modal state
  showModal = false;
  editingEvent: CalendarEvent | null = null;
  eventForm: {
    title: string;
    date: string;
    time: string;
    category: 'SCHOOL' | 'WORK' | 'FAMILY' | 'MEDICAL' | 'ACTIVITY' | 'TASK';
  } = this.getEmptyForm();

  get currentMonthName(): string {
    return this.hebrewMonths[this.currentMonth];
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

    // Get starting day of week (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();

    // Add days from previous month
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

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        events: this.getEventsForDate(events, date)
      });
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
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
    const cat = this.categories.find(c => c.value === category);
    return cat?.icon || '📅';
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

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getEmptyForm(): {
    title: string;
    date: string;
    time: string;
    category: 'SCHOOL' | 'WORK' | 'FAMILY' | 'MEDICAL' | 'ACTIVITY' | 'TASK';
  } {
    return {
      title: '',
      date: this.formatDateForInput(new Date()),
      time: '',
      category: 'FAMILY'
    };
  }
}
