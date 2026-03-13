export interface Reward {
  id: string;
  householdId: string;
  name: string;
  description?: string;
  coinCost: number;
  stock: number | null; // null = unlimited
  iconUrl?: string;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRewardDto {
  name: string;
  description?: string;
  coinCost: number;
  stock?: number;
  iconUrl?: string;
}

export type RedemptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';

export interface RedemptionRecord {
  id: string;
  rewardId: string;
  userId: string;
  status: RedemptionStatus;
  coinsSpent: number;
  rejectionReason?: string;
  fulfilledAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  reward?: { id: string; name: string; iconUrl?: string };
  user?: { id: string; name: string; avatarUrl?: string };
}
