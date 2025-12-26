import React, { useState, useRef } from 'react';
import { Gift, Plus, Star, Trash2, Heart, ExternalLink, ChevronRight, Image as ImageIcon, Link as LinkIcon, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { WishListItem, FamilyMember, ThemeColor } from '../types';
import { generateId } from '../utils';

interface WishListViewProps {
  items: WishListItem[];
  members: FamilyMember[];
  currentUser: FamilyMember;
  onAddItem: (item: WishListItem) => void;
  onDeleteItem: (id: string) => void;
  theme: ThemeColor;
}

const WishListView: React.FC<WishListViewProps> = ({
  items,
  members,
  currentUser,
  onAddItem,
  onDeleteItem,
  theme
}) => {
  const [activeTab, setActiveTab] = useState(currentUser.id);
  const [newItemName, setNewItemName] = useState('');
  const [occasion, setOccasion] = useState('General');
  const [priority, setPriority] = useState<WishListItem['priority']>('medium');
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [link, setLink] = useState('');
  const [comments, setComments] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const item: WishListItem = {
      id: generateId(),
      name: newItemName,
      occasion,
      priority,
      ownerId: currentUser.id,
      link: link.trim() || undefined,
      comments: comments.trim() || undefined,
      image
    };

    onAddItem(item);
    setNewItemName('');
    setOccasion('General');
    setPriority('medium');
    setLink('');
    setComments('');
    setImage(undefined);
    setShowDetailsForm(false);
    setActiveTab(currentUser.id);
  };

  const activeMember = members.find(m => m.id === activeTab);
  const memberItems = items.filter(item => item.ownerId === activeTab);
  
  const itemsByOccasion = memberItems.reduce((acc, item) => {
    if (!acc[item.occasion]) acc[item.occasion] = [];
    acc[item.occasion].push(item);
    return acc;
  }, {} as Record<string, WishListItem[]>);

  const occasions = ['General', 'Birthday', 'Christmas', 'Anniversary', 'Other'];

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden min-h-[600px] flex flex-col sm:flex-row">
        {/* Sidebar Tabs */}
        <div className="w-full sm:w-64 bg-slate-50 border-r border-slate-100 p-6 flex flex-col gap-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Family Wishlists</h3>
          {members.map(member => (
            <button
              key={member.id}
              onClick={() => setActiveTab(member.id)}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                activeTab === member.id 
                  ? `bg-white shadow-md ring-1 ring-slate-100 text-slate-800 translate-x-1` 
                  : 'text-slate-400 hover:bg-white hover:text-slate-600'
              }`}
            >
              <span className="text-2xl">{member.avatar}</span>
              <span className="font-bold">{member.name}</span>
              {activeTab === member.id && <ChevronRight className={`ml-auto w-4 h-4 text-${theme}-500`} />}
            </button>
          ))}
          
          <div className="mt-auto pt-6 border-t border-slate-200">
             <div className={`p-4 rounded-2xl bg-${theme}-50 border border-${theme}-100`}>
                <Gift className={`w-6 h-6 text-${theme}-500 mb-2`} />
                <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Gift planning made easy for the whole fam!</p>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === currentUser.id && (
            <form onSubmit={handleAdd} className={`bg-${theme}-50 p-6 rounded-3xl border border-${theme}-100 mb-8 space-y-4`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className={`font-black text-${theme}-600 uppercase tracking-widest text-xs flex items-center gap-2`}>
                  <Plus className="w-4 h-4" /> Add to my wishlist
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDetailsForm(!showDetailsForm)}
                  className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${showDetailsForm ? `bg-${theme}-600 text-white border-${theme}-600` : `bg-white text-${theme}-600 border-${theme}-200`}`}
                >
                  {showDetailsForm ? 'Hide Details' : '+ Add Image/Link'}
                </button>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="What are you wishing for?"
                  className="flex-1 px-4 py-2 rounded-xl border border-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {showDetailsForm && (
                <div className="grid gap-4 p-4 bg-white/50 rounded-2xl border border-white/50 animate-fade-in-up">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Product Link</label>
                      <input 
                        type="url" 
                        value={link}
                        onChange={e => setLink(e.target.value)}
                        placeholder="https://..." 
                        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-100 text-xs" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Photo</label>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 bg-white rounded-lg border border-slate-100 text-xs text-slate-400 font-bold uppercase flex items-center justify-center gap-2 overflow-hidden"
                      >
                        {image ? <span className="text-emerald-500">Image Attached!</span> : <><ImageIcon className="w-3 h-3" /> Upload</>}
                      </button>
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Notes / Specs</label>
                    <textarea 
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="Size, color, store, etc..."
                      className="w-full p-3 bg-white rounded-lg border border-slate-100 text-xs h-20 resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Occasion:</span>
                  <select 
                    value={occasion} 
                    onChange={e => setOccasion(e.target.value)}
                    className="bg-white border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-600 shadow-sm outline-none"
                  >
                    {occasions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Priority:</span>
                   {(['low', 'medium', 'high'] as const).map(p => (
                     <button
                       key={p}
                       type="button"
                       onClick={() => setPriority(p)}
                       className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                         priority === p ? `bg-${theme}-500 text-white shadow-md` : 'bg-white text-slate-300 hover:text-slate-400'
                       }`}
                     >
                       <Star className={`w-3 h-3 ${priority === p ? 'fill-current' : ''}`} />
                     </button>
                   ))}
                </div>
                <button 
                  type="submit"
                  className={`ml-auto bg-${theme}-600 text-white px-5 py-2 rounded-xl font-bold shadow-md hover:scale-105 active:scale-95 transition-all text-sm`}
                >
                  Save Wish
                </button>
              </div>
            </form>
          )}

          <div className="space-y-8">
            <div className="flex items-center justify-between mb-4">
               <div>
                  <h2 className="text-2xl font-black text-slate-800">{activeMember?.name}'s List</h2>
                  <p className="text-sm text-slate-400 font-medium">Total items: {memberItems.length}</p>
               </div>
               <div className={`w-12 h-12 bg-${activeMember?.color}-100 rounded-full flex items-center justify-center text-2xl border-2 border-white shadow-sm`}>
                 {activeMember?.avatar}
               </div>
            </div>

            {Object.entries(itemsByOccasion).length === 0 ? (
              <div className="text-center py-12 text-slate-300">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">No wishes here yet.</p>
              </div>
            ) : (
              (Object.entries(itemsByOccasion) as [string, WishListItem[]][]).map(([occ, occasionItems]) => (
                <div key={occ} className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 border-l-4 border-slate-200">{occ}</h4>
                  <div className="grid gap-4">
                    {occasionItems.map(item => {
                      const isExpanded = expandedId === item.id;
                      const hasDetails = item.comments || item.link || item.image;

                      return (
                        <div key={item.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                          <div className="p-4 flex items-center gap-4">
                            {item.image && (
                              <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            {!item.image && (
                              <div className={`w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center text-${theme}-500 flex-shrink-0`}>
                                <Star className={`w-6 h-6 ${item.priority === 'high' ? 'fill-current text-amber-500' : item.priority === 'medium' ? 'fill-current opacity-50' : ''}`} />
                              </div>
                            )}
                            
                            <div className="flex-1" onClick={() => hasDetails && setExpandedId(isExpanded ? null : item.id)}>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-slate-800 text-lg">{item.name}</h5>
                                {hasDetails && (
                                  <div className="flex gap-1 ml-auto sm:ml-0">
                                    {item.comments && <MessageSquare className="w-3.5 h-3.5 text-slate-300" />}
                                    {item.link && <LinkIcon className="w-3.5 h-3.5 text-slate-300" />}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  item.priority === 'high' ? 'bg-rose-100 text-rose-600' :
                                  item.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {item.priority} priority
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {hasDetails && (
                                <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="p-2 text-slate-400">
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                              )}
                              {activeTab === currentUser.id && (
                                <button 
                                  onClick={() => onDeleteItem(item.id)}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-6 pb-6 pt-4 border-t border-slate-50 bg-slate-50/50 animate-fade-in-up">
                               {item.comments && (
                                 <div className="mb-4">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Notes</label>
                                   <p className="text-sm text-slate-600 leading-relaxed italic">"{item.comments}"</p>
                                 </div>
                               )}
                               {item.link && (
                                 <a 
                                   href={item.link} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-white p-3 rounded-xl border border-slate-100 w-fit hover:shadow-sm"
                                 >
                                   <ExternalLink className="w-4 h-4" /> Shop this item
                                 </a>
                               )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishListView;