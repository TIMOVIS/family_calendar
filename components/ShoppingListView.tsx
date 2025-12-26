import React, { useState, useRef } from 'react';
import { ShoppingBag, Plus, Calendar, Trash2, CheckCircle2, Circle, Image as ImageIcon, Link as LinkIcon, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { ShoppingItem, FamilyMember, ThemeColor } from '../types';
import { generateId } from '../utils';

interface ShoppingListViewProps {
  items: ShoppingItem[];
  members: FamilyMember[];
  currentUser: FamilyMember;
  onAddItem: (item: ShoppingItem) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  theme: ThemeColor;
}

const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  items,
  members,
  currentUser,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  theme
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [urgency, setUrgency] = useState<ShoppingItem['urgency']>('normal');
  const [neededBy, setNeededBy] = useState('');
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
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const item: ShoppingItem = {
      id: generateId(),
      name: newItemName,
      urgency,
      neededBy: neededBy ? new Date(neededBy) : undefined,
      addedBy: currentUser.id,
      isCompleted: false,
      link: link.trim() || undefined,
      comments: comments.trim() || undefined,
      image
    };

    onAddItem(item);
    setNewItemName('');
    setUrgency('normal');
    setNeededBy('');
    setLink('');
    setComments('');
    setImage(undefined);
    setShowDetailsForm(false);
  };

  const sortedItems = [...items].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    const urgencyMap = { critical: 0, urgent: 1, normal: 2 };
    return urgencyMap[a.urgency] - urgencyMap[b.urgency];
  });

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className={`bg-${theme}-600 p-8 text-white`}>
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8" />
            <h2 className="text-3xl font-bold">Family Shopping List</h2>
          </div>
          <p className={`text-${theme}-100 opacity-90`}>Shared list for the whole home</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleAdd} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="What do we need? (e.g. Milk, Batteries)"
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                type="submit"
                className={`bg-${theme}-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2`}
              >
                <Plus className="w-5 h-5" /> Add
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 uppercase text-[10px]">Urgency:</span>
                {(['normal', 'urgent', 'critical'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`px-3 py-1 rounded-full border transition-all capitalize font-bold ${
                      urgency === u
                        ? u === 'critical' ? 'bg-red-500 border-red-500 text-white' :
                          u === 'urgent' ? 'bg-orange-500 border-orange-500 text-white' :
                          `bg-${theme}-500 border-${theme}-500 text-white`
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsForm(!showDetailsForm)}
                className={`flex items-center gap-1 font-bold text-xs uppercase px-3 py-1 rounded-full border transition-all ${showDetailsForm ? `bg-${theme}-100 text-${theme}-700 border-${theme}-200` : 'text-slate-400 border-slate-200 hover:bg-slate-100'}`}
              >
                {showDetailsForm ? 'Hide Details' : 'Add Details (Photo/Link)'}
              </button>
            </div>

            {showDetailsForm && (
              <div className="grid gap-4 p-4 bg-white rounded-2xl border border-slate-200 animate-fade-in-up">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Link / URL</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="url" 
                        value={link} 
                        onChange={e => setLink(e.target.value)}
                        placeholder="Paste product link..." 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Needed By</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={neededBy}
                        onChange={(e) => setNeededBy(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Comments / Notes</label>
                    <textarea 
                      value={comments}
                      onChange={e => setComments(e.target.value)}
                      placeholder="Add specific brand, size or store details..."
                      className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Photo</label>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors group overflow-hidden"
                    >
                      {image ? (
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-slate-300 group-hover:text-indigo-400" />
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Upload</span>
                        </>
                      )}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="space-y-3">
            {sortedItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">Nothing on the list yet!</p>
              </div>
            ) : (
              sortedItems.map((item) => {
                const addedBy = members.find(m => m.id === item.addedBy);
                const hasDetails = item.link || item.image || item.comments;
                const isExpanded = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col rounded-2xl border transition-all overflow-hidden ${
                      item.isCompleted 
                        ? 'bg-slate-50 border-slate-100 opacity-60' 
                        : 'bg-white border-slate-100 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <button
                        onClick={() => onToggleItem(item.id)}
                        className={`transition-colors ${item.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                      >
                        {item.isCompleted ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                      </button>

                      <div className="flex-1 min-w-0" onClick={() => hasDetails && setExpandedId(isExpanded ? null : item.id)}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-bold text-lg ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {item.name}
                          </h4>
                          {!item.isCompleted && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                              item.urgency === 'critical' ? 'bg-red-100 text-red-600' :
                              item.urgency === 'urgent' ? 'bg-orange-100 text-orange-600' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {item.urgency}
                            </span>
                          )}
                          {hasDetails && (
                            <div className="flex gap-1 ml-auto sm:ml-0">
                               {item.image && <ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
                               {item.link && <LinkIcon className="w-3.5 h-3.5 text-slate-400" />}
                               {item.comments && <MessageSquare className="w-3.5 h-3.5 text-slate-400" />}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-400">
                          {item.neededBy && (
                            <span className="flex items-center gap-1 text-indigo-500">
                              <Calendar className="w-3.5 h-3.5" /> 
                              {new Date(item.neededBy).toLocaleDateString()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            {addedBy?.avatar} {addedBy?.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {hasDetails && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-14 pb-4 animate-fade-in-up border-t border-slate-50 pt-4 bg-slate-50/50">
                        <div className="flex flex-col sm:flex-row gap-6">
                           {item.image && (
                             <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">
                               <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                             </div>
                           )}
                           <div className="flex-1 space-y-4">
                              {item.comments && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</label>
                                  <p className="text-sm text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">{item.comments}</p>
                                </div>
                              )}
                              {item.link && (
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Link</label>
                                  <a 
                                    href={item.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline bg-indigo-50 px-3 py-2 rounded-lg w-fit"
                                  >
                                    <ExternalLink className="w-3 h-3" /> View Product
                                  </a>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListView;