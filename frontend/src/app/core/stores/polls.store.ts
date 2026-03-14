import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { SocketService } from '../services/socket.service';
import { Poll, CreatePollDto, VoteDto } from '../models';

interface PollsState {
  polls: Poll[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PollsStore implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private readonly _state$ = new BehaviorSubject<PollsState>({
    polls: [],
    isLoading: false,
    error: null
  });

  // Public selectors
  readonly state$ = this._state$.asObservable();
  readonly polls$ = this._state$.pipe(map(s => s.polls));
  readonly isLoading$ = this._state$.pipe(map(s => s.isLoading));
  readonly error$ = this._state$.pipe(map(s => s.error));

  // Filtered streams
  readonly activePolls$ = this.polls$.pipe(
    map(polls => polls.filter(p => p.status === 'ACTIVE'))
  );

  readonly closedPolls$ = this.polls$.pipe(
    map(polls => polls.filter(p => p.status === 'CLOSED'))
  );

  constructor(
    private api: ApiService,
    private socket: SocketService
  ) {
    this.subscribeToSocketEvents();
  }

  private subscribeToSocketEvents(): void {
    // Poll created
    this.socket.pollCreated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(poll => {
        const current = this._state$.value.polls;
        if (!current.find(p => p.id === poll.id)) {
          this.updateState({ polls: [poll, ...current] });
        }
      });

    // Poll voted
    this.socket.pollVoted$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const current = this._state$.value.polls;
        this.updateState({
          polls: current.map(p => p.id === event.pollId ? event.results : p)
        });
      });

    // Poll closed
    this.socket.pollClosed$
      .pipe(takeUntil(this.destroy$))
      .subscribe(poll => {
        const current = this._state$.value.polls;
        this.updateState({
          polls: current.map(p => p.id === poll.id ? poll : p)
        });
      });
  }

  loadPolls(): void {
    this.updateState({ isLoading: true, error: null });

    this.api.get<Poll[]>('/api/polls')
      .pipe(
        tap(polls => {
          this.updateState({ polls, isLoading: false });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load polls'
          });
          return of([]);
        })
      )
      .subscribe();
  }

  createPoll(dto: CreatePollDto): Observable<Poll> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<Poll>('/api/polls', dto).pipe(
      tap(poll => {
        const current = this._state$.value.polls;
        if (!current.find(p => p.id === poll.id)) {
          this.updateState({
            polls: [poll, ...current],
            isLoading: false
          });
        } else {
          this.updateState({ isLoading: false });
        }
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to create poll'
        });
        throw error;
      })
    );
  }

  vote(pollId: string, dto: VoteDto): Observable<Poll> {
    return this.api.post<Poll>(`/api/polls/${pollId}/vote`, dto).pipe(
      tap(poll => {
        const current = this._state$.value.polls;
        this.updateState({
          polls: current.map(p => p.id === poll.id ? poll : p)
        });
      }),
      catchError(error => {
        this.updateState({
          error: error.message || 'Failed to vote'
        });
        throw error;
      })
    );
  }

  closePoll(pollId: string): Observable<Poll> {
    return this.api.patch<Poll>(`/api/polls/${pollId}/close`, {}).pipe(
      tap(poll => {
        const current = this._state$.value.polls;
        this.updateState({
          polls: current.map(p => p.id === poll.id ? poll : p)
        });
      }),
      catchError(error => {
        this.updateState({
          error: error.message || 'Failed to close poll'
        });
        throw error;
      })
    );
  }

  deletePoll(pollId: string): Observable<void> {
    return this.api.delete<void>(`/api/polls/${pollId}`).pipe(
      tap(() => {
        const current = this._state$.value.polls;
        this.updateState({
          polls: current.filter(p => p.id !== pollId)
        });
      }),
      catchError(error => {
        this.updateState({
          error: error.message || 'Failed to delete poll'
        });
        throw error;
      })
    );
  }

  getPollById(pollId: string): Observable<Poll | undefined> {
    return this.polls$.pipe(
      map(polls => polls.find(p => p.id === pollId))
    );
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  private updateState(partial: Partial<PollsState>): void {
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
