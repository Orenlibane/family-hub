import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen relative overflow-hidden" dir="rtl">
      <!-- Animated Background -->
      <div class="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400">
        <!-- Floating Shapes -->
        <div class="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-20 right-10 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s"></div>
        <div class="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style="animation-delay: 2s"></div>
      </div>

      <!-- Floating Family Icons -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-[10%] left-[15%] text-6xl animate-bounce" style="animation-duration: 3s">👨‍👩‍👧‍👦</div>
        <div class="absolute top-[20%] right-[20%] text-5xl animate-bounce" style="animation-duration: 2.5s; animation-delay: 0.5s">🏠</div>
        <div class="absolute bottom-[25%] left-[10%] text-5xl animate-bounce" style="animation-duration: 2.8s; animation-delay: 1s">✨</div>
        <div class="absolute bottom-[15%] right-[15%] text-6xl animate-bounce" style="animation-duration: 3.2s; animation-delay: 0.3s">💝</div>
        <div class="absolute top-[40%] left-[5%] text-4xl animate-bounce" style="animation-duration: 2.6s; animation-delay: 0.7s">🌟</div>
        <div class="absolute top-[60%] right-[8%] text-4xl animate-bounce" style="animation-duration: 2.4s; animation-delay: 1.2s">🎯</div>
      </div>

      <!-- Main Content -->
      <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <!-- Logo Card -->
          <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 transform hover:scale-[1.02] transition-all duration-300">
            <!-- Logo -->
            <div class="text-center mb-8">
              <div class="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-lg mb-6 transform hover:rotate-6 transition-transform">
                <span class="text-5xl">👨‍👩‍👧</span>
              </div>
              <h1 class="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent mb-3">
                מארגן המשפחה שלנו
              </h1>
              <p class="text-gray-500 text-lg">
                ניהול משימות, תגמולים וכיף משפחתי
              </p>
            </div>

            <!-- Features -->
            <div class="grid grid-cols-3 gap-4 mb-8">
              <div class="text-center p-3 bg-purple-50 rounded-2xl">
                <div class="text-3xl mb-2">✅</div>
                <div class="text-xs text-purple-700 font-medium">משימות</div>
              </div>
              <div class="text-center p-3 bg-pink-50 rounded-2xl">
                <div class="text-3xl mb-2">🪙</div>
                <div class="text-xs text-pink-700 font-medium">מטבעות</div>
              </div>
              <div class="text-center p-3 bg-orange-50 rounded-2xl">
                <div class="text-3xl mb-2">🎁</div>
                <div class="text-xs text-orange-700 font-medium">פרסים</div>
              </div>
            </div>

            <!-- Login Tabs -->
            <div class="flex gap-2 mb-6">
              <button
                (click)="showKidLogin = false"
                class="flex-1 py-2 px-4 rounded-xl font-semibold transition-all"
                [class.bg-purple-600]="!showKidLogin"
                [class.text-white]="!showKidLogin"
                [class.text-gray-600]="showKidLogin"
              >
                👨‍👩‍👧 הורים
              </button>
              <button
                (click)="showKidLogin = true"
                class="flex-1 py-2 px-4 rounded-xl font-semibold transition-all"
                [class.bg-pink-500]="showKidLogin"
                [class.text-white]="showKidLogin"
                [class.text-gray-600]="!showKidLogin"
              >
                🧒 ילדים
              </button>
            </div>

            <!-- Adult Google Login -->
            @if (!showKidLogin) {
              <button
                (click)="loginWithGoogle()"
                class="w-full bg-white border-2 border-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-2xl
                       flex items-center justify-center gap-4 hover:border-purple-400 hover:shadow-lg
                       transform hover:-translate-y-1 transition-all duration-200 group"
              >
                <svg class="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span class="group-hover:text-purple-600 transition-colors">התחברות עם Google</span>
              </button>
            }

            <!-- Kid PIN Login -->
            @if (showKidLogin) {
              <form (ngSubmit)="loginWithPin()" class="space-y-4">
                <div>
                  <label class="block text-gray-700 font-medium mb-2">שם משתמש</label>
                  <input
                    type="text"
                    [(ngModel)]="kidLogin.username"
                    name="username"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none transition-colors text-lg text-gray-900"
                    placeholder="הכנס שם משתמש"
                    required
                  />
                </div>
                <div>
                  <label class="block text-gray-700 font-medium mb-2">קוד PIN</label>
                  <input
                    type="password"
                    [(ngModel)]="kidLogin.pin"
                    name="pin"
                    maxlength="6"
                    pattern="[0-9]*"
                    inputmode="numeric"
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-400 focus:outline-none transition-colors text-center text-2xl tracking-widest text-gray-900"
                    placeholder="****"
                    required
                  />
                  <div class="flex justify-center gap-2 mt-3">
                    @for (i of [0,1,2,3,4,5]; track i) {
                      <span class="w-3 h-3 rounded-full transition-all" [class.bg-pink-500]="kidLogin.pin.length > i" [class.bg-gray-300]="kidLogin.pin.length <= i"></span>
                    }
                  </div>
                </div>
                @if (kidLoginError) {
                  <div class="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {{ kidLoginError }}
                  </div>
                }
                <button
                  type="submit"
                  [disabled]="isLoggingIn"
                  class="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl
                         hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {{ isLoggingIn ? 'מתחבר...' : '🚀 היכנס' }}
                </button>
              </form>
            }

            <!-- Divider -->
            <div class="flex items-center gap-4 my-6">
              <div class="flex-1 h-px bg-gray-200"></div>
              <span class="text-gray-400 text-sm">או</span>
              <div class="flex-1 h-px bg-gray-200"></div>
            </div>

            <!-- Join Family with Invite Code -->
            <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border-2 border-purple-100">
              <p class="text-gray-700 font-semibold text-center mb-3">יש לך קוד הזמנה?</p>
              <div class="flex gap-2">
                <input
                  type="text"
                  [(ngModel)]="inviteCode"
                  name="inviteCode"
                  class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:outline-none transition-colors text-center text-lg font-mono text-gray-900"
                  placeholder="הזן קוד הזמנה"
                  (keyup.enter)="joinWithInviteCode()"
                />
                <button
                  (click)="joinWithInviteCode()"
                  [disabled]="!inviteCode.trim()"
                  class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl
                         hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  🚀
                </button>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center mt-6">
            <p class="text-white/70 text-sm">
              נבנה באהבה למשפחות 💜
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  showKidLogin = false;
  kidLogin = { username: '', pin: '' };
  kidLoginError = '';
  isLoggingIn = false;
  inviteCode = '';

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }

  loginWithPin(): void {
    if (!this.kidLogin.username || !this.kidLogin.pin) return;

    this.isLoggingIn = true;
    this.kidLoginError = '';
    this.cdr.markForCheck();

    this.authService.loginWithPin(this.kidLogin.username, this.kidLogin.pin).subscribe({
      next: () => {
        // AuthService handles navigation automatically
        this.isLoggingIn = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.kidLoginError = err.error?.message || 'שם משתמש או קוד PIN שגויים';
        this.isLoggingIn = false;
        this.cdr.markForCheck();
      }
    });
  }

  joinWithInviteCode(): void {
    const code = this.inviteCode.trim();
    if (code) {
      this.router.navigate(['/join', code]);
    }
  }
}
