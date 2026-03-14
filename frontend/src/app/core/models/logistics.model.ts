export type LogisticsCategory = 'PICKUP' | 'ACTIVITY' | 'SHOPPING' | 'CHORE';

export interface LogisticsItem {
  id: string;
  title: string;
  category: LogisticsCategory;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  timeSlot?: string;
  notes?: string;
  createdAt: string;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
    avatarUrl?: string;
    role?: 'ADMIN' | 'ADULT' | 'KID';
  };
  createdBy: {
    id: string;
    name: string;
  };
}

export interface CreateLogisticsDto {
  title: string;
  category: LogisticsCategory;
  dayOfWeek: number;
  timeSlot?: string;
  notes?: string;
  assignedToId?: string;
}

export interface UpdateLogisticsDto {
  title?: string;
  category?: LogisticsCategory;
  dayOfWeek?: number;
  timeSlot?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
}

export interface BulkSaveLogisticsDto {
  items: {
    id?: string;
    title: string;
    category: LogisticsCategory;
    dayOfWeek: number;
    timeSlot?: string;
    notes?: string;
    assignedToId?: string | null;
  }[];
  deleteIds?: string[];
}

// Hebrew labels for categories
export const LOGISTICS_CATEGORY_LABELS: Record<LogisticsCategory, { emoji: string; label: string }> = {
  'PICKUP': { emoji: '🎒', label: 'איסוף מסגרות' },
  'ACTIVITY': { emoji: '🎨', label: 'חוגים' },
  'SHOPPING': { emoji: '🛒', label: 'קניות וסידורים' },
  'CHORE': { emoji: '🧹', label: 'מטלות' }
};

// Hebrew day names
export const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Family member interface for avatar dock
export interface FamilyMember {
  id: string;
  name: string;
  avatarUrl?: string;
  imageUrl?: string; // Custom family image path
  role: 'ADMIN' | 'ADULT' | 'KID';
}
