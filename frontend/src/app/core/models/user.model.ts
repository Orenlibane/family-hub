export type Role = 'ADMIN' | 'ADULT' | 'KID';

export type Mood = 'GREAT' | 'GOOD' | 'OKAY' | 'SAD' | 'ANGRY';

export interface AvatarState {
  level: number;
  type: string;
  accessories?: string[];
}

export interface User {
  id: string;
  householdId: string;
  email: string;
  googleId?: string;
  role: Role;
  name: string;
  avatar?: string; // Emoji avatar
  avatarUrl?: string;
  avatarState?: AvatarState;
  famCoins: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MoodLog {
  id: string;
  userId: string;
  householdId: string;
  mood: Mood;
  note?: string;
  createdAt: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
  members?: User[];
}

export interface AuthState {
  user: User | null;
  household: Household | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
