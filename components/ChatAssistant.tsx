
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Mic, MicOff, Volume2, VolumeX, Play, Square } from 'lucide-react';
import { CalendarEvent, FamilyMember, ChatMessage, ThemeColor, EventCategory } from '../types';
import { generateCalendarAdvice, addEventTool, updateEventTool, deleteEventTool } from '../services/geminiService';
// Live session feature disabled - using serverless function instead
// import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { generateId, mapNamesToIds } from '../utils';

// --- Audio Utility Functions (As per Gemini Live API Guidelines) ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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
  
  // Live Voice State
  const [isLive, setIsLive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState<{ user: string; model: string }>({ user: '', model: '' });
  const liveSessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, liveTranscription]);

  useEffect(() => {
    if (!isOpen && isLive) {
      stopLiveSession();
    }
    return () => {
      if (liveSessionRef.current) stopLiveSession();
    };
  }, [isOpen]);

  const startLiveSession = async () => {
    // Live session feature disabled - API keys must be kept server-side
    alert('Live voice session is currently disabled. Please use text input instead.');
    return;
    
    /* DISABLED - API keys must be server-side
    try {
      setIsLive(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextsRef.current = { input: inputCtx, output: outputCtx };
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Prepare the current schedule for the AI
      const scheduleContext = events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start.toLocaleString(),
        end: e.end.toLocaleString(),
        category: e.category,
        attendees: e.memberIds.map(mid => members.find(m => m.id === mid)?.name).join(', ')
      }));

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encodeBase64(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // 1. Handle Tool Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                const args = fc.args as any;
                let result = "ok";

                try {
                  if (fc.name === 'addEvent') {
                    onAddEvent?.({
                      id: generateId(),
                      title: args.title,
                      start: new Date(args.start),
                      end: new Date(args.end),
                      description: args.description || '',
                      location: args.location || '',
                      category: args.category as EventCategory,
                      memberIds: mapNamesToIds(args.attendeeNames, members),
                      audioMessages: []
                    });
                  } else if (fc.name === 'updateEvent') {
                    const existing = events.find(e => e.id === args.id);
                    if (existing) {
                      onUpdateEvent?.({
                        ...existing,
                        ...args,
                        start: args.start ? new Date(args.start) : existing.start,
                        end: args.end ? new Date(args.end) : existing.end,
                        memberIds: args.attendeeNames ? mapNamesToIds(args.attendeeNames, members) : existing.memberIds
                      });
                    }
                  } else if (fc.name === 'deleteEvent') {
                    onDeleteEvent?.(args.id);
                  }
                } catch (e) {
                  result = "error: " + (e instanceof Error ? e.message : "unknown");
                }

                // Confirm back to session
                sessionPromise.then(session => session.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result } }
                }));
              }
            }

            // 2. Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              setLiveTranscription(prev => ({ ...prev, user: prev.user + message.serverContent!.inputTranscription!.text }));
            }
            if (message.serverContent?.outputTranscription) {
              setLiveTranscription(prev => ({ ...prev, model: prev.model + message.serverContent!.outputTranscription!.text }));
            }

            if (message.serverContent?.turnComplete) {
              setLiveTranscription(prev => {
                if (prev.user || prev.model) {
                  const newMsgs: ChatMessage[] = [];
                  if (prev.user) newMsgs.push({ id: `live-u-${Date.now()}`, role: 'user', text: prev.user, timestamp: new Date() });
                  if (prev.model) newMsgs.push({ id: `live-m-${Date.now()}`, role: 'model', text: prev.model, timestamp: new Date() });
                  setMessages(h => [...h, ...newMsgs]);
                }
                return { user: '', model: '' };
              });
            }

            // 3. Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const outCtx = audioContextsRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => activeAudioSourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              activeAudioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              activeAudioSourcesRef.current.forEach(s => s.stop());
              activeAudioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopLiveSession(),
          onerror: () => stopLiveSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [addEventTool, updateEventTool, deleteEventTool] }],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          systemInstruction: `
            You are fam.ly Assistant. Help the family with their schedule. 
            You can add, edit, or delete events using tools.
            Current Schedule: ${JSON.stringify(scheduleContext)}
            Family Members: ${members.map(m => m.name).join(', ')}
          `
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Live API Error:", err);
      stopLiveSession();
    }
  };

  const stopLiveSession = () => {
    setIsLive(false);
    if (liveSessionRef.current) {
      try { liveSessionRef.current.close(); } catch {}
      liveSessionRef.current = null;
    }
    if (audioContextsRef.current) {
      audioContextsRef.current.input.close().catch(() => {});
      audioContextsRef.current.output.close().catch(() => {});
      audioContextsRef.current = null;
    }
    setLiveTranscription({ user: '', model: '' });
  };

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
            onClick={() => isLive ? stopLiveSession() : startLiveSession()}
            className={`p-2 rounded-full transition-all ${isLive ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-white/80'}`}
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
        
        {isLive && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
             {liveTranscription.user && (
               <div className="flex justify-end"><div className={`max-w-[80%] p-3 bg-${theme}-400 text-white rounded-2xl rounded-br-none opacity-80 animate-pulse text-sm italic`}>{liveTranscription.user}</div></div>
             )}
             {liveTranscription.model && (
               <div className="flex justify-start"><div className="max-w-[80%] p-3 bg-white text-slate-800 rounded-2xl rounded-bl-none border border-indigo-100 shadow-sm animate-pulse text-sm italic">{liveTranscription.model}</div></div>
             )}
             <div className="flex justify-center py-4">
                <div className="flex gap-1 items-center bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-indigo-100">
                   {[1,2,3,4,5].map(i => <div key={i} className={`w-1.5 h-${i*2+2} bg-indigo-500 rounded-full animate-pulse-y-${i%3+1}`}></div>)}
                   <span className="text-[10px] font-black uppercase text-indigo-600 ml-2 tracking-widest">Voice Active</span>
                </div>
             </div>
          </div>
        )}
        {isLoading && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl flex gap-1"><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce delay-150"></div></div></div>}
        <div ref={messagesEndRef} />
      </div>

      {!isLive ? (
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask anything..." className={`flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-${theme}-500 outline-none`} />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className={`bg-${theme}-600 text-white p-2 rounded-full shadow-md active:scale-95 disabled:opacity-50`}><Send className="w-5 h-5" /></button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col items-center gap-2">
           <button onClick={stopLiveSession} className="bg-red-500 text-white px-8 py-2 rounded-full font-bold shadow-lg hover:bg-red-600 transition-all flex items-center gap-2 text-sm"><VolumeX className="w-4 h-4" /> Stop Voice Mode</button>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Listening for your commands...</p>
        </div>
      )}
      
      <style>{`
        @keyframes pulseY { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.8); } }
        .animate-pulse-y-1 { animation: pulseY 0.8s ease-in-out infinite; }
        .animate-pulse-y-2 { animation: pulseY 1s ease-in-out infinite; }
        .animate-pulse-y-3 { animation: pulseY 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default ChatAssistant;
