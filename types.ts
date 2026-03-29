
export enum EventCategory {
  FAMILY = 'Family',
  WORK = 'Work',
  SCHOOL = 'School',
  STUDY = 'Study',
  FUN = 'Fun',
  CHORE = 'Chore',
  HEALTH = 'Health',
  OTHER = 'Other'
}

export enum StudySubject {
  MATHS = 'Maths',
  ENGLISH = 'English',
  VERBAL_REASONING = 'Verbal Reasoning',
  NON_VERBAL_REASONING = 'Non-Verbal Reasoning',
  CREATIVE_WRITING = 'Creative Writing'
}

export type ThemeColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'sky' | 'violet' | 'blue' | 'purple' | 'cyan' | 'teal' | 'pink';

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string; // URL or emoji
  color: ThemeColor; // Now strictly typed
  isAdmin?: boolean;
  points?: number; // Total points earned
  // 11+ student profile
  isStudent?: boolean;
  examDate?: string;         // ISO date string YYYY-MM-DD
  targetSchools?: string[];
  yearGroup?: string;        // e.g. "Year 5", "Year 6"
  studySubjects?: StudySubject[];
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
  studySubject?: StudySubject; // For Study category events
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
  rewardPoints?: number; // If set, this item is a study reward unlocked at this point threshold
}
