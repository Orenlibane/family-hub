import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Task, Mood } from '../models';

// Event types
export interface TaskUpdateEvent {
  task: Task;
  action: 'created' | 'updated' | 'completed' | 'deleted';
}

export interface CoinEvent {
  userId: string;
  amount: number;
  newBalance: number;
  reason: string;
}

export interface MoodEvent {
  userId: string;
  mood: Mood;
  familyMood?: Mood;
}

export interface NotificationEvent {
  type: string;
  message: string;
  data?: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;

  // Connection state
  private readonly _connected$ = new BehaviorSubject<boolean>(false);
  readonly connected$ = this._connected$.asObservable();

  // Event streams
  private readonly _taskUpdate$ = new Subject<TaskUpdateEvent>();
  private readonly _coinChange$ = new Subject<CoinEvent>();
  private readonly _moodChange$ = new Subject<MoodEvent>();
  private readonly _notification$ = new Subject<NotificationEvent>();

  readonly taskUpdate$ = this._taskUpdate$.asObservable();
  readonly coinChange$ = this._coinChange$.asObservable();
  readonly moodChange$ = this._moodChange$.asObservable();
  readonly notification$ = this._notification$.asObservable();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    // In production, connect to same origin; in dev, use configured URL
    const wsUrl = environment.wsUrl || window.location.origin;

    this.socket = io(wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this._connected$.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this._connected$.next(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      this._connected$.next(false);
    });

    // Task events
    this.socket.on('task:created', (task: Task) => {
      this._taskUpdate$.next({ task, action: 'created' });
    });

    this.socket.on('task:updated', (task: Task) => {
      this._taskUpdate$.next({ task, action: 'updated' });
    });

    this.socket.on('task:completed', (data: { task: Task; coinsEarned: number }) => {
      this._taskUpdate$.next({ task: data.task, action: 'completed' });
    });

    this.socket.on('task:deleted', (task: Task) => {
      this._taskUpdate$.next({ task, action: 'deleted' });
    });

    // Coin events
    this.socket.on('coins:changed', (data: CoinEvent) => {
      this._coinChange$.next(data);
    });

    // Mood events
    this.socket.on('mood:updated', (data: MoodEvent) => {
      this._moodChange$.next(data);
    });

    this.socket.on('mood:family', (data: MoodEvent) => {
      this._moodChange$.next(data);
    });

    // General notifications
    this.socket.on('notification', (data: NotificationEvent) => {
      this._notification$.next(data);
    });
  }

  /**
   * Emit an event with optional acknowledgment callback
   */
  emit<T = void>(event: string, data?: unknown): Observable<T> {
    return new Observable(observer => {
      if (!this.socket?.connected) {
        observer.error(new Error('Socket not connected'));
        return;
      }

      this.socket.emit(event, data, (response: T) => {
        observer.next(response);
        observer.complete();
      });
    });
  }

  /**
   * Emit task completion
   */
  completeTask(taskId: string): Observable<{ success: boolean; coinsEarned: number }> {
    return this.emit('task:complete', { taskId });
  }

  /**
   * Update mood
   */
  updateMood(mood: Mood, note?: string): Observable<{ success: boolean }> {
    return this.emit('mood:update', { mood, note });
  }

  /**
   * Send heartbeat for presence tracking
   */
  heartbeat(): void {
    this.socket?.emit('presence:heartbeat');
  }

  /**
   * Join household room
   */
  joinHousehold(householdId: string): void {
    this.socket?.emit('household:join', { householdId });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._connected$.next(false);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this._taskUpdate$.complete();
    this._coinChange$.complete();
    this._moodChange$.complete();
    this._notification$.complete();
  }
}
