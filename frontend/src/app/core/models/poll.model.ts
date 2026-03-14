export type PollStatus = 'ACTIVE' | 'CLOSED';
export type PollCategory = 'MOVIE_NIGHT' | 'FOOD_CHOICE' | 'ACTIVITY' | 'FAMILY_OUTING' | 'OTHER';

export interface PollOption {
  id: string;
  text: string;
  emoji?: string;
  voteCount: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  category: PollCategory;
  status: PollStatus;
  closesAt?: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  };
  options: PollOption[];
  totalVotes: number;
  userVote?: {
    optionId: string;
  };
}

export interface CreatePollDto {
  title: string;
  description?: string;
  category?: PollCategory;
  options: {
    text: string;
    emoji?: string;
  }[];
  closesAt?: string;
}

export interface VoteDto {
  optionId: string;
}

// Hebrew labels for categories
export const POLL_CATEGORY_LABELS: Record<PollCategory, { emoji: string; label: string }> = {
  'MOVIE_NIGHT': { emoji: '🎬', label: 'ערב סרטים' },
  'FOOD_CHOICE': { emoji: '🍕', label: 'בחירת אוכל' },
  'ACTIVITY': { emoji: '🎯', label: 'פעילות' },
  'FAMILY_OUTING': { emoji: '👨‍👩‍👧‍👦', label: 'יציאה משפחתית' },
  'OTHER': { emoji: '✨', label: 'אחר' }
};
