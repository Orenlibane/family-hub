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
            } @else {
              <!-- Role Selection Buttons -->
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
                <p class="text-gray-500 text-sm mb-2">יש לך כבר חשבון?</p>
                <a href="/login" class="text-purple-600 font-semibold hover:text-pink-500 transition-colors">
                  התחבר כאן
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
  isLoading = false;
  isJoining = false;
  errorMessage = '';

  ngOnInit(): void {
    // Extract invite code from route params
    this.route.params.subscribe(params => {
      this.inviteCode = params['inviteCode'] || '';
      this.cdr.markForCheck();
    });
  }

  joinAsAdult(): void {
    this.joinHousehold('ADULT');
  }

  joinAsKid(): void {
    this.joinHousehold('KID');
  }

  private joinHousehold(role: 'ADULT' | 'KID'): void {
    if (!this.inviteCode || this.isJoining) return;

    this.isJoining = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.apiService.post(`/api/household/join/${this.inviteCode}`, { role }).subscribe({
      next: (response) => {
        // Reload auth state to get updated household
        this.authService.checkAuth();

        // Navigate to appropriate page based on role
        setTimeout(() => {
          if (role === 'KID') {
            this.router.navigate(['/playground']);
          } else {
            this.router.navigate(['/command-center']);
          }
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
