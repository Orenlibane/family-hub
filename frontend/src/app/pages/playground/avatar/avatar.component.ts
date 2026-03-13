import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-primary to-kid-accent p-6">
      <h1 class="text-3xl font-bold text-white mb-6">My Avatar</h1>
      <div class="bg-white rounded-3xl p-8 text-center">
        <div class="w-32 h-32 bg-kid-surface rounded-full mx-auto mb-4 flex items-center justify-center">
          <span class="text-6xl">🧑</span>
        </div>
        <p class="text-gray-600 mb-6">Customize your avatar!</p>
        <p class="text-gray-400">Avatar customization - Coming soon</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarComponent {}
