import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HouseholdStore } from '../../../core/stores';
import { AuthService } from '../../../core/services';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <header class="mb-6">
        <h1 class="text-3xl font-bold text-adult-dark">Family</h1>
        <p class="text-gray-600">Manage your family members</p>
      </header>

      <!-- Household Info & Invite -->
      <div class="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-adult-dark">{{ (household$ | async)?.name }}</h2>
            <p class="text-gray-500">{{ (memberCount$ | async) }} members</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-sm text-gray-500">Invite Code</p>
              <p class="font-mono text-lg font-bold text-adult-primary">{{ (household$ | async)?.inviteCode }}</p>
            </div>
            <button
              (click)="copyInviteLink()"
              class="bg-adult-primary text-white px-4 py-2 rounded-xl hover:bg-adult-dark transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>

      <!-- Members List -->
      <div class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-gray-100">
          <h3 class="font-semibold text-adult-dark">Family Members</h3>
        </div>
        <div class="divide-y divide-gray-100">
          @for (member of members$ | async; track member.id) {
            <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                   [class.bg-adult-primary]="member.role !== 'KID'"
                   [class.bg-kid-primary]="member.role === 'KID'">
                {{ member.name?.charAt(0) || '?' }}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <p class="font-medium">{{ member.name }}</p>
                  @if (member.id === (user$ | async)?.id) {
                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">You</span>
                  }
                </div>
                <p class="text-sm text-gray-500">{{ member.email }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1 text-fam-coin font-bold">
                  🪙 {{ member.famCoins }}
                </span>
                <span class="px-3 py-1 rounded-full text-sm font-medium"
                      [class.bg-purple-100]="member.role === 'ADMIN'"
                      [class.text-purple-700]="member.role === 'ADMIN'"
                      [class.bg-blue-100]="member.role === 'ADULT'"
                      [class.text-blue-700]="member.role === 'ADULT'"
                      [class.bg-orange-100]="member.role === 'KID'"
                      [class.text-orange-700]="member.role === 'KID'">
                  {{ member.role }}
                </span>
                @if (member.currentMood) {
                  <span class="text-2xl">{{ getMoodEmoji(member.currentMood) }}</span>
                }
              </div>
            </div>
          } @empty {
            <div class="p-8 text-center text-gray-400">
              <p class="text-4xl mb-2">👨‍👩‍👧‍👦</p>
              <p>No family members yet</p>
            </div>
          }
        </div>
      </div>

      <!-- Copy Success Toast -->
      @if (showCopyToast) {
        <div class="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce">
          Invite link copied to clipboard!
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FamilyComponent {
  private readonly householdStore = inject(HouseholdStore);
  private readonly authService = inject(AuthService);

  household$ = this.authService.household$;
  members$ = this.householdStore.members$;
  memberCount$ = this.householdStore.memberCount$;
  user$ = this.authService.user$;

  showCopyToast = false;

  constructor() {
    this.householdStore.loadHousehold();
  }

  copyInviteLink(): void {
    const household = this.authService.getSnapshot().household;
    if (household) {
      const link = `${window.location.origin}/join/${household.inviteCode}`;
      navigator.clipboard.writeText(link).then(() => {
        this.showCopyToast = true;
        setTimeout(() => {
          this.showCopyToast = false;
        }, 3000);
      });
    }
  }

  getMoodEmoji(mood: string): string {
    const moods: Record<string, string> = {
      'HAPPY': '😊',
      'EXCITED': '🤩',
      'CALM': '😌',
      'TIRED': '😴',
      'SAD': '😢',
      'ANGRY': '😠',
      'ANXIOUS': '😰'
    };
    return moods[mood] || '😐';
  }
}
