export type EventCategory = 'SCHOOL' | 'WORK' | 'FAMILY' | 'MEDICAL' | 'ACTIVITY';

export interface CalendarEvent {
  id: string;
  householdId: string;
  titleHe: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category: EventCategory;
  isRecurring: boolean;
  recurrenceRule?: string;
}

export interface CreateEventDto {
  titleHe: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  category: EventCategory;
  isRecurring?: boolean;
  recurrenceRule?: string;
}
