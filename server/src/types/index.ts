import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  householdId: string;
  role: Role;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  householdId: string;
  famCoins: number;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Socket.io types
export interface ServerToClientEvents {
  'task:created': (task: unknown) => void;
  'task:updated': (task: unknown) => void;
  'task:completed': (data: { task: unknown; coinsEarned: number }) => void;
  'task:deleted': (task: unknown) => void;
  'coins:changed': (data: { userId: string; amount: number; newBalance: number; reason: string }) => void;
  'mood:updated': (data: { userId: string; mood: string }) => void;
  'mood:family': (data: { mood: string }) => void;
  'notification': (data: { type: string; message: string; data?: unknown }) => void;
  // Poll events
  'poll:created': (poll: unknown) => void;
  'poll:voted': (data: { pollId: string; results: unknown }) => void;
  'poll:closed': (poll: unknown) => void;
  // Chat events
  'chat:message': (message: unknown) => void;
  'chat:typing': (data: { userId: string; isTyping: boolean }) => void;
  // Logistics events
  'logistics:created': (item: unknown) => void;
  'logistics:updated': (item: unknown) => void;
  'logistics:deleted': (data: { id: string }) => void;
  'logistics:synced': (data: { items: unknown[] }) => void;
  // Member events
  'member:added': (member: unknown) => void;
  'member:updated': (member: unknown) => void;
  'member:removed': (userId: string) => void;
}

export interface ClientToServerEvents {
  'task:complete': (data: { taskId: string }, callback: (response: { success: boolean; coinsEarned: number }) => void) => void;
  'mood:update': (data: { mood: string; note?: string }, callback: (response: { success: boolean }) => void) => void;
  'presence:heartbeat': () => void;
  'household:join': (data: { householdId: string }) => void;
  // Chat events
  'chat:typing': (data: { isTyping: boolean }) => void;
}

export interface SocketData {
  userId: string;
  householdId: string;
  role: Role;
}
