import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, AuthService } from '../../core/services';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule],
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
        <div class="absolute top-[10%] left-[15%] text-6xl animate-bounce" style="animation-duration: 3s">🎉</div>
        <div class="absolute top-[20%] right-[20%] text-5xl animate-bounce" style="animation-duration: 2.5s; animation-delay: 0.5s">👨‍👩‍👧‍👦</div>
        <div class="absolute bottom-[25%] left-[10%] text-5xl animate-bounce" style="animation-duration: 2.8s; animation-delay: 1s">✨</div>
        <div class="absolute bottom-[15%] right-[15%] text-6xl animate-bounce" style="animation-duration: 3.2s; animation-delay: 0.3s">🏠</div>
      </div>

      <!-- Main Content -->
      <div class="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div class="w-full max-w-md">
          <!-- Join Card -->
          <div class="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 transform hover:scale-[1.02] transition-all duration-300">
            <!-- Icon -->
            <div class="text-center mb-6">
              <div class="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl shadow-lg mb-6 transform hover:rotate-6 transition-transform">
                <span class="text-5xl">🎊</span>
              </div>
              <h1 class="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent mb-3">
                הצטרף למשפחה!
              </h1>
              <p class="text-gray-500 text-lg">
                אתה מוזמן להצטרף למשפחה
              </p>
            </div>

            <!-- Invite Code Display -->
            @if (inviteCode) {
              <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 mb-6 border-2 border-purple-200">
                <p class="text-sm text-gray-600 text-center mb-1">קוד הזמנה</p>
                <p class="text-2xl font-bold text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent tracking-wider">
                  {{ inviteCode }}
                </p>
              </div>
            }

            <!-- Error Message -->
            @if (errorMessage) {
              <div class="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 text-center">
                {{ errorMessage }}
              </div>
            }

            <!-- Loading State -->
            @if (isLoading) {
              <div class="text-center py-8">
                <div class="inline-block w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                <p class="text-gray-600">מצטרף למשפחה...</p>
              </div>
            } @else if (!inviteCode) {
              <!-- Invalid Code State -->
              <div class="text-center py-8">
                <div class="text-6xl mb-4">😕</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">קוד הזמנה לא תקין</h3>
                <p class="text-gray-600 mb-6">הקישור שהשתמשת בו אינו תקף</p>
                <a href="/login" class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:shadow-lg transform hover:-translate-y-1 transition-all">
                  <span>🏠</span> חזור לעמוד הראשי
                </a>
              </div>
            } @else if (!isAuthenticated) {
              <!-- Not Authenticated - Show Login Button -->
              <div class="text-center py-8">
                <div class="text-6xl mb-4">🔐</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">התחבר כדי להצטרף למשפחה</h3>
                <p class="text-gray-600 mb-6">נא להתחבר עם חשבון Google שלך</p>
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
              </div>
            } @else {
              <!-- Authenticated - Show Role Selection -->
              <div class="space-y-4 mb-6">
                <button
                  (click)="joinAsAdult()"
                  [disabled]="isJoining"
                  class="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl
                         hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         flex items-center justify-center gap-3"
                >
                  <span class="text-2xl">👨‍👩‍👧</span>
                  <span>הצטרף כהורה</span>
                </button>

                <button
                  (click)="joinAsKid()"
                  [disabled]="isJoining"
                  class="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold py-4 px-6 rounded-2xl
                         hover:shadow-lg transform hover:-translate-y-1 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         flex items-center justify-center gap-3"
                >
                  <span class="text-2xl">🧒</span>
                  <span>הצטרף כילד</span>
                </button>
              </div>

              <!-- Divider -->
              <div class="flex items-center gap-4 my-6">
                <div class="flex-1 h-px bg-gray-200"></div>
                <span class="text-gray-400 text-sm">או</span>
                <div class="flex-1 h-px bg-gray-200"></div>
              </div>

              <!-- Back to Login -->
              <div class="text-center">
                <p class="text-gray-500 text-sm mb-2">רוצה להתחבר עם חשבון אחר?</p>
                <a href="/login" class="text-purple-600 font-semibold hover:text-pink-500 transition-colors">
                  חזור להתחברות
                </a>
              </div>
            }
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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JoinComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  inviteCode = '';
  isLoading = true;
  isJoining = false;
  errorMessage = '';
  isAuthenticated = false;

  ngOnInit(): void {
    // Extract invite code from route params
    this.route.params.subscribe(params => {
      this.inviteCode = params['inviteCode'] || '';

      // Check authentication status
      this.authService.state$.subscribe(state => {
        this.isLoading = state.isLoading;
        this.isAuthenticated = state.isAuthenticated;

        if (!state.isLoading) {
          // Loading complete - show appropriate UI
          this.cdr.markForCheck();
        }
      });

      this.cdr.markForCheck();
    });
  }

  joinAsAdult(): void {
    this.joinHousehold('ADULT');
  }

  joinAsKid(): void {
    this.joinHousehold('KID');
  }

  loginWithGoogle(): void {
    // Store invite code before login
    if (this.inviteCode) {
      localStorage.setItem('pendingInviteCode', this.inviteCode);
    }
    this.authService.loginWithGoogle();
  }

  private joinHousehold(role: 'ADULT' | 'KID'): void {
    if (!this.inviteCode || this.isJoining) return;

    this.isJoining = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.apiService.post(`/api/household/join/${this.inviteCode}`, { role }).subscribe({
      next: (response) => {
        // Clear pending invite code from storage
        localStorage.removeItem('pendingInviteCode');

        // Reload auth state to get updated household
        this.authService.checkAuth();

        // Navigate to Command Center (Playground on hold)
        setTimeout(() => {
          this.router.navigate(['/command-center']);
        }, 500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'שגיאה בהצטרפות למשפחה. אנא נסה שוב.';
        this.isJoining = false;
        this.cdr.markForCheck();
      }
    });
  }
}
