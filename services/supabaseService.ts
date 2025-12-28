import { supabase, Family, Member, Event, EventAttendee, AudioMessage, ShoppingItem, WishListItem } from '../lib/supabase';
import { CalendarEvent, FamilyMember, ShoppingItem as AppShoppingItem, WishListItem as AppWishListItem, EventCategory } from '../types';

// Authentication
export const authService = {
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async waitForSession(maxAttempts = 15, delay = 300) {
    for (let i = 0; i < maxAttempts; i++) {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshedSession?.user) {
          const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
          
          if (verifiedUser && verifiedUser.id === refreshedSession.user.id) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return refreshedSession.user;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    const { data: { session: finalSession } } = await supabase.auth.refreshSession();
    if (finalSession?.user) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return finalSession.user;
    }
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  },
};

// Generate a unique join code (6 alphanumeric characters)
function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Family operations
export const familyService = {
  async createFamily(
    familyName: string,
    userId: string,
    memberName: string,
    avatar: string,
    color: string
  ) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Not authenticated');
    }
    if (user.id !== userId) {
      throw new Error('User mismatch');
    }

    const joinCode = generateJoinCode();

    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: familyName,
        join_code: joinCode,
      })
      .select('*')
      .single();

    if (familyError) {
      console.error('Family insert error', familyError);
      throw familyError;
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        family_id: family.id,
        user_id: user.id,
        name: memberName,
        avatar,
        color,
        role: 'admin',
      })
      .select('*')
      .single();

    if (memberError) {
      console.error('Member insert error', memberError);
      throw memberError;
    }

    return { family, member };
  },

  async getUserFamilies(userId: string) {
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        family:families(*)
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  },

  async joinFamilyByCode(
    code: string,
    userId: string,
    memberName: string,
    avatar: string,
    color: string
  ) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Not authenticated');
    if (user.id !== userId) throw new Error('User mismatch');

    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('join_code', code)
      .single();

    if (familyError || !family) {
      throw new Error('Family not found for this code');
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        family_id: family.id,
        user_id: user.id,
        name: memberName,
        avatar,
        color,
        role: 'member',
      })
      .select('*')
      .single();

    if (memberError) {
      console.error('Join family member insert error', memberError);
      throw memberError;
    }

    return { family, member };
  },

  async getFamilyMembers(familyId: string) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
    return data.map(m => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar || '👤',
      color: m.color,
      isAdmin: m.role === 'admin',
    }));
  },

  async updateMember(memberId: string, updates: Partial<Member>) {
    const { error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', memberId);

    if (error) throw error;
  },

  async deleteMember(memberId: string) {
    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
  },

  async getFamily(familyId: string) {
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();

    if (error) throw error;
    return data;
  },
};

// Event operations
export const eventService = {
  async getFamilyEvents(familyId: string) {
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        audioMessages:audio_messages(*)
      `)
      .eq('family_id', familyId);

    if (error) throw error;
    
    // Get attendees for each event
    const eventsWithAttendees = await Promise.all(
      events.map(async (e: any) => {
        const { data: attendees } = await supabase
          .from('event_attendees')
          .select('member_id')
          .eq('event_id', e.id);
        
        return {
          ...e,
          memberIds: attendees?.map(a => a.member_id) || [],
        };
      })
    );

    return eventsWithAttendees.map((e: any): CalendarEvent => ({
      id: e.id,
      title: e.title,
      description: e.description || undefined,
      start: new Date(e.start),
      end: new Date(e.end),
      location: e.location || undefined,
      category: e.category,
      memberIds: e.memberIds,
      audioMessages: e.audioMessages?.map((am: any) => ({
        authorId: am.member_id,
        data: am.data,
        duration: am.duration || 0,
      })) || [],
    }));
  },

  async createEvent(familyId: string, event: Omit<CalendarEvent, 'id'>, createdBy: string) {
    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        family_id: familyId,
        title: event.title,
        description: event.description || null,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        location: event.location || null,
        category: event.category,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error || !newEvent) {
      console.error('Error creating event:', error);
      throw error;
    }

    // Add attendees
    if (event.memberIds.length > 0) {
      const { error: attendeesError } = await supabase
        .from('event_attendees')
        .insert(
          event.memberIds.map(memberId => ({
            event_id: newEvent.id,
            member_id: memberId,
          }))
        );
      if (attendeesError) {
        console.error('Error adding event attendees:', attendeesError);
        throw attendeesError;
      }
    }

    // Add audio messages if any
    if (event.audioMessages && event.audioMessages.length > 0) {
      const { error: audioError } = await supabase
        .from('audio_messages')
        .insert(
          event.audioMessages.map(am => ({
            event_id: newEvent.id,
            member_id: am.authorId,
            data: am.data,
            duration: am.duration,
          }))
        );
      if (audioError) {
        console.error('Error adding audio messages:', audioError);
        throw audioError;
      }
    }

    return newEvent;
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>) {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.start !== undefined) updateData.start = updates.start.toISOString();
    if (updates.end !== undefined) updateData.end = updates.end.toISOString();
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.category !== undefined) updateData.category = updates.category;

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId);

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    // Handle memberIds update separately
    if (updates.memberIds !== undefined) {
      const { error: deleteAttendeesError } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId);
      if (deleteAttendeesError) {
        console.error('Error deleting existing attendees:', deleteAttendeesError);
        throw deleteAttendeesError;
      }

      if (updates.memberIds.length > 0) {
        const { error: insertAttendeesError } = await supabase
          .from('event_attendees')
          .insert(
            updates.memberIds.map(memberId => ({
              event_id: eventId,
              member_id: memberId,
            }))
          );
        if (insertAttendeesError) {
          console.error('Error inserting new attendees:', insertAttendeesError);
          throw insertAttendeesError;
        }
      }
    }

    // Handle audioMessages update separately
    if (updates.audioMessages !== undefined) {
      const { error: deleteAudioError } = await supabase
        .from('audio_messages')
        .delete()
        .eq('event_id', eventId);
      if (deleteAudioError) {
        console.error('Error deleting existing audio messages:', deleteAudioError);
        throw deleteAudioError;
      }

      if (updates.audioMessages.length > 0) {
        const { error: insertAudioError } = await supabase
          .from('audio_messages')
          .insert(
            updates.audioMessages.map(am => ({
              event_id: eventId,
              member_id: am.authorId,
              data: am.data,
              duration: am.duration,
            }))
          );
        if (insertAudioError) {
          console.error('Error inserting new audio messages:', insertAudioError);
          throw insertAudioError;
        }
      }
    }
  },

  async deleteEvent(eventId: string) {
    console.log('eventService.deleteEvent called with:', eventId);
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('Error deleting event from Supabase:', error);
      throw error;
    }
    console.log('Event deleted successfully from Supabase:', eventId);
  },
};

// Shopping list operations
export const shoppingService = {
  async getFamilyShoppingItems(familyId: string) {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
    return data.map((item: any): AppShoppingItem => ({
      id: item.id,
      name: item.name,
      urgency: item.urgency,
      neededBy: item.needed_by ? new Date(item.needed_by) : undefined,
      addedBy: item.added_by,
      isCompleted: item.is_completed,
      image: item.image || undefined,
      link: item.link || undefined,
      comments: item.comments || undefined,
    }));
  },

  async createShoppingItem(familyId: string, item: Omit<AppShoppingItem, 'id'>) {
    const { data, error } = await supabase
      .from('shopping_items')
      .insert({
        family_id: familyId,
        name: item.name,
        urgency: item.urgency,
        needed_by: item.neededBy?.toISOString() || null,
        added_by: item.addedBy,
        is_completed: item.isCompleted,
        image: item.image || null,
        link: item.link || null,
        comments: item.comments || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateShoppingItem(itemId: string, updates: Partial<AppShoppingItem>) {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.urgency !== undefined) updateData.urgency = updates.urgency;
    if (updates.neededBy !== undefined) updateData.needed_by = updates.neededBy?.toISOString() || null;
    if (updates.isCompleted !== undefined) updateData.is_completed = updates.isCompleted;
    if (updates.image !== undefined) updateData.image = updates.image;
    if (updates.link !== undefined) updateData.link = updates.link;
    if (updates.comments !== undefined) updateData.comments = updates.comments;

    const { error } = await supabase
      .from('shopping_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) throw error;
  },

  async deleteShoppingItem(itemId: string) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },
};

// Wish list operations
export const wishListService = {
  async getFamilyWishListItems(familyId: string) {
    const { data, error } = await supabase
      .from('wish_list_items')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
    return data.map((item: any): AppWishListItem => ({
      id: item.id,
      name: item.name,
      occasion: item.occasion || undefined,
      priority: item.priority,
      ownerId: item.owner_id,
      link: item.link || undefined,
      image: item.image || undefined,
      comments: item.comments || undefined,
    }));
  },

  async createWishListItem(familyId: string, item: Omit<AppWishListItem, 'id'>) {
    const { data, error } = await supabase
      .from('wish_list_items')
      .insert({
        family_id: familyId,
        name: item.name,
        occasion: item.occasion || null,
        priority: item.priority,
        owner_id: item.ownerId,
        link: item.link || null,
        image: item.image || null,
        comments: item.comments || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateWishListItem(itemId: string, updates: Partial<AppWishListItem>) {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.occasion !== undefined) updateData.occasion = updates.occasion;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.link !== undefined) updateData.link = updates.link;
    if (updates.image !== undefined) updateData.image = updates.image;
    if (updates.comments !== undefined) updateData.comments = updates.comments;

    const { error } = await supabase
      .from('wish_list_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) throw error;
  },

  async deleteWishListItem(itemId: string) {
    const { error } = await supabase
      .from('wish_list_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },
};

