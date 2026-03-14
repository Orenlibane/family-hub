import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services';

@Component({
  selector: 'app-login',
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

            <!-- Google Login Button -->
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

            <!-- Divider -->
            <div class="flex items-center gap-4 my-6">
              <div class="flex-1 h-px bg-gray-200"></div>
              <span class="text-gray-400 text-sm">או</span>
              <div class="flex-1 h-px bg-gray-200"></div>
            </div>

            <!-- Join Family -->
            <div class="text-center">
              <p class="text-gray-500 text-sm mb-2">יש לך קוד הזמנה?</p>
              <a href="/join" class="text-purple-600 font-semibold hover:text-pink-500 transition-colors">
                הצטרף למשפחה קיימת
              </a>
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

  loginWithGoogle(): void {
    this.authService.loginWithGoogle();
  }
}
