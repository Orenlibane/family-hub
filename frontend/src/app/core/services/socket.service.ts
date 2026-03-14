import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { Task, Mood, Poll, ChatMessage, LogisticsItem } from '../models';

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

// Poll events
export interface PollCreatedEvent {
  poll: Poll;
}

export interface PollVotedEvent {
  pollId: string;
  results: Poll;
}

export interface PollClosedEvent {
  poll: Poll;
}

// Chat events
export interface ChatMessageEvent {
  message: ChatMessage;
}

export interface ChatTypingEvent {
  userId: string;
  isTyping: boolean;
}

// Logistics events
export interface LogisticsUpdateEvent {
  item: LogisticsItem;
  action: 'created' | 'updated' | 'deleted';
}

export interface LogisticsSyncedEvent {
  items: LogisticsItem[];
}

// Member events
export interface MemberUpdateEvent {
  member: {
    id: string;
    name: string;
    role: string;
    famCoins?: number;
    username?: string;
  };
  action: 'added' | 'updated' | 'removed';
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
  private readonly _pollCreated$ = new Subject<Poll>();
  private readonly _pollVoted$ = new Subject<PollVotedEvent>();
  private readonly _pollClosed$ = new Subject<Poll>();
  private readonly _chatMessage$ = new Subject<ChatMessage>();
  private readonly _chatTyping$ = new Subject<ChatTypingEvent>();
  private readonly _logisticsUpdate$ = new Subject<LogisticsUpdateEvent>();
  private readonly _logisticsSynced$ = new Subject<LogisticsSyncedEvent>();
  private readonly _memberUpdate$ = new Subject<MemberUpdateEvent>();

  readonly taskUpdate$ = this._taskUpdate$.asObservable();
  readonly coinChange$ = this._coinChange$.asObservable();
  readonly moodChange$ = this._moodChange$.asObservable();
  readonly notification$ = this._notification$.asObservable();
  readonly pollCreated$ = this._pollCreated$.asObservable();
  readonly pollVoted$ = this._pollVoted$.asObservable();
  readonly pollClosed$ = this._pollClosed$.asObservable();
  readonly chatMessage$ = this._chatMessage$.asObservable();
  readonly chatTyping$ = this._chatTyping$.asObservable();
  readonly logisticsUpdate$ = this._logisticsUpdate$.asObservable();
  readonly logisticsSynced$ = this._logisticsSynced$.asObservable();
  readonly memberUpdate$ = this._memberUpdate$.asObservable();

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

    // Poll events
    this.socket.on('poll:created', (poll: Poll) => {
      this._pollCreated$.next(poll);
    });

    this.socket.on('poll:voted', (data: PollVotedEvent) => {
      this._pollVoted$.next(data);
    });

    this.socket.on('poll:closed', (poll: Poll) => {
      this._pollClosed$.next(poll);
    });

    // Chat events
    this.socket.on('chat:message', (message: ChatMessage) => {
      this._chatMessage$.next(message);
    });

    this.socket.on('chat:typing', (data: ChatTypingEvent) => {
      this._chatTyping$.next(data);
    });

    // Logistics events
    this.socket.on('logistics:created', (item: LogisticsItem) => {
      this._logisticsUpdate$.next({ item, action: 'created' });
    });

    this.socket.on('logistics:updated', (item: LogisticsItem) => {
      this._logisticsUpdate$.next({ item, action: 'updated' });
    });

    this.socket.on('logistics:deleted', (data: { id: string }) => {
      this._logisticsUpdate$.next({ item: { id: data.id } as LogisticsItem, action: 'deleted' });
    });

    this.socket.on('logistics:synced', (data: LogisticsSyncedEvent) => {
      this._logisticsSynced$.next(data);
    });

    // Member events
    this.socket.on('member:added', (member: any) => {
      this._memberUpdate$.next({ member, action: 'added' });
    });

    this.socket.on('member:updated', (member: any) => {
      this._memberUpdate$.next({ member, action: 'updated' });
    });

    this.socket.on('member:removed', (userId: string) => {
      this._memberUpdate$.next({ member: { id: userId, name: '', role: '' }, action: 'removed' });
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

  /**
   * Send chat typing indicator
   */
  sendTyping(isTyping: boolean): void {
    this.socket?.emit('chat:typing', { isTyping });
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
    this._pollCreated$.complete();
    this._pollVoted$.complete();
    this._pollClosed$.complete();
    this._chatMessage$.complete();
    this._chatTyping$.complete();
    this._logisticsUpdate$.complete();
    this._logisticsSynced$.complete();
    this._memberUpdate$.complete();
  }
}
