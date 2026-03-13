export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TaskCategory = 'CHORE' | 'HOMEWORK' | 'ERRAND' | 'HEALTH' | 'SOCIAL' | 'OTHER';

export interface Task {
  id: string;
  householdId: string;
  createdById: string;
  assignedToId?: string;
  title: string;
  description?: string;
  category: TaskCategory;
  isMustDo: boolean;
  coinReward: number;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  completedById?: string;
  recurrence?: TaskRecurrence;
  // Populated fields
  createdBy?: { id: string; name: string };
  assignedTo?: { id: string; name: string; avatarUrl?: string };
  completedBy?: { id: string; name: string };
}

export interface TaskRecurrence {
  type: 'daily' | 'weekly' | 'monthly';
  days?: number[];
  endDate?: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  category?: TaskCategory;
  assignedToId?: string;
  isMustDo?: boolean;
  coinReward?: number;
  dueDate?: string;
  recurrence?: TaskRecurrence;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  category?: TaskCategory;
  assignedToId?: string;
  isMustDo?: boolean;
  coinReward?: number;
  dueDate?: string;
  status?: TaskStatus;
  recurrence?: TaskRecurrence;
}

export interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}
