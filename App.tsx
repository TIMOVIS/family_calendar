
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle, 
  Calendar as CalendarIcon, 
  List, 
  Home, 
  Clock, 
  Sparkles, 
  MapPin, 
  Settings, 
  LogOut, 
  Mic, 
  RefreshCw, 
  Play, 
  Square, 
  ShoppingBag, 
  Gift, 
  Info, 
  Users, 
  Filter, 
  XCircle, 
  ChevronDown,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { 
  getDaysInMonth, 
  getDayName, 
  isSameDay, 
  formatDate,
  formatTime,
  generateId,
  downloadICS,
  parseICS
} from './utils';
import { 
  CalendarEvent, 
  EventCategory, 
  FamilyMember,
  ThemeColor,
  ShoppingItem,
  WishListItem
} from './types';
import { 
  FAMILY_MEMBERS, 
  INITIAL_EVENTS, 
  CATEGORY_COLORS
} from './constants';
import EventModal from './components/EventModal';
import ChatAssistant from './components/ChatAssistant';
import FamilyManager from './components/FamilyManager';
import AuthScreen from './components/AuthScreen';
import { authService, familyService, eventService, shoppingService, wishListService } from './services/supabaseService';
import { supabase } from './lib/supabase';
import EditProfileModal from './components/EditProfileModal';
import SyncModal from './components/SyncModal';
import ShoppingListView from './components/ShoppingListView';
import WishListView from './components/WishListView';

function App() {
  // Global State
  const [currentUser, setCurrentUser] = useState<FamilyMember | null>(null);
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [wishLists, setWishLists] = useState<WishListItem[]>([]);
  const [familyJoinCode, setFamilyJoinCode] = useState<string | null>(null);
  
  // Refined Search State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchTime, setSearchTime] = useState('');
  const [searchMemberId, setSearchMemberId] = useState<string>('');
  
  const [viewMode, setViewMode] = useState<'home' | 'month' | 'list' | 'shopping' | 'wishlist'>('home');
  const [theme, setTheme] = useState<ThemeColor>('indigo');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFamilyManagerOpen, setIsFamilyManagerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  // Audio State
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }
        // If session exists, AuthScreen will handle authentication
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Cleanup audio on unmount or logout
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
    };
  }, []);

  // Fetch join code when Family Manager is opened (fallback if not loaded initially)
  useEffect(() => {
    const fetchJoinCode = async () => {
      if (isFamilyManagerOpen && currentFamilyId && !familyJoinCode) {
        try {
          console.log('Fetching join code for family:', currentFamilyId);
          const familyData = await familyService.getFamily(currentFamilyId);
          if (familyData && familyData.join_code) {
            console.log('Loaded family join code:', familyData.join_code);
            setFamilyJoinCode(familyData.join_code);
          } else {
            console.warn('Family data loaded but no join_code found:', familyData);
          }
        } catch (error) {
          console.error('Error fetching join code:', error);
        }
      }
    };

    fetchJoinCode();
  }, [isFamilyManagerOpen, currentFamilyId, familyJoinCode]);

  // Authentication Handler
  const handleAuthenticated = async (userId: string, familyId: string, memberId: string) => {
    setIsLoading(true);
    try {
      setCurrentFamilyId(familyId);
      setCurrentMemberId(memberId);
      
      // Load family data (including join code)
      try {
        const familyData = await familyService.getFamily(familyId);
        if (familyData && familyData.join_code) {
          console.log('Loaded family join code:', familyData.join_code);
          setFamilyJoinCode(familyData.join_code);
        } else {
          console.warn('Family data loaded but no join_code found:', familyData);
        }
      } catch (error) {
        console.error('Error loading family data (join code):', error);
        // Don't block the rest of the loading if this fails
      }
      
      // Load family members
      const familyMembers = await familyService.getFamilyMembers(familyId);
      setMembers(familyMembers);
      
      // Find current user member
      const currentMember = familyMembers.find(m => m.id === memberId);
      if (currentMember) {
        setCurrentUser(currentMember);
        setTheme(currentMember.color);
      }
      
      // Load events (filtered based on member role)
      const familyEvents = await eventService.getFamilyEvents(familyId, memberId, currentMember?.isAdmin);
      setEvents(familyEvents);
      
      // Load shopping list
      const shoppingItems = await shoppingService.getFamilyShoppingItems(familyId);
      setShoppingList(shoppingItems);
      
      // Load wish list
      const wishListItems = await wishListService.getFamilyWishListItems(familyId);
      setWishLists(wishListItems);
      
      clearFilters();
    } catch (error) {
      console.error('Error loading family data:', error);
      alert('Failed to load family data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Login Handler (Account Switching)
  const handleLogin = async (member: FamilyMember) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setPlayingAudioId(null);
    }
    setCurrentUser(member);
    setTheme(member.color);
    setCurrentMemberId(member.id);
    
    // Reload events with new member's visibility
    if (currentFamilyId) {
      try {
        const familyEvents = await eventService.getFamilyEvents(currentFamilyId, member.id, member.isAdmin);
        setEvents(familyEvents);
      } catch (error) {
        console.error('Error loading events after login:', error);
      }
    }
    
    clearFilters();
  };

  const handleLogout = async () => {
    if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
        setPlayingAudioId(null);
    }
    await authService.signOut();
    setCurrentUser(null);
    setCurrentFamilyId(null);
    setCurrentMemberId(null);
    setMembers([]);
    setEvents([]);
    setShoppingList([]);
    setWishLists([]);
    setFamilyJoinCode(null);
    setTheme('indigo'); 
    setViewMode('home');
    setIsSettingsOpen(false);
  };

  const handleUpdateProfile = (updatedMember: FamilyMember) => {
    setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
    setCurrentUser(updatedMember);
    setTheme(updatedMember.color);
  };

  const clearFilters = () => {
    setSearchKeyword('');
    setSearchDate('');
    setSearchTime('');
    setSearchMemberId('');
  };

  // Audio Handler
  const handlePlayAudio = (e: React.MouseEvent, eventId: string, audioData: string) => {
    e.stopPropagation();
    if (playingAudioId === eventId) {
      activeAudioRef.current?.pause();
      activeAudioRef.current = null;
      setPlayingAudioId(null);
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      const audio = new Audio(audioData);
      audio.onended = () => {
        setPlayingAudioId(null);
        activeAudioRef.current = null;
      };
      activeAudioRef.current = audio;
      setPlayingAudioId(eventId);
      audio.play().catch(err => console.error("Error playing audio:", err));
    }
  };

  // List Handlers
  const handleAddShoppingItem = (item: ShoppingItem) => setShoppingList(prev => [item, ...prev]);
  const handleToggleShoppingItem = (id: string) => setShoppingList(prev => prev.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
  const handleDeleteShoppingItem = (id: string) => setShoppingList(prev => prev.filter(item => item.id !== id));
  
  const handleAddWishItem = (item: WishListItem) => setWishLists(prev => [item, ...prev]);
  const handleDeleteWishItem = (id: string) => setWishLists(prev => prev.filter(item => item.id !== id));

  // Calendar Sync Handlers
  const handleExportCalendar = () => downloadICS(events);
  const handleImportCalendar = async (file: File) => {
    const importedEvents = await parseICS(file);
    const newEvents: CalendarEvent[] = importedEvents.map(partial => ({
      id: generateId(),
      title: partial.title || 'Imported Event',
      start: partial.start || new Date(),
      end: partial.end || new Date(new Date().getTime() + 3600000),
      category: EventCategory.OTHER,
      location: partial.location,
      description: partial.description,
      memberIds: currentUser ? [currentUser.id] : [],
      audioMessages: []
    }));
    setEvents(prev => [...prev, ...newEvents]);
  };
  const handleAddEvents = (newEvents: CalendarEvent[]) => setEvents(prev => [...prev, ...newEvents]);

  // Unified Filtering Logic
  const daysInMonth = useMemo(() => getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // 1. Keyword Filter
      if (searchKeyword) {
        const q = searchKeyword.toLowerCase();
        const matchesKeyword = event.title.toLowerCase().includes(q) ||
                              event.category.toLowerCase().includes(q) ||
                              (event.description && event.description.toLowerCase().includes(q)) ||
                              (event.location && event.location.toLowerCase().includes(q));
        if (!matchesKeyword) return false;
      }

      // 2. Date Filter
      if (searchDate) {
        const eventDateStr = new Date(event.start).toISOString().split('T')[0];
        if (eventDateStr !== searchDate) return false;
      }

      // 3. Time Filter
      if (searchTime) {
        const eventTimeStr = formatTime(new Date(event.start)).toLowerCase();
        if (!eventTimeStr.includes(searchTime.toLowerCase())) return false;
      }

      // 4. Member/Attendee Filter
      if (searchMemberId) {
        if (!event.memberIds.includes(searchMemberId)) return false;
      }

      return true;
    });
  }, [events, searchKeyword, searchDate, searchTime, searchMemberId]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setIsModalOpen(true);
  };
  
  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
        setPlayingAudioId(null);
    }
    setEditingEvent(event);
    setIsModalOpen(true);
  };
  
  const handleSaveEvent = async (event: CalendarEvent) => {
    if (!currentFamilyId || !currentMemberId) {
      alert('Not authenticated');
      return;
    }
    
    try {
      if (events.find(e => e.id === event.id)) {
        // Update existing event
        await eventService.updateEvent(event.id, event);
        // Refresh events
        const familyEvents = await eventService.getFamilyEvents(currentFamilyId, currentMemberId, currentUser?.isAdmin);
        setEvents(familyEvents);
      } else {
        // Create new event
        await eventService.createEvent(currentFamilyId, event, currentMemberId);
        // Refresh events
        const familyEvents = await eventService.getFamilyEvents(currentFamilyId, currentMemberId, currentUser?.isAdmin);
        setEvents(familyEvents);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const handleToggleEventCompleted = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the event modal
    if (!currentFamilyId || !currentMemberId) {
      alert('Not authenticated');
      return;
    }

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Check if the member is involved in this event (created it or is an attendee)
    const isInvolved = event.createdBy === currentMemberId || event.memberIds.includes(currentMemberId);
    if (!isInvolved) {
      alert('You can only mark events as completed if you are involved in them.');
      return;
    }

    // Store the previous completion state
    const wasCompleted = event.isCompleted || false;
    const willBeCompleted = !wasCompleted;

    try {
      await eventService.updateEvent(eventId, { isCompleted: willBeCompleted });
      // Refresh events
      const familyEvents = await eventService.getFamilyEvents(currentFamilyId, currentMemberId, currentUser?.isAdmin);
      setEvents(familyEvents);

      // Award 5 points when a task is marked as completed (transitioning from incomplete to complete)
      if (willBeCompleted && !wasCompleted) {
        // Award 5 points for completing this task
        await familyService.addMemberPoints(currentMemberId, 5);
        
        // Refresh member data to update points display
        const familyMembers = await familyService.getFamilyMembers(currentFamilyId);
        setMembers(familyMembers);
        const updatedMember = familyMembers.find(m => m.id === currentMemberId);
        if (updatedMember) {
          setCurrentUser(updatedMember);
        }
        
        // Show celebration message
        alert(`🎉 Great job! You completed "${event.title}" and earned 5 points!`);
      }
    } catch (error: any) {
      console.error('Error toggling event completion:', error);
      const errorMessage = error?.message || error?.details || 'Failed to update event. Please try again.';
      console.error('Full error object:', error);
      alert(`Failed to update event: ${errorMessage}`);
    }
  };
  
  const handleDeleteEvent = async (id: string) => {
    if (!currentFamilyId) {
      alert('Not authenticated');
      return;
    }
    
    try {
      await eventService.deleteEvent(id);
      // Refresh events
      const familyEvents = await eventService.getFamilyEvents(currentFamilyId, currentMemberId || undefined, currentUser?.isAdmin);
      setEvents(familyEvents);
      
      if (playingAudioId === id && activeAudioRef.current) {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
          setPlayingAudioId(null);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const getEventsForDay = (date: Date) => filteredEvents.filter(e => isSameDay(new Date(e.start), date));

  // Calculate progress for a specific day
  const calculateDayProgress = (date: Date, dayEvents: CalendarEvent[]): { completed: number; total: number; percentage: number } => {
    if (!currentMemberId) return { completed: 0, total: 0, percentage: 0 };
    
    // Filter events where the current member is involved (organizer or attendee)
    const memberEvents = dayEvents.filter(e => {
      const isInvolved = e.createdBy === currentMemberId || e.memberIds.includes(currentMemberId);
      return isInvolved;
    });
    
    const total = memberEvents.length;
    const completed = memberEvents.filter(e => e.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  const renderHomeView = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    dayAfterTomorrow.setHours(23, 59, 59, 999);

    // Filter events to only show those within the next 3 days
    const threeDayEvents = events.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate >= today && eventDate <= dayAfterTomorrow;
    });
    
    // Group events by day
    const todayEvents = threeDayEvents.filter(e => isSameDay(new Date(e.start), today));
    const tomorrowEvents = threeDayEvents.filter(e => isSameDay(new Date(e.start), tomorrow));
    const dayAfterTomorrowEvents = threeDayEvents.filter(e => isSameDay(new Date(e.start), dayAfterTomorrow));
    
    // Calculate progress for each day
    const todayProgress = calculateDayProgress(today, todayEvents);
    const tomorrowProgress = calculateDayProgress(tomorrow, tomorrowEvents);
    const dayAfterTomorrowProgress = calculateDayProgress(dayAfterTomorrow, dayAfterTomorrowEvents);

    // Apply search filters to the 3-day events
    const filteredThreeDayEvents = threeDayEvents.filter(event => {
      // 1. Keyword Filter
      if (searchKeyword) {
        const q = searchKeyword.toLowerCase();
        const matchesKeyword = event.title.toLowerCase().includes(q) ||
                              event.category.toLowerCase().includes(q) ||
                              (event.description && event.description.toLowerCase().includes(q)) ||
                              (event.location && event.location.toLowerCase().includes(q));
        if (!matchesKeyword) return false;
      }

      // 2. Date Filter
      if (searchDate) {
        const eventDateStr = new Date(event.start).toISOString().split('T')[0];
        if (eventDateStr !== searchDate) return false;
      }

      // 3. Time Filter
      if (searchTime) {
        const eventTimeStr = formatTime(new Date(event.start)).toLowerCase();
        if (!eventTimeStr.includes(searchTime.toLowerCase())) return false;
      }

      // 4. Member/Attendee Filter
      if (searchMemberId) {
        if (!event.memberIds.includes(searchMemberId)) return false;
      }

      return true;
    });

    const hasActiveFilters = searchKeyword || searchDate || searchTime || searchMemberId;
    
    // Helper function to render a day section with progress bar
    const renderDaySection = (dayLabel: string, dayDate: Date, dayEvents: CalendarEvent[], progress: { completed: number; total: number; percentage: number }) => {
      const filteredDayEvents = dayEvents.filter(event => {
        if (searchKeyword) {
          const q = searchKeyword.toLowerCase();
          const matchesKeyword = event.title.toLowerCase().includes(q) ||
                                event.category.toLowerCase().includes(q) ||
                                (event.description && event.description.toLowerCase().includes(q)) ||
                                (event.location && event.location.toLowerCase().includes(q));
          if (!matchesKeyword) return false;
        }
        if (searchDate) {
          const eventDateStr = new Date(event.start).toISOString().split('T')[0];
          if (eventDateStr !== searchDate) return false;
        }
        if (searchTime) {
          const eventTimeStr = formatTime(new Date(event.start)).toLowerCase();
          if (!eventTimeStr.includes(searchTime.toLowerCase())) return false;
        }
        if (searchMemberId) {
          if (!event.memberIds.includes(searchMemberId)) return false;
        }
        return true;
      });
      
      const sortedDayEvents = [...filteredDayEvents].sort((a,b) => a.start.getTime() - b.start.getTime());
      
      return (
        <div key={dayLabel} className="mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-2xl font-bold text-${theme}-900`}>{dayLabel}</h3>
              {progress.total > 0 && (
                <span className="text-sm font-bold text-slate-600">
                  {progress.completed}/{progress.total} completed
                </span>
              )}
            </div>
            {/* Progress Bar */}
            {progress.total > 0 ? (
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div 
                  className={`h-full bg-gradient-to-r from-${theme}-400 to-${theme}-600 transition-all duration-500 ease-out rounded-full flex items-center justify-end pr-2`}
                  style={{ width: `${progress.percentage}%` }}
                >
                  {progress.percentage === 100 && (
                    <span className="text-white text-xs font-black">✓</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full bg-slate-100 rounded-full h-4">
                <div className="h-full bg-slate-200 rounded-full" style={{ width: '0%' }} />
              </div>
            )}
          </div>
          
          {sortedDayEvents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-medium">No events for {dayLabel.toLowerCase()}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedDayEvents.map(event => {
                const latestAudio = event.audioMessages && event.audioMessages.length > 0 ? event.audioMessages[event.audioMessages.length - 1] : null;
                const isCompleted = event.isCompleted || false;
                return (
                  <div key={event.id} onClick={(e) => handleEventClick(e, event)} className={`p-5 bg-white rounded-xl border border-slate-200 hover:border-${theme}-300 hover:shadow-md transition-all cursor-pointer group flex gap-5 ${isCompleted ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col items-center justify-center min-w-[70px] text-center bg-slate-50/50 rounded-2xl p-2 border border-slate-100 group-hover:bg-white transition-colors">
                      <span className={`text-[10px] font-black uppercase text-${theme}-600 mb-0.5`}>{getDayName(new Date(event.start))}</span>
                      <span className="text-3xl font-black text-slate-800 leading-none">{new Date(event.start).getDate()}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">{new Date(event.start).toLocaleString('en-US', { month: 'short' })}</span>
                    </div>
                    <div className="flex-1 flex gap-4">
                      <button
                        onClick={(e) => handleToggleEventCompleted(event.id, e)}
                        className={`transition-colors flex-shrink-0 ${isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                        title={isCompleted ? 'Mark as not done' : 'Mark as done'}
                      >
                        {isCompleted ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                      </button>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className={`font-bold text-xl ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800 group-hover:text-' + theme + '-600'} transition-colors line-clamp-1`}>{event.title}</h3>
                          <span className={`text-[10px] px-3 py-1 rounded-full border uppercase font-black tracking-wider shadow-sm ${CATEGORY_COLORS[event.category]}`}>{event.category}</span>
                        </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-2"><Clock className={`w-4 h-4 text-${theme}-400`} /> {formatTime(new Date(event.start))}</span>
                        {event.location && <span className="flex items-center gap-2"><MapPin className={`w-4 h-4 text-${theme}-400`} /> {event.location}</span>}
                        {event.audioMessages && event.audioMessages.length > 0 && (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-red-500 font-black text-[10px] uppercase bg-red-50 px-2 py-0.5 rounded-lg">
                              <Mic className="w-3.5 h-3.5" /> {event.audioMessages.length} Voice Note{event.audioMessages.length > 1 ? 's' : ''}
                            </span>
                            {latestAudio && (
                              <button
                                onClick={(e) => handlePlayAudio(e, event.id, latestAudio.data)}
                                className={`p-2 rounded-full hover:bg-white shadow-sm border border-slate-100 transition-all ${playingAudioId === event.id ? 'text-red-500 bg-red-50 border-red-200' : 'text-slate-400 hover:text-slate-600'}`}
                                title="Play latest voice note"
                              >
                                {playingAudioId === event.id ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Attendees:</span>
                        <div className="flex -space-x-1.5">
                          {event.memberIds.map(mid => {
                            const m = members.find(mem => mem.id === mid);
                            return m ? (
                              <div key={mid} className="w-8 h-8 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-sm shadow-sm hover:scale-110 transition-transform relative z-10 hover:z-20" title={m.name}>
                                {m.avatar}
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="animate-fade-in-up space-y-8 max-w-5xl mx-auto">
        <div className="text-center py-8">
           <h2 className={`text-4xl font-bold text-${theme}-900 mb-2 transition-colors duration-300`}>
             Welcome back, {currentUser?.name}! {currentUser?.avatar}
           </h2>
           <p className="text-xl text-slate-500 font-medium">
             {today.toLocaleDateString('en-US', { weekday: 'long' })}, {formatDate(today)}
           </p>
           {currentUser?.points !== undefined && (
             <p className="text-lg font-bold text-slate-600 mt-2">
               Points: <span className={`text-${theme}-600`}>{currentUser.points}</span>
             </p>
           )}
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          {/* Dynamic Filter Panel */}
          <div className={`bg-${theme}-50 p-6 sm:p-8 border-b border-${theme}-100`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Filter className={`w-7 h-7 text-${theme}-600`} />
                Advanced Event Search
              </h2>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-red-100 transition-all active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Keyword Search */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Keywords</label>
                <div className="relative">
                  <input 
                    ref={searchInputRef}
                    type="text"
                    placeholder="Title, description..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Date Search */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Specific Date</label>
                <div className="relative">
                  <input 
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                  />
                  <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Time Search */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Time of Day</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="e.g. 10:00, PM"
                    value={searchTime}
                    onChange={(e) => setSearchTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                  />
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              {/* Attendee Search */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attendee</label>
                <div className="relative">
                  <select 
                    value={searchMemberId}
                    onChange={(e) => setSearchMemberId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm appearance-none font-medium"
                  >
                    <option value="">Anyone</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
                    ))}
                  </select>
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Day-by-Day Event List with Progress Bars */}
          <div className="p-6 sm:p-8">
            {renderDaySection('Today', today, todayEvents, todayProgress)}
            {renderDaySection('Tomorrow', tomorrow, tomorrowEvents, tomorrowProgress)}
            {renderDaySection('Day After Tomorrow', dayAfterTomorrow, dayAfterTomorrowEvents, dayAfterTomorrowProgress)}
          </div>
        </div>

        <div>
           <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
             <span className={`w-1.5 h-6 bg-${theme}-500 rounded-full transition-colors duration-300`}></span>
             Quick Actions
           </h3>
           <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <button onClick={() => setViewMode('month')} className="bg-white hover:bg-blue-50/50 p-6 rounded-3xl border border-slate-100 shadow-sm transition-all group text-left">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800">Month View</h4>
                <p className="text-xs text-slate-500 mt-1 text-balance">Plan the family month</p>
              </button>

              <button onClick={() => setViewMode('shopping')} className="bg-white hover:bg-emerald-50/50 p-6 rounded-3xl border border-slate-100 shadow-sm transition-all group text-left relative overflow-hidden">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800">Shopping List</h4>
                <p className="text-xs text-slate-500 mt-1">Shared groceries & needs</p>
                {shoppingList.filter(i => !i.isCompleted).length > 0 && (
                   <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                     {shoppingList.filter(i => !i.isCompleted).length}
                   </span>
                )}
              </button>

              <button onClick={() => setViewMode('wishlist')} className="bg-white hover:bg-rose-50/50 p-6 rounded-3xl border border-slate-100 shadow-sm transition-all group text-left">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Gift className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800">Wish Lists</h4>
                <p className="text-xs text-slate-500 mt-1">Gift ideas for everyone</p>
              </button>

              <button onClick={() => { setSelectedDate(new Date()); setEditingEvent(null); setIsModalOpen(true); }} className="bg-white hover:bg-amber-50/50 p-6 rounded-3xl border border-slate-100 shadow-sm transition-all group text-left">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800">Add Event</h4>
                <p className="text-xs text-slate-500 mt-1">Quick event creation</p>
              </button>
           </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
             <h2 className="text-3xl font-bold text-slate-800">{formatDate(currentDate).split(' ')[0]} <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span></h2>
             <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronRight className="w-5 h-5"/></button>
             </div>
          </div>
          <button 
             onClick={() => { setSelectedDate(new Date()); setEditingEvent(null); setIsModalOpen(true); }}
             className={`hidden sm:flex items-center gap-2 bg-${theme}-600 text-white px-5 py-2.5 rounded-full font-bold shadow-md hover:bg-${theme}-700 transition-all active:scale-95`}
          >
             <Plus className="w-5 h-5" /> Add Event
          </button>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-4 text-center text-sm font-bold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
             {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
               <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-b border-r border-slate-50"></div>
             ))}

             {daysInMonth.map(date => {
               const dayEvents = getEventsForDay(date);
               const isToday = isSameDay(date, new Date());
               return (
                 <div 
                   key={date.toString()}
                   onClick={() => handleDayClick(date)}
                   className={`min-h-[120px] p-2 border-b border-r border-slate-100 transition-colors hover:bg-blue-50/30 cursor-pointer relative group ${isToday ? 'bg-blue-50/50' : ''}`}
                 >
                    <div className="flex justify-between items-start mb-1">
                       <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${isToday ? `bg-${theme}-600 text-white shadow-md` : 'text-slate-600 group-hover:bg-white group-hover:shadow-sm'}`}>
                         {date.getDate()}
                       </span>
                    </div>
                    <div className="space-y-1">
                       {dayEvents.slice(0, 3).map(event => (
                         <div 
                           key={event.id}
                           onClick={(e) => handleEventClick(e, event)}
                           className={`text-xs p-1.5 rounded-lg border ${CATEGORY_COLORS[event.category]} truncate font-medium hover:brightness-95 transition-all shadow-sm`}
                           title={event.title}
                         >
                           {event.audioMessages && event.audioMessages.length > 0 && <Mic className="w-3 h-3 inline mr-1" />}
                           {event.title}
                         </div>
                       ))}
                       {dayEvents.length > 3 && <div className="text-[10px] font-bold text-slate-400 pl-1">+ {dayEvents.length - 3} more</div>}
                    </div>
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    );
  };

  const renderListView = () => {
     const sortedEvents = [...filteredEvents].sort((a,b) => a.start.getTime() - b.start.getTime());
     const hasActiveFilters = searchKeyword || searchDate || searchTime || searchMemberId;

     return (
       <div className="animate-fade-in-up max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
             {/* Dynamic Filter Panel */}
             <div className={`bg-${theme}-50 p-6 sm:p-8 border-b border-${theme}-100`}>
                <div className="flex items-center justify-between mb-6">
                   <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                      <Filter className={`w-7 h-7 text-${theme}-600`} />
                      Advanced Event Search
                   </h2>
                   {hasActiveFilters && (
                     <button 
                        onClick={clearFilters}
                        className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-red-100 transition-all active:scale-95"
                     >
                        <XCircle className="w-3.5 h-3.5" /> Clear All
                     </button>
                   )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   {/* Keyword Search */}
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Keywords</label>
                      <div className="relative">
                         <input 
                            ref={searchInputRef}
                            type="text"
                            placeholder="Title, description..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                         />
                         <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                   </div>

                   {/* Date Search */}
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Specific Date</label>
                      <div className="relative">
                         <input 
                            type="date"
                            value={searchDate}
                            onChange={(e) => setSearchDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                         />
                         <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                   </div>

                   {/* Time Search */}
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Time of Day</label>
                      <div className="relative">
                         <input 
                            type="text"
                            placeholder="e.g. 10:00, PM"
                            value={searchTime}
                            onChange={(e) => setSearchTime(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                         />
                         <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      </div>
                   </div>

                   {/* Attendee Search */}
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Attendee</label>
                      <div className="relative">
                         <select 
                            value={searchMemberId}
                            onChange={(e) => setSearchMemberId(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm appearance-none font-medium"
                         >
                            <option value="">Anyone</option>
                            {members.map(m => (
                               <option key={m.id} value={m.id}>{m.avatar} {m.name}</option>
                            ))}
                         </select>
                         <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                         <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                      </div>
                   </div>
                </div>
             </div>
             
             {/* Event List */}
             <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                {sortedEvents.length === 0 ? (
                  <div className="p-16 text-center">
                     <div className={`w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200`}>
                        <Search className="w-8 h-8" />
                     </div>
                     <p className="text-xl font-bold text-slate-600">No events matched your criteria</p>
                     <p className="text-sm text-slate-400 mt-2">Try adjusting your filters or clearing them to see everything.</p>
                     {hasActiveFilters && (
                        <button 
                           onClick={clearFilters}
                           className={`mt-6 px-6 py-2 bg-${theme}-600 text-white rounded-full font-bold shadow-md hover:bg-${theme}-700 transition-all active:scale-95`}
                        >
                           Show All Events
                        </button>
                     )}
                  </div>
                ) : (
                  sortedEvents.map(event => {
                    const latestAudio = event.audioMessages && event.audioMessages.length > 0 ? event.audioMessages[event.audioMessages.length - 1] : null;
                    return (
                      <div key={event.id} onClick={(e) => handleEventClick(e, event)} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer group flex gap-5 border-l-4 border-transparent hover:border-indigo-500">
                         <div className="flex flex-col items-center justify-center min-w-[70px] text-center bg-slate-50/50 rounded-2xl p-2 border border-slate-100 group-hover:bg-white transition-colors">
                            <span className={`text-[10px] font-black uppercase text-${theme}-600 mb-0.5`}>{getDayName(new Date(event.start))}</span>
                            <span className="text-3xl font-black text-slate-800 leading-none">{new Date(event.start).getDate()}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">{new Date(event.start).toLocaleString('en-US', { month: 'short' })}</span>
                         </div>
                         <div className="flex-1">
                            <div className="flex justify-between items-start">
                               <h3 className={`font-bold text-xl text-slate-800 group-hover:text-${theme}-600 transition-colors line-clamp-1`}>{event.title}</h3>
                               <span className={`text-[10px] px-3 py-1 rounded-full border uppercase font-black tracking-wider shadow-sm ${CATEGORY_COLORS[event.category]}`}>{event.category}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2 text-sm text-slate-500 font-medium">
                               <span className="flex items-center gap-2"><Clock className={`w-4 h-4 text-${theme}-400`} /> {formatTime(new Date(event.start))}</span>
                               {event.location && <span className="flex items-center gap-2"><MapPin className={`w-4 h-4 text-${theme}-400`} /> {event.location}</span>}
                               {event.audioMessages && event.audioMessages.length > 0 && (
                                 <div className="flex items-center gap-3">
                                   <span className="flex items-center gap-1.5 text-red-500 font-black text-[10px] uppercase bg-red-50 px-2 py-0.5 rounded-lg">
                                     <Mic className="w-3.5 h-3.5" /> {event.audioMessages.length} Voice Note{event.audioMessages.length > 1 ? 's' : ''}
                                   </span>
                                   {latestAudio && (
                                     <button
                                        onClick={(e) => handlePlayAudio(e, event.id, latestAudio.data)}
                                        className={`p-2 rounded-full hover:bg-white shadow-sm border border-slate-100 transition-all ${playingAudioId === event.id ? 'text-red-500 bg-red-50 border-red-200' : 'text-slate-400 hover:text-slate-600'}`}
                                        title="Play latest voice note"
                                     >
                                        {playingAudioId === event.id ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                                     </button>
                                   )}
                                 </div>
                               )}
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Attendees:</span>
                               <div className="flex -space-x-1.5">
                                 {event.memberIds.map(mid => {
                                    const m = members.find(mem => mem.id === mid);
                                    return m ? (
                                       <div key={mid} className="w-8 h-8 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-sm shadow-sm hover:scale-110 transition-transform relative z-10 hover:z-20" title={m.name}>
                                          {m.avatar}
                                       </div>
                                    ) : null;
                                 })}
                               </div>
                            </div>
                         </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
       </div>
     );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-3xl font-bold">Loading fam.ly...</h1>
        </div>
      </div>
    );
  }

  if (!currentUser) return <AuthScreen onAuthenticated={handleAuthenticated} />;

  return (
    <div className={`min-h-screen bg-slate-50 pb-20 theme-${theme}`}>
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200 px-4 py-3">
         <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setViewMode('home'); clearFilters(); }}>
               <div className={`w-10 h-10 bg-${theme}-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-${theme}-200`}>🏡</div>
               <span className="text-xl font-bold text-slate-800 hidden sm:block tracking-tight">fam.ly</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
               <div className="hidden md:flex bg-slate-100 rounded-full p-1 gap-1">
                  {members.map(m => {
                    const isSelf = currentUser.id === m.id;
                    const canSwitch = currentUser.isAdmin || isSelf;
                    
                    return (
                      <button
                        key={m.id}
                        onClick={() => canSwitch ? handleLogin(m) : null}
                        disabled={!canSwitch}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all border-2 ${
                          currentUser.id === m.id 
                            ? `bg-white border-${m.color}-500 shadow-sm scale-110` 
                            : canSwitch 
                              ? 'bg-transparent border-transparent opacity-60 hover:opacity-100 cursor-pointer' 
                              : 'bg-transparent border-transparent opacity-20 cursor-not-allowed'
                        }`}
                        title={canSwitch ? (isSelf ? `Your profile` : `Switch to ${m.name}`) : `${m.name}'s profile (Admin only)`}
                      >{m.avatar}</button>
                    );
                  })}
               </div>
               <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
               <button onClick={() => setIsSyncModalOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title="Sync Calendar"><RefreshCw className="w-5 h-5" /></button>
               <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-2 hover:bg-slate-100 pr-3 pl-1 py-1 rounded-full transition-all border border-transparent hover:border-slate-200">
                  <div className={`w-8 h-8 rounded-full bg-${currentUser.color}-100 flex items-center justify-center text-lg border-2 border-white shadow-sm`}>{currentUser.avatar}</div>
                  <span className="text-sm font-bold text-slate-700 hidden sm:block">{currentUser.name}</span>
               </button>
               <div className="relative">
                 <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 rounded-full transition-colors ${isSettingsOpen ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}><Settings className="w-6 h-6" /></button>
                 {isSettingsOpen && (
                   <>
                     <div className="fixed inset-0 z-10" onClick={() => setIsSettingsOpen(false)}></div>
                     <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 animate-fade-in-up z-20">
                        {currentUser.isAdmin && (
                          <button onClick={() => { setIsFamilyManagerOpen(true); setIsSettingsOpen(false); }} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2"><Settings className="w-4 h-4" /> Manage Family</button>
                        )}
                        <button onClick={() => { handleLogout(); setIsSettingsOpen(false); }} className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2"><LogOut className="w-4 h-4" /> Logout</button>
                     </div>
                   </>
                 )}
               </div>
            </div>
         </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
         {viewMode === 'home' && renderHomeView()}
         {viewMode === 'month' && renderMonthView()}
         {viewMode === 'list' && renderListView()}
         {viewMode === 'shopping' && (
           <ShoppingListView 
              items={shoppingList} 
              members={members} 
              currentUser={currentUser} 
              onAddItem={handleAddShoppingItem} 
              onToggleItem={handleToggleShoppingItem}
              onDeleteItem={handleDeleteShoppingItem}
              theme={theme}
           />
         )}
         {viewMode === 'wishlist' && (
           <WishListView 
              items={wishLists} 
              members={members} 
              currentUser={currentUser} 
              onAddItem={handleAddWishItem} 
              onDeleteItem={handleDeleteWishItem}
              theme={theme}
           />
         )}
      </main>

      <button onClick={() => setIsChatOpen(true)} className={`fixed bottom-6 right-6 w-16 h-16 bg-${theme}-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-40 hover:rotate-3 active:scale-95`}>
        <MessageCircle className="w-8 h-8" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
           <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
        </span>
      </button>

      <EventModal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent} onDelete={handleDeleteEvent}
        initialDate={selectedDate} existingEvent={editingEvent}
        members={members} theme={theme} currentUser={currentUser}
      />

      <ChatAssistant
        isOpen={isChatOpen} onClose={() => setIsChatOpen(false)}
        events={events} members={members} theme={theme}
        onAddEvent={handleSaveEvent} onUpdateEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent}
      />

      <FamilyManager
        isOpen={isFamilyManagerOpen} onClose={() => setIsFamilyManagerOpen(false)}
        members={members} onUpdateMembers={setMembers} theme={theme}
        joinCode={familyJoinCode}
      />
      
      <EditProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={currentUser} onUpdate={handleUpdateProfile} />
      <SyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} onExport={handleExportCalendar} onImport={handleImportCalendar} onAddEvents={handleAddEvents} theme={theme} currentUser={currentUser} />
    </div>
  );
}

export default App;
