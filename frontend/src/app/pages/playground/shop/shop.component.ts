import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services';
import { RewardsStore } from '../../../core/stores';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-accent to-kid-secondary p-6">
      <header class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold text-white">Reward Shop</h1>
        <div class="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center gap-2">
          <span class="text-2xl">🪙</span>
          <span class="text-2xl font-bold text-white">{{ (user$ | async)?.famCoins || 0 }}</span>
        </div>
      </header>

      <div class="grid grid-cols-2 gap-4">
        @for (reward of availableRewards$ | async; track reward.id) {
          <div class="bg-white rounded-3xl p-4 text-center shadow-lg">
            <div class="text-4xl mb-2">🎁</div>
            <h3 class="font-bold text-gray-800">{{ reward.name }}</h3>
            <div class="flex items-center justify-center gap-1 text-fam-coin font-bold mt-2">
              <span>🪙</span>
              <span>{{ reward.coinCost }}</span>
            </div>
            <button class="mt-3 w-full bg-kid-primary text-white py-2 rounded-xl font-semibold
                           hover:bg-kid-secondary transition-colors"
                    [disabled]="(user$ | async)?.famCoins! < reward.coinCost">
              Get It!
            </button>
          </div>
        } @empty {
          <div class="col-span-2 bg-white rounded-3xl p-8 text-center">
            <p class="text-6xl mb-4">🏪</p>
            <p class="text-gray-500">No rewards yet! Ask your parents to add some.</p>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShopComponent {
  private readonly authService = inject(AuthService);
  private readonly rewardsStore = inject(RewardsStore);

  user$ = this.authService.user$;
  availableRewards$ = this.rewardsStore.availableRewards$;

  constructor() {
    this.rewardsStore.loadRewards();
  }
}
