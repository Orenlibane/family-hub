import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { SocketService, ChatTypingEvent } from '../services/socket.service';
import { ChatMessage, ChatMessagesResponse, SendMessageDto } from '../models';

interface ChatState {
  messages: ChatMessage[];
  typingUsers: string[];
  isLoading: boolean;
  isSending: boolean;
  hasMore: boolean;
  nextCursor?: string;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ChatStore implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private typingTimeout: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private readonly _state$ = new BehaviorSubject<ChatState>({
    messages: [],
    typingUsers: [],
    isLoading: false,
    isSending: false,
    hasMore: false,
    error: null
  });

  // Public selectors
  readonly state$ = this._state$.asObservable();
  readonly messages$ = this._state$.pipe(map(s => s.messages));
  readonly typingUsers$ = this._state$.pipe(map(s => s.typingUsers));
  readonly isLoading$ = this._state$.pipe(map(s => s.isLoading));
  readonly isSending$ = this._state$.pipe(map(s => s.isSending));
  readonly hasMore$ = this._state$.pipe(map(s => s.hasMore));
  readonly error$ = this._state$.pipe(map(s => s.error));

  constructor(
    private api: ApiService,
    private socket: SocketService
  ) {
    this.subscribeToSocketEvents();
  }

  private subscribeToSocketEvents(): void {
    // New message
    this.socket.chatMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        const current = this._state$.value.messages;
        // Avoid duplicates
        if (!current.find(m => m.id === message.id)) {
          this.updateState({
            messages: [...current, message]
          });
        }
      });

    // Typing indicator
    this.socket.chatTyping$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: ChatTypingEvent) => {
        this.handleTypingEvent(event);
      });
  }

  private handleTypingEvent(event: ChatTypingEvent): void {
    const current = this._state$.value.typingUsers;

    // Clear existing timeout for this user
    const existingTimeout = this.typingTimeout.get(event.userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (event.isTyping) {
      // Add to typing users if not already there
      if (!current.includes(event.userId)) {
        this.updateState({
          typingUsers: [...current, event.userId]
        });
      }

      // Auto-remove after 3 seconds of no typing
      const timeout = setTimeout(() => {
        const typing = this._state$.value.typingUsers;
        this.updateState({
          typingUsers: typing.filter(id => id !== event.userId)
        });
        this.typingTimeout.delete(event.userId);
      }, 3000);

      this.typingTimeout.set(event.userId, timeout);
    } else {
      // Remove from typing users
      this.updateState({
        typingUsers: current.filter(id => id !== event.userId)
      });
      this.typingTimeout.delete(event.userId);
    }
  }

  loadMessages(): void {
    this.updateState({ isLoading: true, error: null });

    this.api.get<ChatMessagesResponse>('/api/chat/messages')
      .pipe(
        tap(response => {
          this.updateState({
            messages: response.messages,
            hasMore: response.hasMore,
            nextCursor: response.nextCursor || undefined,
            isLoading: false
          });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load messages'
          });
          return of({ messages: [], hasMore: false });
        })
      )
      .subscribe();
  }

  loadMoreMessages(): void {
    const { nextCursor, hasMore, isLoading } = this._state$.value;
    if (!hasMore || isLoading || !nextCursor) return;

    this.updateState({ isLoading: true });

    this.api.get<ChatMessagesResponse>('/api/chat/messages', { cursor: nextCursor })
      .pipe(
        tap(response => {
          const current = this._state$.value.messages;
          this.updateState({
            messages: [...response.messages, ...current],
            hasMore: response.hasMore,
            nextCursor: response.nextCursor || undefined,
            isLoading: false
          });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load more messages'
          });
          return of({ messages: [], hasMore: false });
        })
      )
      .subscribe();
  }

  sendMessage(dto: SendMessageDto): Observable<ChatMessage> {
    this.updateState({ isSending: true, error: null });

    return this.api.post<ChatMessage>('/api/chat/messages', dto).pipe(
      tap(message => {
        const current = this._state$.value.messages;
        // Add if not already added via socket
        if (!current.find(m => m.id === message.id)) {
          this.updateState({
            messages: [...current, message],
            isSending: false
          });
        } else {
          this.updateState({ isSending: false });
        }
      }),
      catchError(error => {
        this.updateState({
          isSending: false,
          error: error.message || 'Failed to send message'
        });
        throw error;
      })
    );
  }

  deleteMessage(messageId: string): Observable<void> {
    return this.api.delete<void>(`/api/chat/messages/${messageId}`).pipe(
      tap(() => {
        const current = this._state$.value.messages;
        this.updateState({
          messages: current.filter(m => m.id !== messageId)
        });
      }),
      catchError(error => {
        this.updateState({
          error: error.message || 'Failed to delete message'
        });
        throw error;
      })
    );
  }

  sendTypingIndicator(isTyping: boolean): void {
    this.socket.sendTyping(isTyping);
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  private updateState(partial: Partial<ChatState>): void {
    this._state$.next({
      ...this._state$.value,
      ...partial
    });
  }

  ngOnDestroy(): void {
    // Clear all typing timeouts
    this.typingTimeout.forEach(timeout => clearTimeout(timeout));
    this.typingTimeout.clear();

    this.destroy$.next();
    this.destroy$.complete();
  }
}
