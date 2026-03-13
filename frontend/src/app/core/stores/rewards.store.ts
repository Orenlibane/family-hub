import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { Reward, CreateRewardDto, RedemptionRecord } from '../models';

interface RewardsState {
  rewards: Reward[];
  redemptions: RedemptionRecord[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RewardsStore implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private readonly _state$ = new BehaviorSubject<RewardsState>({
    rewards: [],
    redemptions: [],
    isLoading: false,
    error: null
  });

  // Public selectors
  readonly state$ = this._state$.asObservable();
  readonly rewards$ = this._state$.pipe(map(s => s.rewards));
  readonly redemptions$ = this._state$.pipe(map(s => s.redemptions));
  readonly isLoading$ = this._state$.pipe(map(s => s.isLoading));
  readonly error$ = this._state$.pipe(map(s => s.error));

  // Filtered reward streams
  readonly activeRewards$ = this.rewards$.pipe(
    map(rewards => rewards.filter(r => r.isActive))
  );

  readonly availableRewards$ = this.rewards$.pipe(
    map(rewards => rewards.filter(r =>
      r.isActive && (r.stock === null || r.stock > 0)
    ))
  );

  // Redemptions by status
  readonly pendingRedemptions$ = this.redemptions$.pipe(
    map(redemptions => redemptions.filter(r => r.status === 'PENDING'))
  );

  readonly approvedRedemptions$ = this.redemptions$.pipe(
    map(redemptions => redemptions.filter(r => r.status === 'APPROVED'))
  );

  constructor(private api: ApiService) {}

  /**
   * Load all rewards for the household
   */
  loadRewards(): void {
    this.updateState({ isLoading: true, error: null });

    this.api.get<Reward[]>('/api/rewards')
      .pipe(
        tap(rewards => {
          this.updateState({
            rewards,
            isLoading: false
          });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load rewards'
          });
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Load redemption history
   */
  loadRedemptions(userId?: string): void {
    this.updateState({ isLoading: true, error: null });

    const params: Record<string, string> | undefined = userId ? { userId } : undefined;

    this.api.get<RedemptionRecord[]>('/api/rewards/redemptions', params)
      .pipe(
        tap(redemptions => {
          this.updateState({
            redemptions,
            isLoading: false
          });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load redemptions'
          });
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Get rewards affordable by a user
   */
  getAffordableRewards(userCoins: number): Observable<Reward[]> {
    return this.availableRewards$.pipe(
      map(rewards => rewards.filter(r => r.coinCost <= userCoins))
    );
  }

  /**
   * Get redemptions for a specific user
   */
  getUserRedemptions(userId: string): Observable<RedemptionRecord[]> {
    return this.redemptions$.pipe(
      map(redemptions => redemptions.filter(r => r.userId === userId))
    );
  }

  /**
   * Create a new reward (admin only)
   */
  createReward(dto: CreateRewardDto): Observable<Reward> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<Reward>('/api/rewards', dto).pipe(
      tap(reward => {
        const current = this._state$.value.rewards;
        this.updateState({
          rewards: [...current, reward],
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to create reward'
        });
        throw error;
      })
    );
  }

  /**
   * Update a reward
   */
  updateReward(rewardId: string, dto: Partial<CreateRewardDto>): Observable<Reward> {
    this.updateState({ isLoading: true, error: null });

    return this.api.patch<Reward>(`/api/rewards/${rewardId}`, dto).pipe(
      tap(reward => {
        const current = this._state$.value.rewards;
        this.updateState({
          rewards: current.map(r => r.id === reward.id ? reward : r),
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to update reward'
        });
        throw error;
      })
    );
  }

  /**
   * Delete a reward
   */
  deleteReward(rewardId: string): Observable<void> {
    this.updateState({ isLoading: true, error: null });

    return this.api.delete<void>(`/api/rewards/${rewardId}`).pipe(
      tap(() => {
        const current = this._state$.value.rewards;
        this.updateState({
          rewards: current.filter(r => r.id !== rewardId),
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to delete reward'
        });
        throw error;
      })
    );
  }

  /**
   * Redeem a reward (kid action)
   */
  redeemReward(rewardId: string): Observable<RedemptionRecord> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<RedemptionRecord>(`/api/rewards/${rewardId}/redeem`, {}).pipe(
      tap(redemption => {
        // Add to redemptions list
        const currentRedemptions = this._state$.value.redemptions;
        this.updateState({
          redemptions: [redemption, ...currentRedemptions],
          isLoading: false
        });

        // Update stock if applicable
        const currentRewards = this._state$.value.rewards;
        const reward = currentRewards.find(r => r.id === rewardId);
        if (reward && reward.stock !== null) {
          this.updateState({
            rewards: currentRewards.map(r =>
              r.id === rewardId ? { ...r, stock: r.stock! - 1 } : r
            )
          });
        }
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to redeem reward'
        });
        throw error;
      })
    );
  }

  /**
   * Approve a redemption (adult action)
   */
  approveRedemption(redemptionId: string): Observable<RedemptionRecord> {
    return this.updateRedemptionStatus(redemptionId, 'APPROVED');
  }

  /**
   * Reject a redemption (adult action)
   */
  rejectRedemption(redemptionId: string, reason?: string): Observable<RedemptionRecord> {
    return this.updateRedemptionStatus(redemptionId, 'REJECTED', reason);
  }

  /**
   * Mark redemption as fulfilled
   */
  fulfillRedemption(redemptionId: string): Observable<RedemptionRecord> {
    return this.updateRedemptionStatus(redemptionId, 'FULFILLED');
  }

  private updateRedemptionStatus(
    redemptionId: string,
    status: RedemptionRecord['status'],
    reason?: string
  ): Observable<RedemptionRecord> {
    this.updateState({ isLoading: true, error: null });

    return this.api.patch<RedemptionRecord>(`/api/rewards/redemptions/${redemptionId}`, {
      status,
      rejectionReason: reason
    }).pipe(
      tap(redemption => {
        const current = this._state$.value.redemptions;
        this.updateState({
          redemptions: current.map(r => r.id === redemption.id ? redemption : r),
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to update redemption'
        });
        throw error;
      })
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  private updateState(partial: Partial<RewardsState>): void {
    this._state$.next({
      ...this._state$.value,
      ...partial
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
