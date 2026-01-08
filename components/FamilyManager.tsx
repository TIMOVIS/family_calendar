import React, { useState } from 'react';
import { X, UserPlus, Trash2, Crown, Edit2, Check, AlertCircle, Copy } from 'lucide-react';
import { FamilyMember, ThemeColor } from '../types';
import { THEME_OPTIONS, AVAILABLE_AVATARS } from '../constants';
import { generateId } from '../utils';

interface FamilyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onUpdateMembers: (members: FamilyMember[]) => void;
  theme: ThemeColor;
  joinCode: string | null;
}

const FamilyManager: React.FC<FamilyManagerProps> = ({
  isOpen,
  onClose,
  members,
  onUpdateMembers,
  theme,
  joinCode
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState(AVAILABLE_AVATARS[0]);
  const [newColor, setNewColor] = useState<ThemeColor>(THEME_OPTIONS[0].value);
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyJoinCode = async () => {
    if (joinCode) {
      try {
        await navigator.clipboard.writeText(joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const newMember: FamilyMember = {
      id: generateId(),
      name: newName,
      avatar: newAvatar,
      color: newColor,
      isAdmin: false
    };
    onUpdateMembers([...members, newMember]);
    setNewName('');
    setIsAdding(false);
  };

  const handleUpdateMember = (id: string, updates: Partial<FamilyMember>) => {
    onUpdateMembers(members.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const initiateDelete = (member: FamilyMember) => {
    if (member.isAdmin && members.filter(m => m.isAdmin).length === 1) {
      setErrorMsg("Cannot delete the only admin!");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    setDeleteConfirmationId(member.id);
  };

  const confirmDelete = (id: string) => {
    onUpdateMembers(members.filter(m => m.id !== id));
    setDeleteConfirmationId(null);
  };

  const setMasterAdmin = (id: string) => {
    const updated = members.map(m => ({
        ...m,
        isAdmin: m.id === id
    }));
    onUpdateMembers(updated);
  };

  const renderForm = (isEdit = false, member?: FamilyMember) => {
    const name = isEdit && member ? member.name : newName;
    const avatar = isEdit && member ? member.avatar : newAvatar;
    const color = isEdit && member ? member.color : newColor;

    const setName = (val: string) => isEdit && member ? handleUpdateMember(member.id, { name: val }) : setNewName(val);
    const setAvatar = (val: string) => isEdit && member ? handleUpdateMember(member.id, { avatar: val }) : setNewAvatar(val);
    const setColor = (val: ThemeColor) => isEdit && member ? handleUpdateMember(member.id, { color: val }) : setNewColor(val);

    return (
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mt-2 space-y-4 animate-fade-in-up">
        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
           <input 
             value={name}
             onChange={e => setName(e.target.value)}
             className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
             placeholder="Name"
             autoFocus
           />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-110 ${avatar === a ? 'bg-white shadow-md ring-2 ring-indigo-500' : 'bg-slate-200 opacity-70'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color Theme</label>
           <div className="flex flex-wrap gap-2">
             {THEME_OPTIONS.map(opt => (
               <button
                 key={opt.value}
                 onClick={() => setColor(opt.value)}
                 title={opt.label}
                 className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === opt.value ? 'border-slate-600 scale-110 shadow-sm' : 'border-transparent'}`}
               >
                 <div className={`w-full h-full rounded-full ${opt.color}`}></div>
               </button>
             ))}
           </div>
        </div>

        {!isEdit && (
           <div className="flex justify-end gap-2 pt-2">
             <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-500 font-medium">Cancel</button>
             <button onClick={handleAddMember} disabled={!newName} className={`px-6 py-2 bg-${theme}-600 text-white rounded-xl font-bold shadow-md hover:bg-${theme}-700 disabled:opacity-50`}>Add</button>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-${theme}-600 p-6 flex justify-between items-center text-white`}>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="w-6 h-6 text-yellow-300" />
              Family Manager
            </h2>
            <p className="text-${theme}-100 text-sm opacity-90 mt-1">Set the Master Admin and manage family members</p>
          </div>
          <button onClick={onClose} className={`hover:bg-${theme}-700 p-2 rounded-full transition-colors`}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Toast */}
        {errorMsg && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mx-6 mt-4 rounded shadow-sm flex items-center gap-2 animate-fade-in-up">
                <AlertCircle className="w-5 h-5" />
                <p>{errorMsg}</p>
            </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Join Code Display */}
          {joinCode ? (
            <div className={`bg-${theme}-50 border-2 border-${theme}-200 rounded-2xl p-4 mb-6 animate-fade-in-up`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Family Join Code</label>
                  <div className="flex items-center gap-3">
                    <code className="text-2xl font-bold text-slate-800 tracking-wider bg-white px-4 py-2 rounded-xl border-2 border-slate-200">
                      {joinCode}
                    </code>
                    <button
                      onClick={handleCopyJoinCode}
                      className={`p-2 rounded-xl bg-${theme}-600 text-white hover:bg-${theme}-700 transition-colors flex items-center gap-2`}
                      title="Copy join code"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Share this code with family members so they can join</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-6 animate-fade-in-up">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-bold text-yellow-800">Join code not available</p>
                  <p className="text-xs text-yellow-600 mt-1">The join code could not be loaded. Please refresh the page or check the console for errors.</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {members.map(member => (
              <div key={member.id} className="border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                {/* Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-14 h-14 rounded-full bg-${member.color}-100 flex items-center justify-center text-3xl border-4 border-white shadow-sm`}>
                    {member.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      {member.name}
                      {member.isAdmin && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold border border-yellow-200">Master Admin</span>}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{member.color} Theme</p>
                  </div>
                </div>

                {/* Actions */}
                {editingId === member.id ? (
                  <div className="w-full">
                     {renderForm(true, member)}
                     <div className="flex justify-end mt-2">
                        <button onClick={() => setEditingId(null)} className="text-sm font-bold text-indigo-600">Done</button>
                     </div>
                  </div>
                ) : deleteConfirmationId === member.id ? (
                   <div className="flex items-center gap-3 bg-red-50 p-2 rounded-xl animate-fade-in-up">
                       <span className="text-xs font-bold text-red-600">Delete?</span>
                       <button 
                           onClick={() => confirmDelete(member.id)}
                           className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                           title="Confirm Delete"
                       >
                           <Check className="w-4 h-4" />
                       </button>
                       <button 
                           onClick={() => setDeleteConfirmationId(null)}
                           className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                           title="Cancel"
                       >
                           <X className="w-4 h-4" />
                       </button>
                   </div>
                ) : (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!member.isAdmin && (
                        <button 
                            onClick={() => setMasterAdmin(member.id)}
                            title="Set as Master Admin"
                            className="p-2 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-xl transition-colors"
                        >
                            <Crown className="w-5 h-5" />
                        </button>
                    )}
                    <button 
                        onClick={() => setEditingId(member.id)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    >
                        <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => initiateDelete(member)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isAdding && !editingId && !deleteConfirmationId && (
            <button 
              onClick={() => setIsAdding(true)}
              className={`w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-bold hover:border-${theme}-500 hover:text-${theme}-600 hover:bg-${theme}-50 transition-all flex items-center justify-center gap-2`}
            >
              <UserPlus className="w-5 h-5" />
              Add Family Member
            </button>
          )}

          {isAdding && renderForm()}

        </div>
      </div>
    </div>
  );
};

export default FamilyManager;