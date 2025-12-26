import React, { useState, useEffect } from 'react';
import { X, User, Check } from 'lucide-react';
import { FamilyMember, ThemeColor } from '../types';
import { THEME_OPTIONS, AVAILABLE_AVATARS } from '../constants';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FamilyMember;
  onUpdate: (updatedMember: FamilyMember) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentUser, onUpdate }) => {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [color, setColor] = useState<ThemeColor>(currentUser.color);

  // Sync state when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setAvatar(currentUser.avatar);
      setColor(currentUser.color);
    }
  }, [isOpen, currentUser]);

  const handleSave = () => {
    if (!name.trim()) return;
    onUpdate({
      ...currentUser,
      name,
      avatar,
      color
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className={`bg-${color}-600 p-6 flex justify-between items-center text-white transition-colors duration-300`}>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <User className="w-6 h-6" />
              Edit Profile
            </h2>
            <p className="text-${color}-100 text-xs opacity-90 mt-1">Customize your look!</p>
          </div>
          <button onClick={onClose} className={`hover:bg-${color}-700 p-2 rounded-full transition-colors`}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Display Name</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold text-slate-800"
              placeholder="Your Name"
              autoFocus
            />
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Choose Avatar</label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110 
                    ${avatar === a 
                      ? `bg-${color}-100 ring-4 ring-${color}-200 shadow-lg scale-110` 
                      : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Color Selection */}
          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Theme Color</label>
             <div className="flex flex-wrap gap-3">
               {THEME_OPTIONS.map((opt) => (
                 <button
                   key={opt.value}
                   onClick={() => setColor(opt.value)}
                   title={opt.label}
                   className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-110 flex items-center justify-center
                     ${color === opt.value 
                       ? 'border-slate-800 scale-110 shadow-md' 
                       : 'border-transparent'
                     }`}
                 >
                   <div className={`w-full h-full rounded-full ${opt.color}`}>
                     {color === opt.value && <Check className="w-5 h-5 text-white mx-auto mt-0.5" strokeWidth={3} />}
                   </div>
                 </button>
               ))}
             </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave}
            className={`w-full py-3 bg-${color}-600 hover:bg-${color}-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2`}
          >
            <Check className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;