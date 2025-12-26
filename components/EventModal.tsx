import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import { CalendarEvent, EventCategory, FamilyMember, ThemeColor, AudioMessage } from '../types';
import { generateId } from '../utils';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  initialDate?: Date;
  existingEvent?: CalendarEvent | null;
  members: FamilyMember[];
  theme: ThemeColor;
  currentUser: FamilyMember;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialDate,
  existingEvent,
  members,
  theme,
  currentUser
}) => {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<EventCategory>(EventCategory.FAMILY);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  
  // Audio State
  const [audioMessages, setAudioMessages] = useState<AudioMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingEvent) {
        setTitle(existingEvent.title);
        setStartDate(existingEvent.start.toISOString().split('T')[0]);
        setStartTime(existingEvent.start.toTimeString().slice(0, 5));
        setEndTime(existingEvent.end.toTimeString().slice(0, 5));
        setLocation(existingEvent.location || '');
        setCategory(existingEvent.category);
        setSelectedMembers(existingEvent.memberIds);
        setDescription(existingEvent.description || '');
        setAudioMessages(existingEvent.audioMessages || []);
      } else {
        // Reset for new event
        setTitle('');
        const d = initialDate || new Date();
        setStartDate(d.toISOString().split('T')[0]);
        setStartTime('09:00');
        setEndTime('10:00');
        setLocation('');
        setCategory(EventCategory.FAMILY);
        setSelectedMembers([]);
        setDescription('');
        setAudioMessages([]);
      }
    }
    // Cleanup on close
    return () => {
      stopRecordingCleanup();
    };
  }, [isOpen, existingEvent, initialDate]);

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // robust mimeType detection
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const startTime = Date.now();

      mediaRecorder.onstop = async () => {
        // Calculate duration based on elapsed time rather than stale state
        const durationSecs = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const newMessage: AudioMessage = {
            data: base64data,
            duration: durationSecs,
            authorId: currentUser.id,
            timestamp: new Date()
          };
          setAudioMessages(prev => [...prev, newMessage]);
        };
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    }
  };

  const deleteAudioMessage = (index: number) => {
    setAudioMessages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${startDate}T${endTime}`);

    const newEvent: CalendarEvent = {
      id: existingEvent?.id || generateId(),
      title,
      start,
      end,
      category,
      location: location.trim() || undefined,
      memberIds: selectedMembers,
      description,
      audioMessages: audioMessages
    };

    onSave(newEvent);
    onClose();
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className={`bg-${theme}-600 p-4 flex justify-between items-center text-white transition-colors duration-300`}>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            {existingEvent ? 'Edit Event' : 'Add New Event'}
          </h2>
          <button onClick={onClose} className={`hover:bg-${theme}-700 p-1 rounded-full`}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-${theme}-500 focus:outline-none transition-all`}
              placeholder="e.g., Family Picnic"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <div className="relative">
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-${theme}-500 focus:outline-none`}
                />
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <div className="flex gap-2 items-center">
                <input
                  required
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2 py-2 border border-slate-300 rounded-xl text-sm"
                />
                <span className="text-slate-400">-</span>
                <input
                  required
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Location (Optional)</label>
             <div className="relative">
               <input
                 type="text"
                 value={location}
                 onChange={(e) => setLocation(e.target.value)}
                 className={`w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-${theme}-500 focus:outline-none`}
                 placeholder="e.g., Central Park"
               />
               <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(EventCategory).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    category === cat
                      ? `bg-${theme}-600 text-white shadow-md transform scale-105`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Who is going?</label>
            <div className="flex gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all border-2 ${
                    selectedMembers.includes(member.id)
                      ? `border-${member.color}-500 bg-${member.color}-100 transform scale-110 shadow-sm`
                      : 'border-transparent grayscale hover:grayscale-0 bg-slate-100'
                  }`}
                  title={member.name}
                >
                  {member.avatar}
                </button>
              ))}
            </div>
          </div>
          
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-${theme}-500 focus:outline-none text-sm h-20 resize-none`}
              placeholder="Add details..."
            />
          </div>

          {/* Audio Messages Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-bold text-slate-600 mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Voice Notes
            </label>
            
            {/* List Existing Audio Messages */}
            {audioMessages.length > 0 && (
              <div className="space-y-2 mb-3">
                {audioMessages.map((msg, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                     <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-white">
                       {members.find(m => m.id === msg.authorId)?.avatar || '👤'}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">
                            {members.find(m => m.id === msg.authorId)?.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">{formatDuration(msg.duration)}</span>
                        </div>
                        <audio 
                            controls 
                            src={msg.data} 
                            className="w-full h-6" 
                        />
                     </div>
                     <button 
                      type="button" 
                      onClick={() => deleteAudioMessage(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))}
              </div>
            )}

            {/* Recorder Interface */}
            {isRecording ? (
              <div className="flex items-center justify-between bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                <div className="flex items-center gap-2 text-red-600 font-bold">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-bounce"></div>
                  Recording... {formatDuration(recordingDuration)}
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop
                </button>
              </div>
            ) : (
               <button 
                 type="button"
                 onClick={startRecording}
                 className={`w-full py-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:border-${theme}-500 hover:text-${theme}-600 hover:bg-${theme}-50 transition-all`}
               >
                 <Mic className="w-5 h-5" />
                 {audioMessages.length > 0 ? 'Record Another Note' : 'Record Voice Note'}
               </button>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100 mt-2">
            {existingEvent && onDelete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(existingEvent.id);
                  onClose();
                }}
                className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Delete
              </button>
            ) : <div></div>}
            
            <div className="flex gap-3">
               <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecording}
                className={`bg-${theme}-600 hover:bg-${theme}-700 text-white px-6 py-2 rounded-xl text-sm font-medium shadow-md transition-all active:scale-95 disabled:opacity-50`}
              >
                Save Event
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;