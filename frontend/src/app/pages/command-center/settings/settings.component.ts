import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6" dir="rtl">
      <!-- Header -->
      <header class="mb-8">
        <h1 class="text-3xl font-bold text-adult-dark">הגדרות</h1>
        <p class="text-gray-600">נהל את המשפחה והחשבון שלך</p>
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Household Settings -->
        <section class="bg-white rounded-2xl shadow-sm p-6">
          <h2 class="text-xl font-bold text-adult-dark mb-6 flex items-center gap-2">
            <span class="text-2xl">🏠</span> הגדרות משפחה
          </h2>

          <div class="space-y-4">
            <!-- Household Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">שם המשפחה</label>
              <input
                type="text"
                [(ngModel)]="householdName"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary focus:ring-2 focus:ring-adult-primary/20 outline-none"
                placeholder="המשפחה שלנו"
              />
            </div>

            <!-- Invite Code -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">קוד הזמנה</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  [value]="(household$ | async)?.inviteCode || 'טוען...'"
                  readonly
                  class="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-mono"
                />
                <button
                  (click)="copyInviteCode()"
                  class="px-4 py-3 rounded-xl bg-adult-primary text-white hover:bg-adult-dark transition-colors"
                >
                  {{ copied ? '✓ הועתק!' : '📋 העתק' }}
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">שתף קוד זה עם בני משפחה כדי שיצטרפו</p>
            </div>

            <!-- Generate New Code -->
            <button
              (click)="generateNewCode()"
              class="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:border-adult-primary hover:text-adult-primary transition-colors"
            >
              🔄 צור קוד הזמנה חדש
            </button>
          </div>
        </section>

        <!-- Notification Settings -->
        <section class="bg-white rounded-2xl shadow-sm p-6">
          <h2 class="text-xl font-bold text-adult-dark mb-6 flex items-center gap-2">
            <span class="text-2xl">🔔</span> התראות
          </h2>

          <div class="space-y-4">
            <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
              <div>
                <p class="font-medium text-gray-800">משימות שהושלמו</p>
                <p class="text-sm text-gray-500">קבל התראה כשילד משלים משימה</p>
              </div>
              <input
                type="checkbox"
                [(ngModel)]="notifications.taskCompleted"
                class="w-5 h-5 rounded text-adult-primary focus:ring-adult-primary"
              />
            </label>

            <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
              <div>
                <p class="font-medium text-gray-800">בקשות פרסים</p>
                <p class="text-sm text-gray-500">קבל התראה כשילד מבקש פרס</p>
              </div>
              <input
                type="checkbox"
                [(ngModel)]="notifications.rewardRequested"
                class="w-5 h-5 rounded text-adult-primary focus:ring-adult-primary"
              />
            </label>

            <label class="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
              <div>
                <p class="font-medium text-gray-800">תזכורות יומיות</p>
                <p class="text-sm text-gray-500">תזכורת על משימות שלא הושלמו</p>
              </div>
              <input
                type="checkbox"
                [(ngModel)]="notifications.dailyReminder"
                class="w-5 h-5 rounded text-adult-primary focus:ring-adult-primary"
              />
            </label>
          </div>
        </section>

        <!-- Account Settings -->
        <section class="bg-white rounded-2xl shadow-sm p-6">
          <h2 class="text-xl font-bold text-adult-dark mb-6 flex items-center gap-2">
            <span class="text-2xl">👤</span> החשבון שלי
          </h2>

          <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4">
            <div class="w-16 h-16 rounded-full bg-adult-primary flex items-center justify-center text-white text-2xl font-bold">
              {{ (user$ | async)?.name?.charAt(0) || '?' }}
            </div>
            <div>
              <p class="font-bold text-gray-800 text-lg">{{ (user$ | async)?.name }}</p>
              <p class="text-gray-500">{{ (user$ | async)?.email }}</p>
              <span class="inline-block mt-1 px-2 py-0.5 bg-adult-primary/10 text-adult-primary text-xs rounded-full font-medium">
                {{ (user$ | async)?.role === 'ADULT' ? 'הורה' : 'ילד' }}
              </span>
            </div>
          </div>

          <div class="space-y-3">
            <button class="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-right flex items-center gap-3">
              <span>✏️</span> ערוך פרופיל
            </button>
            <button class="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-right flex items-center gap-3">
              <span>🔒</span> פרטיות ואבטחה
            </button>
          </div>
        </section>

        <!-- App Settings -->
        <section class="bg-white rounded-2xl shadow-sm p-6">
          <h2 class="text-xl font-bold text-adult-dark mb-6 flex items-center gap-2">
            <span class="text-2xl">⚙️</span> הגדרות אפליקציה
          </h2>

          <div class="space-y-4">
            <!-- Language -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">שפה</label>
              <select
                [(ngModel)]="language"
                class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-primary outline-none bg-white"
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
              </select>
            </div>

            <!-- Theme -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">ערכת נושא</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  (click)="theme = 'light'"
                  class="p-3 rounded-xl border-2 text-center transition-all"
                  [class.border-adult-primary]="theme === 'light'"
                  [class.bg-adult-primary/10]="theme === 'light'"
                  [class.border-gray-200]="theme !== 'light'"
                >
                  <span class="text-2xl">☀️</span>
                  <p class="text-xs mt-1">בהיר</p>
                </button>
                <button
                  (click)="theme = 'dark'"
                  class="p-3 rounded-xl border-2 text-center transition-all"
                  [class.border-adult-primary]="theme === 'dark'"
                  [class.bg-adult-primary/10]="theme === 'dark'"
                  [class.border-gray-200]="theme !== 'dark'"
                >
                  <span class="text-2xl">🌙</span>
                  <p class="text-xs mt-1">כהה</p>
                </button>
                <button
                  (click)="theme = 'auto'"
                  class="p-3 rounded-xl border-2 text-center transition-all"
                  [class.border-adult-primary]="theme === 'auto'"
                  [class.bg-adult-primary/10]="theme === 'auto'"
                  [class.border-gray-200]="theme !== 'auto'"
                >
                  <span class="text-2xl">🔄</span>
                  <p class="text-xs mt-1">אוטומטי</p>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="bg-white rounded-2xl shadow-sm p-6 lg:col-span-2">
          <h2 class="text-xl font-bold text-red-600 mb-6 flex items-center gap-2">
            <span class="text-2xl">⚠️</span> אזור מסוכן
          </h2>

          <div class="flex flex-wrap gap-4">
            <button
              (click)="logout()"
              class="px-6 py-3 rounded-xl bg-red-100 text-red-600 font-semibold hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <span>🚪</span> התנתק
            </button>
            <button
              class="px-6 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <span>🗑️</span> מחק חשבון
            </button>
          </div>
        </section>
      </div>

      <!-- Save Button -->
      <div class="fixed bottom-6 left-6 right-6 lg:right-auto lg:left-auto lg:bottom-8">
        <button
          (click)="saveSettings()"
          class="w-full lg:w-auto px-8 py-4 rounded-2xl bg-adult-primary text-white font-bold text-lg shadow-lg hover:bg-adult-dark transition-colors flex items-center justify-center gap-2"
        >
          <span>💾</span> שמור שינויים
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly authService = inject(AuthService);

  user$ = this.authService.user$;
  household$ = this.authService.household$;

  householdName = '';
  copied = false;
  language = 'he';
  theme: 'light' | 'dark' | 'auto' = 'light';

  notifications = {
    taskCompleted: true,
    rewardRequested: true,
    dailyReminder: false
  };

  constructor() {
    this.household$.subscribe(h => {
      if (h) this.householdName = h.name;
    });
  }

  copyInviteCode(): void {
    this.household$.subscribe(h => {
      if (h?.inviteCode) {
        navigator.clipboard.writeText(h.inviteCode);
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      }
    }).unsubscribe();
  }

  generateNewCode(): void {
    // TODO: Call API to generate new invite code
    console.log('Generating new invite code...');
  }

  saveSettings(): void {
    // TODO: Save settings to backend
    console.log('Saving settings...', {
      householdName: this.householdName,
      notifications: this.notifications,
      language: this.language,
      theme: this.theme
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
