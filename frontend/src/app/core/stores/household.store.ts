import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { SocketService, MoodEvent } from '../services/socket.service';
import { User, Household, Mood } from '../models';

interface HouseholdMember extends User {
  currentMood?: Mood;
  lastMoodUpdate?: string;
  isOnline?: boolean;
}

interface HouseholdState {
  household: Household | null;
  members: HouseholdMember[];
  familyMood: Mood | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class HouseholdStore implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private readonly _state$ = new BehaviorSubject<HouseholdState>({
    household: null,
    members: [],
    familyMood: null,
    isLoading: false,
    error: null
  });

  // Public selectors
  readonly state$ = this._state$.asObservable();
  readonly household$ = this._state$.pipe(map(s => s.household));
  readonly members$ = this._state$.pipe(map(s => s.members));
  readonly familyMood$ = this._state$.pipe(map(s => s.familyMood));
  readonly isLoading$ = this._state$.pipe(map(s => s.isLoading));

  // Filtered member streams
  readonly adults$ = this.members$.pipe(
    map(members => members.filter(m => m.role === 'ADMIN' || m.role === 'ADULT'))
  );

  readonly kids$ = this.members$.pipe(
    map(members => members.filter(m => m.role === 'KID'))
  );

  readonly onlineMembers$ = this.members$.pipe(
    map(members => members.filter(m => m.isOnline))
  );

  // Stats
  readonly totalCoins$ = this.members$.pipe(
    map(members => members.reduce((sum, m) => sum + (m.famCoins || 0), 0))
  );

  readonly memberCount$ = this.members$.pipe(map(m => m.length));

  constructor(
    private api: ApiService,
    private socket: SocketService
  ) {
    this.subscribeToSocketEvents();
  }

  /**
   * Subscribe to real-time mood and presence updates
   */
  private subscribeToSocketEvents(): void {
    this.socket.moodChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => this.handleMoodUpdate(event));
  }

  /**
   * Handle incoming mood events
   */
  private handleMoodUpdate(event: MoodEvent): void {
    if (event.familyMood) {
      // Family-wide mood update
      this.updateState({ familyMood: event.familyMood });
    } else {
      // Individual mood update
      const current = this._state$.value.members;
      this.updateState({
        members: current.map(m =>
          m.id === event.userId
            ? { ...m, currentMood: event.mood, lastMoodUpdate: new Date().toISOString() }
            : m
        )
      });
    }
  }

  /**
   * Load household data including members
   */
  loadHousehold(): void {
    this.updateState({ isLoading: true, error: null });

    this.api.get<{ household: Household; members: HouseholdMember[] }>('/api/household')
      .pipe(
        tap(response => {
          this.updateState({
            household: response.household,
            members: response.members,
            isLoading: false
          });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load household'
          });
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Get a specific member by ID
   */
  getMember(userId: string): Observable<HouseholdMember | undefined> {
    return this.members$.pipe(
      map(members => members.find(m => m.id === userId))
    );
  }

  /**
   * Update member presence status
   */
  updateMemberPresence(userId: string, isOnline: boolean): void {
    const current = this._state$.value.members;
    this.updateState({
      members: current.map(m =>
        m.id === userId ? { ...m, isOnline } : m
      )
    });
  }

  /**
   * Update member coins (from socket event)
   */
  updateMemberCoins(userId: string, newBalance: number): void {
    const current = this._state$.value.members;
    this.updateState({
      members: current.map(m =>
        m.id === userId ? { ...m, famCoins: newBalance } : m
      )
    });
  }

  /**
   * Invite a new member to the household
   */
  inviteMember(email: string, role: 'ADULT' | 'KID'): Observable<{ inviteCode: string }> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<{ inviteCode: string }>('/api/household/invite', { email, role }).pipe(
      tap(() => {
        this.updateState({ isLoading: false });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to invite member'
        });
        throw error;
      })
    );
  }

  /**
   * Remove a member from the household (admin only)
   */
  removeMember(userId: string): Observable<void> {
    this.updateState({ isLoading: true, error: null });

    return this.api.delete<void>(`/api/household/members/${userId}`).pipe(
      tap(() => {
        const current = this._state$.value.members;
        this.updateState({
          members: current.filter(m => m.id !== userId),
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to remove member'
        });
        throw error;
      })
    );
  }

  /**
   * Update household settings
   */
  updateHouseholdSettings(settings: Partial<Household>): Observable<Household> {
    this.updateState({ isLoading: true, error: null });

    return this.api.patch<Household>('/api/household', settings).pipe(
      tap(household => {
        this.updateState({
          household,
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to update settings'
        });
        throw error;
      })
    );
  }

  /**
   * Calculate family mood from individual moods
   */
  calculateFamilyMood(): Mood | null {
    const members = this._state$.value.members;
    const moodValues: Record<Mood, number> = {
      'GREAT': 5,
      'GOOD': 4,
      'OKAY': 3,
      'SAD': 2,
      'ANGRY': 1
    };

    const moods = members
      .filter(m => m.currentMood)
      .map(m => moodValues[m.currentMood!]);

    if (moods.length === 0) return null;

    const avg = moods.reduce((a, b) => a + b, 0) / moods.length;

    if (avg >= 4.5) return 'GREAT';
    if (avg >= 3.5) return 'GOOD';
    if (avg >= 2.5) return 'OKAY';
    if (avg >= 1.5) return 'SAD';
    return 'ANGRY';
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Set household data (called from auth service)
   */
  setHousehold(household: Household): void {
    this.updateState({ household });
  }

  private updateState(partial: Partial<HouseholdState>): void {
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
