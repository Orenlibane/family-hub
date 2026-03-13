import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RewardsStore } from '../../../core/stores';
import { Reward, CreateRewardDto, RedemptionRecord } from '../../../core/models';

@Component({
  selector: 'app-rewards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-adult-dark">Rewards</h1>
          <p class="text-gray-600">Manage rewards and approve redemptions</p>
        </div>
        <button
          (click)="openCreateModal()"
          class="bg-adult-secondary text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <span>+</span> New Reward
        </button>
      </header>

      <!-- Tabs -->
      <div class="flex gap-2 mb-6">
        <button
          (click)="activeTab = 'rewards'"
          [class.bg-adult-primary]="activeTab === 'rewards'"
          [class.text-white]="activeTab === 'rewards'"
          [class.bg-white]="activeTab !== 'rewards'"
          class="px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm"
        >
          Rewards ({{ (rewards$ | async)?.length || 0 }})
        </button>
        <button
          (click)="activeTab = 'redemptions'"
          [class.bg-adult-primary]="activeTab === 'redemptions'"
          [class.text-white]="activeTab === 'redemptions'"
          [class.bg-white]="activeTab !== 'redemptions'"
          class="px-6 py-3 rounded-xl font-semibold transition-colors shadow-sm relative"
        >
          Redemptions
          @if ((pendingRedemptions$ | async)?.length) {
            <span class="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {{ (pendingRedemptions$ | async)?.length }}
            </span>
          }
        </button>
      </div>

      <!-- Rewards Grid -->
      @if (activeTab === 'rewards') {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (reward of rewards$ | async; track reward.id) {
            <div
              class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              [class.opacity-50]="!reward.isActive"
            >
              <div class="flex items-start justify-between mb-4">
                <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl">
                  🎁
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="openEditModal(reward)"
                    class="p-2 text-gray-400 hover:text-adult-primary transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    (click)="deleteReward(reward)"
                    class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <h3 class="font-semibold text-lg mb-1">{{ reward.name }}</h3>
              @if (reward.description) {
                <p class="text-gray-600 text-sm mb-3">{{ reward.description }}</p>
              }
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-1 text-fam-coin font-bold text-xl">
                  🪙 {{ reward.coinCost }}
                </span>
                @if (reward.stock !== null) {
                  <span class="text-sm text-gray-500">
                    Stock: {{ reward.stock }}
                  </span>
                }
              </div>
              @if (!reward.isActive) {
                <span class="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  Inactive
                </span>
              }
            </div>
          } @empty {
            <div class="col-span-full bg-white rounded-2xl p-12 shadow-sm text-center">
              <p class="text-6xl mb-4">🎁</p>
              <h3 class="text-xl font-semibold text-gray-600 mb-2">No rewards yet</h3>
              <p class="text-gray-400 mb-4">Create rewards for your family to earn!</p>
              <button
                (click)="openCreateModal()"
                class="bg-adult-secondary text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors"
              >
                Create Reward
              </button>
            </div>
          }
        </div>
      }

      <!-- Redemptions List -->
      @if (activeTab === 'redemptions') {
        <div class="space-y-4">
          @for (redemption of redemptions$ | async; track redemption.id) {
            <div class="bg-white rounded-2xl p-4 shadow-sm">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                  🎁
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold">{{ redemption.reward?.name }}</h3>
                  <p class="text-sm text-gray-500">
                    By {{ redemption.user?.name }} • {{ redemption.createdAt | date:'short' }}
                  </p>
                </div>
                <span class="flex items-center gap-1 text-fam-coin font-bold">
                  🪙 {{ redemption.coinsSpent }}
                </span>
                <div class="flex items-center gap-2">
                  @switch (redemption.status) {
                    @case ('PENDING') {
                      <button
                        (click)="approveRedemption(redemption)"
                        class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        (click)="rejectRedemption(redemption)"
                        class="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Reject
                      </button>
                    }
                    @case ('APPROVED') {
                      <button
                        (click)="fulfillRedemption(redemption)"
                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Mark Fulfilled
                      </button>
                    }
                    @case ('FULFILLED') {
                      <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        Fulfilled
                      </span>
                    }
                    @case ('REJECTED') {
                      <span class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        Rejected
                      </span>
                    }
                  }
                </div>
              </div>
            </div>
          } @empty {
            <div class="bg-white rounded-2xl p-12 shadow-sm text-center">
              <p class="text-6xl mb-4">📋</p>
              <h3 class="text-xl font-semibold text-gray-600 mb-2">No redemptions yet</h3>
              <p class="text-gray-400">Redemption requests will appear here</p>
            </div>
          }
        </div>
      }

      <!-- Create/Edit Modal -->
      @if (showModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="closeModal()">
          <div class="bg-white rounded-2xl p-6 w-full max-w-lg" (click)="$event.stopPropagation()">
            <h2 class="text-2xl font-bold text-adult-dark mb-6">
              {{ editingReward ? 'Edit Reward' : 'Create Reward' }}
            </h2>

            <form (ngSubmit)="saveReward()" class="space-y-4">
              <!-- Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  [(ngModel)]="rewardForm.name"
                  name="name"
                  required
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-secondary focus:ring-2 focus:ring-adult-secondary/20 outline-none"
                  placeholder="e.g., Extra Screen Time"
                />
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  [(ngModel)]="rewardForm.description"
                  name="description"
                  rows="3"
                  class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-secondary focus:ring-2 focus:ring-adult-secondary/20 outline-none resize-none"
                  placeholder="Describe the reward..."
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Coin Cost -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Coin Cost *</label>
                  <input
                    type="number"
                    [(ngModel)]="rewardForm.coinCost"
                    name="coinCost"
                    min="1"
                    max="10000"
                    required
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-secondary outline-none"
                  />
                </div>

                <!-- Stock -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Stock (empty = unlimited)</label>
                  <input
                    type="number"
                    [(ngModel)]="rewardForm.stock"
                    name="stock"
                    min="0"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-adult-secondary outline-none"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <!-- Active Toggle -->
              @if (editingReward) {
                <div class="flex items-center gap-3">
                  <input
                    type="checkbox"
                    [(ngModel)]="rewardForm.isActive"
                    name="isActive"
                    id="isActive"
                    class="w-5 h-5 rounded border-gray-300 text-adult-secondary focus:ring-adult-secondary"
                  />
                  <label for="isActive" class="text-sm font-medium text-gray-700">
                    Active (visible in shop)
                  </label>
                </div>
              }

              <!-- Actions -->
              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  (click)="closeModal()"
                  class="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="flex-1 px-6 py-3 rounded-xl font-semibold bg-adult-secondary text-white hover:bg-teal-700 transition-colors"
                >
                  {{ editingReward ? 'Update' : 'Create' }}
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
export class RewardsComponent {
  private readonly rewardsStore = inject(RewardsStore);

  rewards$ = this.rewardsStore.rewards$;
  redemptions$ = this.rewardsStore.redemptions$;
  pendingRedemptions$ = this.rewardsStore.pendingRedemptions$;

  activeTab: 'rewards' | 'redemptions' = 'rewards';
  showModal = false;
  editingReward: Reward | null = null;
  rewardForm: Partial<CreateRewardDto & { isActive: boolean }> = this.getEmptyForm();

  constructor() {
    this.rewardsStore.loadRewards();
    this.rewardsStore.loadRedemptions();
  }

  openCreateModal(): void {
    this.editingReward = null;
    this.rewardForm = this.getEmptyForm();
    this.showModal = true;
  }

  openEditModal(reward: Reward): void {
    this.editingReward = reward;
    this.rewardForm = {
      name: reward.name,
      description: reward.description || '',
      coinCost: reward.coinCost,
      stock: reward.stock ?? undefined,
      isActive: reward.isActive
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingReward = null;
  }

  saveReward(): void {
    if (!this.rewardForm.name || !this.rewardForm.coinCost) return;

    const dto: CreateRewardDto = {
      name: this.rewardForm.name!,
      description: this.rewardForm.description,
      coinCost: this.rewardForm.coinCost!,
      stock: this.rewardForm.stock
    };

    if (this.editingReward) {
      this.rewardsStore.updateReward(this.editingReward.id, {
        ...dto,
        isActive: this.rewardForm.isActive
      } as Partial<CreateRewardDto>).subscribe(() => {
        this.closeModal();
      });
    } else {
      this.rewardsStore.createReward(dto).subscribe(() => {
        this.closeModal();
      });
    }
  }

  deleteReward(reward: Reward): void {
    if (confirm(`Delete "${reward.name}"?`)) {
      this.rewardsStore.deleteReward(reward.id).subscribe();
    }
  }

  approveRedemption(redemption: RedemptionRecord): void {
    this.rewardsStore.approveRedemption(redemption.id).subscribe();
  }

  rejectRedemption(redemption: RedemptionRecord): void {
    const reason = prompt('Reason for rejection (optional):');
    this.rewardsStore.rejectRedemption(redemption.id, reason || undefined).subscribe();
  }

  fulfillRedemption(redemption: RedemptionRecord): void {
    this.rewardsStore.fulfillRedemption(redemption.id).subscribe();
  }

  private getEmptyForm(): Partial<CreateRewardDto & { isActive: boolean }> {
    return {
      name: '',
      description: '',
      coinCost: 50,
      stock: undefined,
      isActive: true
    };
  }
}
