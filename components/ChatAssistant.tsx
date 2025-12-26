
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Mic } from 'lucide-react';
import { CalendarEvent, FamilyMember, ChatMessage, ThemeColor } from '../types';
import { generateCalendarAdvice } from '../services/geminiService';

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  members: FamilyMember[];
  theme: ThemeColor;
  onAddEvent?: (event: CalendarEvent) => void;
  onUpdateEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
  isOpen, 
  onClose, 
  events, 
  members, 
  theme,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm your fam.ly assistant. I can add, edit, or delete events for you! 📅✨",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateCalendarAdvice(input, events, members);
      if (response.action) {
        if (response.action.type === 'ADD' && onAddEvent) onAddEvent(response.action.payload);
        else if (response.action.type === 'DELETE' && onDeleteEvent) onDeleteEvent(response.action.payload);
        else if (response.action.type === 'UPDATE' && onUpdateEvent) {
          const { id, updates } = response.action.payload;
          const existing = events.find(e => e.id === id);
          if (existing) {
             const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
             onUpdateEvent({ ...existing, ...cleanUpdates });
          }
        }
      }
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: response.text || "Done!", timestamp: new Date() }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Error processing request.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 flex flex-col border-l-4 border-${theme}-200`}>
      <div className={`bg-${theme}-600 text-white p-4 flex justify-between items-center shadow-md`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <h2 className="font-bold text-lg">fam.ly Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => {
              setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: 'Voice mode is currently unavailable. Please use text chat instead.',
                timestamp: new Date()
              }]);
            }}
            className="p-2 rounded-full transition-all hover:bg-white/10 text-white/60 opacity-50 cursor-not-allowed"
            title="Voice mode unavailable (requires API key)"
            disabled
          >
            <Mic className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="hover:bg-black/10 p-1 rounded-full"><X className="w-6 h-6" /></button>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto p-4 space-y-4 bg-${theme}-50/30 relative`}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? `bg-${theme}-500 text-white rounded-br-none` : `bg-white text-slate-800 border border-${theme}-100 rounded-bl-none`}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <span className={`text-[9px] block mt-1 ${msg.role === 'user' ? `text-${theme}-100` : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl flex gap-1"><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div></div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask anything..." className={`flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-${theme}-500 outline-none`} />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className={`bg-${theme}-600 text-white p-2 rounded-full shadow-md active:scale-95 disabled:opacity-50`}><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
