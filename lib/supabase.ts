import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});

// Database types
export interface Family {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  family_id: string;
  user_id: string;
  name: string;
  avatar: string;
  color: string;
  role: 'admin' | 'member';
  points?: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  location: string | null;
  category: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  event_id: string;
  member_id: string;
}

export interface AudioMessage {
  id: string;
  event_id: string;
  member_id: string;
  data: string;
  duration: number | null;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  family_id: string;
  name: string;
  urgency: string;
  needed_by: string | null;
  added_by: string;
  is_completed: boolean;
  image: string | null;
  link: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface WishListItem {
  id: string;
  family_id: string;
  name: string;
  occasion: string | null;
  priority: string;
  owner_id: string;
  link: string | null;
  image: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

