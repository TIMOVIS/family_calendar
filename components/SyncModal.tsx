import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Upload, RefreshCw, Check, AlertCircle, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { CalendarEvent, EventCategory, FamilyMember, ThemeColor } from '../types';
import { generateId } from '../utils';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onAddEvents: (events: CalendarEvent[]) => void;
  theme: ThemeColor;
  currentUser: FamilyMember | null;
}

// Declare global types for Google API
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const SyncModal: React.FC<SyncModalProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  onImport, 
  onAddEvents, 
  theme, 
  currentUser 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  // Google Calendar State
  const [showGoogleSettings, setShowGoogleSettings] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedClientId = localStorage.getItem('famjam_google_client_id');
    const savedApiKey = localStorage.getItem('famjam_google_api_key');
    if (savedClientId) setGoogleClientId(savedClientId);
    if (savedApiKey) setGoogleApiKey(savedApiKey);
  }, []);

  const saveGoogleCredentials = () => {
    localStorage.setItem('famjam_google_client_id', googleClientId);
    localStorage.setItem('famjam_google_api_key', googleApiKey);
    setMessage('Credentials saved!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleGoogleSync = async () => {
    if (!googleClientId || !googleApiKey) {
      setImportStatus('error');
      setMessage('Please enter Client ID and API Key first.');
      setShowGoogleSettings(true);
      return;
    }

    if (!currentUser) {
       setImportStatus('error');
       setMessage('You must be logged in to sync.');
       return;
    }

    setIsGoogleLoading(true);
    setImportStatus('loading');
    setMessage('Connecting to Google...');

    try {
      // 1. Load GAPI Client
      await new Promise<void>((resolve, reject) => {
        if (window.gapi) {
          window.gapi.load('client', resolve);
        } else {
          reject(new Error('Google API script not loaded'));
        }
      });

      // 2. Initialize GAPI Client
      await window.gapi.client.init({
        apiKey: googleApiKey,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      });

      // 3. Initialize Token Client (GIS)
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: async (response: any) => {
          if (response.error) {
            console.error(response);
            setImportStatus('error');
            setMessage('Authorization failed.');
            setIsGoogleLoading(false);
            return;
          }

          try {
            setMessage('Fetching events...');
            // 4. List Events
            const calendarResponse = await window.gapi.client.calendar.events.list({
              'calendarId': 'primary',
              'timeMin': (new Date()).toISOString(),
              'showDeleted': false,
              'singleEvents': true,
              'maxResults': 50,
              'orderBy': 'startTime',
            });

            const googleEvents = calendarResponse.result.items;
            
            // 5. Map to FamJam Events
            const newEvents: CalendarEvent[] = googleEvents.map((gEvent: any) => {
               // Handle Date-only vs DateTime
               const start = gEvent.start.dateTime 
                 ? new Date(gEvent.start.dateTime) 
                 : new Date(gEvent.start.date + 'T00:00:00');
               
               const end = gEvent.end.dateTime
                 ? new Date(gEvent.end.dateTime)
                 : new Date(gEvent.end.date + 'T00:00:00');

               return {
                 id: generateId(), // Generate internal ID
                 title: gEvent.summary || '(No Title)',
                 description: gEvent.description || '',
                 start,
                 end,
                 location: gEvent.location,
                 category: EventCategory.OTHER, // Default category
                 memberIds: [currentUser.id]
               };
            });

            if (newEvents.length > 0) {
              onAddEvents(newEvents);
              setImportStatus('success');
              setMessage(`Successfully added ${newEvents.length} events from Google!`);
            } else {
              setImportStatus('idle');
              setMessage('No upcoming events found.');
            }

          } catch (err) {
            console.error(err);
            setImportStatus('error');
            setMessage('Failed to fetch events API.');
          } finally {
            setIsGoogleLoading(false);
          }
        },
      });

      // 4. Request Access Token
      tokenClient.requestAccessToken();

    } catch (err) {
      console.error(err);
      setImportStatus('error');
      setMessage('Failed to initialize Google Client.');
      setIsGoogleLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    setMessage('Parsing file...');
    try {
      await onImport(file);
      setImportStatus('success');
      setMessage('Calendar imported successfully!');
      setTimeout(() => {
          onClose();
          setImportStatus('idle');
          setMessage('');
      }, 1500);
    } catch (error) {
      console.error(error);
      setImportStatus('error');
      setMessage('Failed to import file. Please check the format.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`bg-${theme}-600 p-6 flex justify-between items-center text-white shrink-0`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <RefreshCw className="w-6 h-6" />
              Sync Calendar
            </h2>
            <p className={`text-${theme}-100 text-sm opacity-90 mt-1`}>Connect with external calendars</p>
          </div>
          <button onClick={onClose} className={`hover:bg-${theme}-700 p-2 rounded-full transition-colors`}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Status Messages */}
          {message && (
             <div className={`flex items-center gap-2 text-sm font-bold p-3 rounded-xl animate-fade-in-up
               ${importStatus === 'error' ? 'bg-red-50 text-red-600' : 
                 importStatus === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                 'bg-blue-50 text-blue-600'}`}>
                {importStatus === 'error' ? <AlertCircle className="w-4 h-4"/> : 
                 importStatus === 'success' ? <Check className="w-4 h-4"/> :
                 <RefreshCw className="w-4 h-4 animate-spin"/>}
                {message}
             </div>
          )}

          {/* Google Calendar Section */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
             <div className="p-4 bg-slate-50 flex items-center gap-3 border-b border-slate-100">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-xl">
                  📅
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">Google Calendar</h3>
                  <p className="text-xs text-slate-500">Fetch events directly</p>
                </div>
             </div>
             
             <div className="p-4 space-y-3">
               <button 
                  onClick={() => setShowGoogleSettings(!showGoogleSettings)}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors mb-2"
               >
                 <Settings className="w-3 h-3" />
                 {showGoogleSettings ? 'Hide API Settings' : 'Configure Access'}
                 {showGoogleSettings ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
               </button>

               {showGoogleSettings && (
                 <div className="space-y-3 bg-slate-50 p-3 rounded-xl animate-fade-in-up">
                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Client ID</label>
                     <input 
                       value={googleClientId}
                       onChange={(e) => setGoogleClientId(e.target.value)}
                       type="text" 
                       placeholder="apps.googleusercontent.com"
                       className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">API Key</label>
                     <input 
                       value={googleApiKey}
                       onChange={(e) => setGoogleApiKey(e.target.value)}
                       type="text" 
                       placeholder="AIza..."
                       className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                     />
                   </div>
                   <div className="flex justify-end">
                     <button onClick={saveGoogleCredentials} className="text-xs font-bold text-blue-600 hover:underline">
                       Save Credentials
                     </button>
                   </div>
                   <p className="text-[10px] text-slate-400 leading-tight">
                     Note: You need a Google Cloud Project with <b>Google Calendar API</b> enabled. 
                     Add <b>http://localhost:3000</b> (or your domain) to "Authorized JavaScript origins".
                   </p>
                 </div>
               )}

               <button 
                 onClick={handleGoogleSync}
                 disabled={isGoogleLoading}
                 className={`w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2`}
               >
                 {isGoogleLoading ? 'Connecting...' : 'Connect & Sync'}
               </button>
             </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Import/Export Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button 
               onClick={onExport}
               className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
               <div className={`w-10 h-10 bg-${theme}-100 text-${theme}-600 rounded-full flex items-center justify-center`}>
                 <Download className="w-5 h-5" />
               </div>
               <span className="text-sm font-bold text-slate-700">Export .ics</span>
            </button>

            <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
            >
               <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center">
                 <Upload className="w-5 h-5" />
               </div>
               <span className="text-sm font-bold text-slate-700">Import .ics</span>
            </button>
             <input 
               type="file" 
               accept=".ics" 
               ref={fileInputRef} 
               className="hidden" 
               onChange={handleFileChange}
             />
          </div>
          
          <div className="text-center pt-2">
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;