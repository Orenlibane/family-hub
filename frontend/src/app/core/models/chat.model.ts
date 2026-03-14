export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string;
    avatarState?: unknown;
  };
}

export interface SendMessageDto {
  content: string;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}
