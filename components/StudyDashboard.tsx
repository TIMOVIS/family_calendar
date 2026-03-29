import React, { useState } from 'react';
import {
  BookOpen, Trophy, Star, Lock, Unlock, Target, Calendar,
  TrendingUp, Clock, ChevronDown, ChevronUp, Edit2, Check, X
} from 'lucide-react';
import { FamilyMember, CalendarEvent, WishListItem, EventCategory, StudySubject, ThemeColor } from '../types';
import { familyService } from '../services/supabaseService';

interface StudyDashboardProps {
  members: FamilyMember[];
  events: CalendarEvent[];
  wishListItems: WishListItem[];
  currentUser: FamilyMember;
  theme: ThemeColor;
  onMembersUpdated: (members: FamilyMember[]) => void;
}

const SUBJECT_COLORS: Record<StudySubject, string> = {
  [StudySubject.MATHS]: 'bg-blue-100 text-blue-700 border-blue-200',
  [StudySubject.ENGLISH]: 'bg-purple-100 text-purple-700 border-purple-200',
  [StudySubject.VERBAL_REASONING]: 'bg-amber-100 text-amber-700 border-amber-200',
  [StudySubject.NON_VERBAL_REASONING]: 'bg-rose-100 text-rose-700 border-rose-200',
  [StudySubject.CREATIVE_WRITING]: 'bg-teal-100 text-teal-700 border-teal-200',
};

const SUBJECT_ICONS: Record<StudySubject, string> = {
  [StudySubject.MATHS]: '🔢',
  [StudySubject.ENGLISH]: '📖',
  [StudySubject.VERBAL_REASONING]: '💬',
  [StudySubject.NON_VERBAL_REASONING]: '🔷',
  [StudySubject.CREATIVE_WRITING]: '✍️',
};

function daysUntil(dateStr: string): number {
  const exam = new Date(dateStr);
  exam.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
}

function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1); // Monday
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

interface StudentProfileEditorProps {
  member: FamilyMember;
  onSave: (updated: Partial<FamilyMember>) => Promise<void>;
  onCancel: () => void;
}

const StudentProfileEditor: React.FC<StudentProfileEditorProps> = ({ member, onSave, onCancel }) => {
  const [examDate, setExamDate] = useState(member.examDate || '');
  const [yearGroup, setYearGroup] = useState(member.yearGroup || '');
  const [targetSchools, setTargetSchools] = useState((member.targetSchools || []).join(', '));
  const [subjects, setSubjects] = useState<StudySubject[]>(member.studySubjects || Object.values(StudySubject));
  const [saving, setSaving] = useState(false);

  const toggleSubject = (s: StudySubject) => {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        isStudent: true,
        examDate: examDate || undefined,
        yearGroup: yearGroup || undefined,
        targetSchools: targetSchools.split(',').map(s => s.trim()).filter(Boolean),
        studySubjects: subjects,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Year Group</label>
          <select
            value={yearGroup}
            onChange={e => setYearGroup(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">Select...</option>
            {['Year 3', 'Year 4', 'Year 5', 'Year 6'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Exam Date</label>
          <input
            type="date"
            value={examDate}
            onChange={e => setExamDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Schools (comma separated)</label>
        <input
          type="text"
          value={targetSchools}
          onChange={e => setTargetSchools(e.target.value)}
          placeholder="e.g. Merchant Taylors', St Albans School"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Study Subjects</label>
        <div className="flex flex-wrap gap-2">
          {Object.values(StudySubject).map(s => (
            <button
              key={s}
              onClick={() => toggleSubject(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                subjects.includes(s)
                  ? SUBJECT_COLORS[s] + ' shadow-sm'
                  : 'bg-white text-slate-400 border-slate-200 opacity-60'
              }`}
            >
              {SUBJECT_ICONS[s]} {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );
};

const StudyDashboard: React.FC<StudyDashboardProps> = ({
  members,
  events,
  wishListItems,
  currentUser,
  theme,
  onMembersUpdated,
}) => {
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const students = members.filter(m => m.isStudent);
  const canEdit = currentUser.isAdmin || true; // Parents and admins can edit

  const { start: weekStart, end: weekEnd } = getThisWeekRange();

  // Study events this week per student
  const getStudySessionsThisWeek = (studentId: string) => {
    return events.filter(e => {
      const d = new Date(e.start);
      return e.category === EventCategory.STUDY &&
        e.memberIds.includes(studentId) &&
        d >= weekStart && d <= weekEnd;
    });
  };

  // Total study minutes per subject this week for a student
  const getSubjectBreakdown = (studentId: string): Record<string, number> => {
    const sessions = getStudySessionsThisWeek(studentId);
    const breakdown: Record<string, number> = {};
    for (const s of sessions) {
      const subject = s.studySubject || 'Other';
      const mins = Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000);
      breakdown[subject] = (breakdown[subject] || 0) + mins;
    }
    return breakdown;
  };

  // Completed study sessions this week
  const getCompletedThisWeek = (studentId: string) => {
    return getStudySessionsThisWeek(studentId).filter(e => e.isCompleted).length;
  };

  // Rewards for a student
  const getRewards = (studentId: string) => {
    return wishListItems.filter(w => w.ownerId === studentId && w.rewardPoints != null);
  };

  const getMemberPoints = (studentId: string) => {
    return members.find(m => m.id === studentId)?.points || 0;
  };

  const handleSaveStudentProfile = async (memberId: string, updates: Partial<FamilyMember>) => {
    try {
      await familyService.updateStudentProfile(memberId, {
        isStudent: updates.isStudent,
        examDate: updates.examDate || null,
        targetSchools: updates.targetSchools || null,
        yearGroup: updates.yearGroup || null,
        studySubjects: updates.studySubjects || null,
      });
      // Refresh members locally
      const updatedMembers = members.map(m =>
        m.id === memberId ? { ...m, ...updates } : m
      );
      onMembersUpdated(updatedMembers);
      setEditingStudentId(null);
    } catch (err: any) {
      const msg = (err?.message || String(err)).toLowerCase();
      const isMigrationError = msg.includes('column') || msg.includes('does not exist') || msg.includes('schema cache') || err?.code === 'PGRST204';
      if (isMigrationError) {
        alert('The 11+ database migration has not been run yet.\n\nPlease run the SQL in Supabase:\nsupabase/migrations/11plus_features.sql\n\nThen reload the schema cache:\nProject Settings → API → Reload');
      } else {
        alert(`Failed to save student profile: ${err?.message || err}`);
      }
    }
  };

  const handleMarkAsStudent = async (memberId: string) => {
    try {
      await familyService.updateStudentProfile(memberId, { isStudent: true });
      const updatedMembers = members.map(m =>
        m.id === memberId ? { ...m, isStudent: true } : m
      );
      onMembersUpdated(updatedMembers);
      setEditingStudentId(memberId);
    } catch (err: any) {
      const msg = (err?.message || String(err)).toLowerCase();
      const isMigrationError = msg.includes('column') || msg.includes('does not exist') || msg.includes('schema cache') || err?.code === 'PGRST204';
      if (isMigrationError) {
        alert('The 11+ database migration has not been run yet.\n\nPlease run the SQL in Supabase:\nsupabase/migrations/11plus_features.sql\n\nThen reload the schema cache:\nProject Settings → API → Reload');
      } else {
        alert(`Failed to set up student profile: ${err?.message || err}`);
      }
    }
  };

  const nonStudentChildren = members.filter(m => !m.isStudent && !m.isAdmin);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-black text-${theme}-900`}>11+ Study Tracker</h2>
          <p className="text-slate-500 font-medium mt-1">Track progress, celebrate milestones, and stay on target</p>
        </div>
        <div className="text-4xl">🎓</div>
      </div>

      {/* Add student prompt */}
      {nonStudentChildren.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-800 mb-2">Set up 11+ profiles for:</p>
          <div className="flex flex-wrap gap-2">
            {nonStudentChildren.map(m => (
              <button
                key={m.id}
                onClick={() => handleMarkAsStudent(m.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                {m.avatar} {m.name} <span className="text-amber-400">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {students.length === 0 && nonStudentChildren.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">No students set up yet</h3>
          <p className="text-slate-500">Add family members first, then set them up as 11+ students here.</p>
        </div>
      )}

      {/* Student cards */}
      {students.map(student => {
        const days = student.examDate ? daysUntil(student.examDate) : null;
        const sessions = getStudySessionsThisWeek(student.id);
        const completed = getCompletedThisWeek(student.id);
        const breakdown = getSubjectBreakdown(student.id);
        const rewards = getRewards(student.id);
        const points = getMemberPoints(student.id);
        const isExpanded = expandedStudentId === student.id;
        const isEditing = editingStudentId === student.id;

        return (
          <div key={student.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Student header */}
            <div
              className="p-6 cursor-pointer"
              onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-${student.color}-100 flex items-center justify-center text-3xl border-2 border-${student.color}-200 shadow-sm`}>
                    {student.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-slate-800">{student.name}</h3>
                      {student.yearGroup && (
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{student.yearGroup}</span>
                      )}
                    </div>
                    {days !== null ? (
                      <p className={`text-sm font-bold mt-0.5 ${days <= 30 ? 'text-red-500' : days <= 90 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {days > 0 ? `${days} days until exam` : days === 0 ? 'Exam today!' : 'Exam passed'}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 font-medium">Exam date not set</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Points badge */}
                  <div className="text-center">
                    <div className={`text-2xl font-black text-${theme}-600`}>{points}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">pts</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setEditingStudentId(isEditing ? null : student.id); setExpandedStudentId(student.id); }}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>

              {/* Exam countdown bar */}
              {days !== null && days > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Exam countdown</span>
                    <span>{student.examDate ? new Date(student.examDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${days <= 30 ? 'bg-red-400' : days <= 90 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(100, Math.max(5, (1 - days / 365) * 100))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Target schools */}
              {student.targetSchools && student.targetSchools.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Target className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {student.targetSchools.map(school => (
                    <span key={school} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100">{school}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-6 pb-6 space-y-6 border-t border-slate-100 pt-6">
                {/* Edit profile form */}
                {isEditing && (
                  <StudentProfileEditor
                    member={student}
                    onSave={(updates) => handleSaveStudentProfile(student.id, updates)}
                    onCancel={() => setEditingStudentId(null)}
                  />
                )}

                {/* This week's study */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-500" /> This Week's Study
                    </h4>
                    <span className="text-sm font-bold text-slate-500">{completed}/{sessions.length} sessions done</span>
                  </div>

                  {sessions.length === 0 ? (
                    <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3 text-center">
                      No study sessions scheduled this week. Ask the AI to create a study plan!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map(s => (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border ${s.isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                          <span className="text-lg">{s.studySubject ? SUBJECT_ICONS[s.studySubject] : '📚'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${s.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>{s.title}</p>
                            <p className="text-xs text-slate-400">{new Date(s.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(s.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          {s.studySubject && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${SUBJECT_COLORS[s.studySubject]}`}>{s.studySubject}</span>
                          )}
                          {s.isCompleted && <span className="text-emerald-500 text-sm">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subject breakdown */}
                {Object.keys(breakdown).length > 0 && (
                  <div>
                    <h4 className="font-black text-slate-700 flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-purple-500" /> Subject Breakdown
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(breakdown).sort((a, b) => b[1] - a[1]).map(([subject, mins]) => {
                        const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
                        const pct = Math.round((mins / total) * 100);
                        const subjectKey = subject as StudySubject;
                        const colorClass = SUBJECT_COLORS[subjectKey] || 'bg-slate-100 text-slate-600 border-slate-200';
                        return (
                          <div key={subject}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                {SUBJECT_ICONS[subjectKey] || '📚'} {subject}
                              </span>
                              <span className="text-xs font-bold text-slate-500">{mins}m ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${subjectKey === StudySubject.MATHS ? 'bg-blue-400' : subjectKey === StudySubject.ENGLISH ? 'bg-purple-400' : subjectKey === StudySubject.VERBAL_REASONING ? 'bg-amber-400' : subjectKey === StudySubject.NON_VERBAL_REASONING ? 'bg-rose-400' : 'bg-teal-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Study subjects focus */}
                {student.studySubjects && student.studySubjects.length > 0 && (
                  <div>
                    <h4 className="font-black text-slate-700 flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-teal-500" /> Focus Subjects
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {student.studySubjects.map(s => (
                        <span key={s} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${SUBJECT_COLORS[s]}`}>
                          {SUBJECT_ICONS[s]} {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rewards */}
                {rewards.length > 0 && (
                  <div>
                    <h4 className="font-black text-slate-700 flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-amber-500" /> Study Rewards
                      <span className="text-xs font-bold text-slate-400 normal-case ml-1">({points} pts earned)</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rewards
                        .sort((a, b) => (a.rewardPoints || 0) - (b.rewardPoints || 0))
                        .map(reward => {
                          const unlocked = points >= (reward.rewardPoints || 0);
                          return (
                            <div
                              key={reward.id}
                              className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                unlocked
                                  ? 'bg-amber-50 border-amber-200 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 opacity-70'
                              }`}
                            >
                              {reward.image ? (
                                <img src={reward.image} alt={reward.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                              ) : (
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${unlocked ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                  {unlocked ? '🎁' : '🔒'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${unlocked ? 'text-slate-800' : 'text-slate-500'}`}>{reward.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Star className={`w-3 h-3 ${unlocked ? 'text-amber-500' : 'text-slate-300'}`} />
                                  <span className={`text-xs font-bold ${unlocked ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {reward.rewardPoints} pts needed
                                  </span>
                                </div>
                                {!unlocked && (
                                  <div className="mt-1 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className="h-full bg-amber-400 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, Math.round((points / (reward.rewardPoints || 1)) * 100))}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              {unlocked ? (
                                <Unlock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                              ) : (
                                <Lock className="w-5 h-5 text-slate-300 flex-shrink-0" />
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {rewards.length === 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                    <p className="text-sm font-bold text-amber-700">No rewards set up yet</p>
                    <p className="text-xs text-amber-600 mt-1">Go to the Wish List and set a point cost on items to make them study rewards for {student.name}.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* AI tip */}
      <div className={`bg-${theme}-50 border border-${theme}-100 rounded-2xl p-4 flex gap-3`}>
        <span className="text-2xl flex-shrink-0">💡</span>
        <div>
          <p className={`text-sm font-bold text-${theme}-800`}>Ask the AI assistant to help!</p>
          <p className={`text-xs text-${theme}-600 mt-0.5`}>Try: "Create a 2-week study plan for [name]" or "Reschedule this week's study sessions to fit around swimming practice" or "Add more Maths sessions for next week".</p>
        </div>
      </div>
    </div>
  );
};

export default StudyDashboard;
