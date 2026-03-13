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
}

export interface ClientToServerEvents {
  'task:complete': (data: { taskId: string }, callback: (response: { success: boolean; coinsEarned: number }) => void) => void;
  'mood:update': (data: { mood: string; note?: string }, callback: (response: { success: boolean }) => void) => void;
  'presence:heartbeat': () => void;
  'household:join': (data: { householdId: string }) => void;
}

export interface SocketData {
  userId: string;
  householdId: string;
  role: Role;
}
