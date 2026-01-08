
export enum EventCategory {
  FAMILY = 'Family',
  WORK = 'Work',
  SCHOOL = 'School',
  FUN = 'Fun',
  CHORE = 'Chore',
  HEALTH = 'Health',
  OTHER = 'Other'
}

export type ThemeColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'sky' | 'violet' | 'blue' | 'purple' | 'cyan' | 'teal' | 'pink';

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string; // URL or emoji
  color: ThemeColor; // Now strictly typed
  isAdmin?: boolean;
  points?: number; // Total points earned
}

export interface AudioMessage {
  data: string; // Base64 encoded audio
  duration: number; // Seconds (approx)
  authorId: string;
  timestamp: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  category: EventCategory;
  memberIds: string[]; // IDs of family members involved (attendees)
  createdBy?: string; // ID of the member who created/organized the event
  audioMessages?: AudioMessage[];
  isCompleted?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export type ChatActionType = 'ADD' | 'UPDATE' | 'DELETE';

export interface ChatAction {
  type: ChatActionType;
  payload: any;
}

export interface ChatResponse {
  text: string;
  action?: ChatAction;
}

export interface ShoppingItem {
  id: string;
  name: string;
  urgency: 'normal' | 'urgent' | 'critical';
  neededBy?: Date;
  addedBy: string; // memberId
  isCompleted: boolean;
  image?: string;
  link?: string;
  comments?: string;
}

export interface WishListItem {
  id: string;
  name: string;
  occasion: string;
  priority: 'low' | 'medium' | 'high';
  ownerId: string; // memberId
  link?: string;
  image?: string;
  comments?: string;
}
