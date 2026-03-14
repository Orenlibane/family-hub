import { Component, ChangeDetectionStrategy, inject, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatStore, HouseholdStore } from '../../../core/stores';
import { AuthService, ThemeService, UITheme } from '../../../core/services';
import { ChatMessage } from '../../../core/models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-page" dir="rtl">
      <!-- Animated Stars Background -->
      <div class="stars-container">
        <div class="stars stars-1"></div>
        <div class="stars stars-2"></div>
        <div class="nebula nebula-1"></div>
        <div class="nebula nebula-2"></div>
      </div>

      <div class="chat-container">
        <!-- Header -->
        <header class="chat-header">
          <div class="header-content">
            <span class="header-icon">💬</span>
            <div>
              <h1>צ'אט משפחתי</h1>
              <p>{{ (members$ | async)?.length }} בני משפחה</p>
            </div>
            <span class="header-mascot">🐿️</span>
          </div>
        </header>

        <!-- Messages Area -->
        <div class="messages-area" #messagesContainer>
          @if (isLoading$ | async) {
            <div class="loading-state">
              <div class="loading-spinner">🌀</div>
              <p>טוען הודעות...</p>
            </div>
          }

          @if (hasMore$ | async) {
            <button class="load-more-btn" (click)="loadMore()">
              <span>📜</span> טען הודעות קודמות
            </button>
          }

          <div class="messages-list">
            @for (message of messages$ | async; track message.id) {
              <div class="message" [class.own]="message.sender.id === (user$ | async)?.id">
                <div class="message-avatar" [class.has-image]="message.sender.avatarUrl">
                  @if (message.sender.avatarUrl) {
                    <img [src]="message.sender.avatarUrl" alt="" class="message-avatar-img" />
                  } @else {
                    {{ message.sender.name?.charAt(0) || '?' }}
                  }
                </div>
                <div class="message-content">
                  <div class="message-header">
                    <span class="sender-name">{{ message.sender.name }}</span>
                    <span class="message-time">{{ formatTime(message.createdAt) }}</span>
                  </div>
                  <div class="message-bubble">
                    {{ message.content }}
                  </div>
                </div>
              </div>
            } @empty {
              @if (!(isLoading$ | async)) {
                <div class="empty-state">
                  <div class="empty-icon">💬</div>
                  <h3>אין עדיין הודעות</h3>
                  <p>התחילו לדבר!</p>
                  <div class="empty-mascot">🐿️✨</div>
                </div>
              }
            }
          </div>

          <!-- Typing Indicator -->
          @if ((typingUsers$ | async)?.length) {
            <div class="typing-indicator">
              <div class="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <span>{{ getTypingText(typingUsers$ | async) }}</span>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <form (ngSubmit)="sendMessage()" class="message-form">
            <input
              type="text"
              [(ngModel)]="messageText"
              name="message"
              class="message-input"
              placeholder="כתוב הודעה..."
              (input)="onTyping()"
              autocomplete="off"
            />
            <button
              type="submit"
              class="send-btn"
              [disabled]="!messageText.trim() || (isSending$ | async)"
            >
              <span>📤</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }

    .chat-page {
      height: 100%;
      background: linear-gradient(135deg, #0a0a1a 0%, #12122a 50%, #1a1a3a 100%);
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .stars-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    .stars {
      position: absolute;
      inset: 0;
      background-repeat: repeat;
    }

    .stars-1 {
      background-image: radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                        radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent);
      background-size: 200px 200px;
      animation: stars-move 100s linear infinite;
    }

    .stars-2 {
      background-image: radial-gradient(1px 1px at 50px 80px, #fff, transparent);
      background-size: 300px 300px;
      animation: stars-move 150s linear infinite;
    }

    @keyframes stars-move {
      from { transform: translateY(0); }
      to { transform: translateY(-100%); }
    }

    .nebula {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.3;
    }

    .nebula-1 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, #10b981, transparent);
      top: -100px;
      right: -100px;
    }

    .nebula-2 {
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, #3b82f6, transparent);
      bottom: -100px;
      left: -100px;
    }

    .chat-container {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
    }

    .chat-header {
      padding: 16px 20px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }

    .header-icon { font-size: 2rem; }
    .header-content h1 { font-size: 1.3rem; font-weight: 700; color: white; margin: 0; }
    .header-content p { color: rgba(255,255,255,0.6); margin: 2px 0 0; font-size: 0.85rem; }
    .header-mascot {
      position: absolute;
      left: 0;
      font-size: 1.5rem;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }

    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
    }

    .loading-state {
      text-align: center;
      padding: 40px;
    }

    .loading-spinner {
      font-size: 3rem;
      animation: spin 2s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .loading-state p {
      color: rgba(255,255,255,0.6);
      margin-top: 12px;
    }

    .load-more-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      cursor: pointer;
      margin: 0 auto 20px;
      transition: all 0.2s;
    }

    .load-more-btn:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }

    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
    }

    .message {
      display: flex;
      gap: 12px;
      max-width: 80%;
    }

    .message.own {
      flex-direction: row-reverse;
      margin-right: auto;
      margin-left: 0;
    }

    .message:not(.own) {
      margin-left: auto;
    }

    .message-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .message.own .message-avatar {
      background: linear-gradient(135deg, #10b981, #059669);
    }

    .message-avatar.has-image {
      padding: 0;
      overflow: hidden;
    }

    .message-avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 4px;
    }

    .sender-name {
      color: rgba(255,255,255,0.8);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .message-time {
      color: rgba(255,255,255,0.4);
      font-size: 0.75rem;
    }

    .message-bubble {
      padding: 12px 16px;
      background: rgba(255,255,255,0.1);
      border-radius: 18px;
      border-top-right-radius: 4px;
      color: white;
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .message.own .message-bubble {
      background: linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.3));
      border-radius: 18px;
      border-top-left-radius: 4px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 24px;
      margin: auto;
    }

    .empty-icon { font-size: 4rem; margin-bottom: 16px; animation: float 3s ease-in-out infinite; }
    .empty-state h3 { color: white; font-size: 1.3rem; margin: 0 0 8px; }
    .empty-state p { color: rgba(255,255,255,0.5); margin: 0; }
    .empty-mascot { font-size: 2rem; margin-top: 20px; }

    .typing-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      color: rgba(255,255,255,0.6);
      font-size: 0.85rem;
    }

    .typing-dots {
      display: flex;
      gap: 4px;
    }

    .typing-dots span {
      width: 6px;
      height: 6px;
      background: rgba(255,255,255,0.4);
      border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out;
    }

    .typing-dots span:nth-child(1) { animation-delay: 0s; }
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .input-area {
      padding: 16px 20px 24px;
      background: rgba(255,255,255,0.05);
      backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255,255,255,0.1);
    }

    .message-form {
      display: flex;
      gap: 12px;
    }

    .message-input {
      flex: 1;
      padding: 14px 20px;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      color: white;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }

    .message-input:focus {
      border-color: rgba(16,185,129,0.5);
      box-shadow: 0 0 20px rgba(16,185,129,0.2);
    }

    .message-input::placeholder {
      color: rgba(255,255,255,0.4);
    }

    .send-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      cursor: pointer;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(16,185,129,0.4);
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(16,185,129,0.5);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .message { max-width: 90%; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private readonly chatStore = inject(ChatStore);
  private readonly householdStore = inject(HouseholdStore);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  messages$ = this.chatStore.messages$;
  typingUsers$ = this.chatStore.typingUsers$;
  isLoading$ = this.chatStore.isLoading$;
  isSending$ = this.chatStore.isSending$;
  hasMore$ = this.chatStore.hasMore$;
  user$ = this.authService.user$;
  members$ = this.householdStore.members$;

  currentTheme: UITheme = this.themeService.getCurrentTheme();
  messageText = '';
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;
  private shouldScrollToBottom = true;

  constructor() {
    this.chatStore.loadMessages();
    this.householdStore.loadHousehold();

    this.themeService.currentTheme$.subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });

    // Subscribe to new messages to scroll to bottom
    this.chatStore.messages$.subscribe(() => {
      this.shouldScrollToBottom = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {}
  }

  loadMore(): void {
    this.chatStore.loadMoreMessages();
  }

  sendMessage(): void {
    const content = this.messageText.trim();
    if (!content) return;

    this.chatStore.sendMessage({ content }).subscribe({
      next: () => {
        this.messageText = '';
        this.chatStore.sendTypingIndicator(false);
        this.shouldScrollToBottom = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error sending message:', err);
      }
    });
  }

  onTyping(): void {
    // Send typing indicator
    this.chatStore.sendTypingIndicator(true);

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Stop typing indicator after 2 seconds of no input
    this.typingTimeout = setTimeout(() => {
      this.chatStore.sendTypingIndicator(false);
    }, 2000);
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isYesterday) {
      return 'אתמול ' + date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) +
           ' ' + date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  getTypingText(typingUserIds: string[] | null): string {
    if (!typingUserIds || typingUserIds.length === 0) return '';
    if (typingUserIds.length === 1) return 'מישהו מקליד...';
    return `${typingUserIds.length} אנשים מקלידים...`;
  }
}
