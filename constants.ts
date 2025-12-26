import { EventCategory, FamilyMember, CalendarEvent, ThemeColor } from './types';

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: '1', name: 'Mom', avatar: '👩‍🦱', color: 'rose', isAdmin: true },
  { id: '2', name: 'Dad', avatar: '👨‍🦰', color: 'blue' },
  { id: '3', name: 'Mia', avatar: '👧', color: 'amber' },
  { id: '4', name: 'Leo', avatar: '👦', color: 'emerald' },
];

export const AVAILABLE_AVATARS = ['👩‍🦱', '👨‍🦰', '👧', '👦', '👵', '👴', '👶', '🐶', '🐱', '🐹', '🦊', '🐼', '🤖', '👽', '🦄', '🐲', '🦸‍♀️', '🦸‍♂️', '🧙‍♀️', '🧚‍♀️'];

export const THEME_OPTIONS: { label: string; value: ThemeColor; color: string }[] = [
  { label: 'Indigo', value: 'indigo', color: 'bg-indigo-500' },
  { label: 'Blue', value: 'blue', color: 'bg-blue-500' },
  { label: 'Sky', value: 'sky', color: 'bg-sky-500' },
  { label: 'Cyan', value: 'cyan', color: 'bg-cyan-500' },
  { label: 'Teal', value: 'teal', color: 'bg-teal-500' },
  { label: 'Emerald', value: 'emerald', color: 'bg-emerald-500' },
  { label: 'Amber', value: 'amber', color: 'bg-amber-500' },
  { label: 'Rose', value: 'rose', color: 'bg-rose-500' },
  { label: 'Pink', value: 'pink', color: 'bg-pink-500' },
  { label: 'Purple', value: 'purple', color: 'bg-purple-500' },
  { label: 'Violet', value: 'violet', color: 'bg-violet-500' },
];

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

export const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: '101',
    title: 'Family Movie Night',
    description: 'Watching the new animated superhero movie!',
    start: new Date(today.setHours(19, 0, 0, 0)),
    end: new Date(today.setHours(21, 0, 0, 0)),
    category: EventCategory.FUN,
    memberIds: ['1', '2', '3', '4']
  },
  {
    id: '102',
    title: 'Soccer Practice',
    description: 'Bring shin guards and water bottle',
    start: new Date(tomorrow.setHours(16, 30, 0, 0)),
    end: new Date(tomorrow.setHours(18, 0, 0, 0)),
    category: EventCategory.FUN,
    location: 'City Park Field 4',
    memberIds: ['4'] // Leo
  },
  {
    id: '103',
    title: 'Grocery Shopping',
    description: 'Milk, eggs, bread, and snacks',
    start: new Date(tomorrow.setHours(10, 0, 0, 0)),
    end: new Date(tomorrow.setHours(11, 30, 0, 0)),
    category: EventCategory.CHORE,
    memberIds: ['1', '2']
  },
  {
    id: '104',
    title: 'Piano Lesson',
    start: new Date(nextWeek.setHours(15, 0, 0, 0)),
    end: new Date(nextWeek.setHours(16, 0, 0, 0)),
    category: EventCategory.SCHOOL,
    location: 'Music Academy',
    memberIds: ['3'] // Mia
  }
];

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  [EventCategory.FAMILY]: 'bg-purple-100 text-purple-800 border-purple-200',
  [EventCategory.WORK]: 'bg-slate-100 text-slate-800 border-slate-200',
  [EventCategory.SCHOOL]: 'bg-blue-100 text-blue-800 border-blue-200',
  [EventCategory.FUN]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [EventCategory.CHORE]: 'bg-orange-100 text-orange-800 border-orange-200',
  [EventCategory.HEALTH]: 'bg-rose-100 text-rose-800 border-rose-200',
  [EventCategory.OTHER]: 'bg-gray-100 text-gray-800 border-gray-200',
};