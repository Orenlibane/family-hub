import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-primary to-kid-secondary flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Join Your Family!</h1>
        <p class="text-gray-600 mb-6">Invite code: <strong>{{ inviteCode }}</strong></p>

        <div class="space-y-4">
          <button class="w-full bg-adult-primary text-white font-semibold py-3 px-6 rounded-xl
                         hover:bg-adult-dark transition-colors">
            Join as Adult
          </button>
          <button class="w-full bg-kid-primary text-white font-semibold py-3 px-6 rounded-xl
                         hover:bg-kid-secondary transition-colors">
            Join as Kid
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JoinComponent {
  @Input() inviteCode = '';
}
