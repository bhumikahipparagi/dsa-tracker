import { useState } from 'react';
import { Plus, Trash2, Edit3, Save, X, ExternalLink, Tag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ConceptNote } from '../../types';
import { format, parseISO } from 'date-fns';

const NEETCODE_PATTERNS = [
  'Arrays & Hashing', 'Two Pointers', 'Sliding Window', 'Stack', 'Binary Search',
  'Linked List', 'Trees', 'Tries', 'Heap / Priority Queue', 'Backtracking',
  'Graphs', 'Dynamic Programming', 'Greedy', 'Intervals', 'Math & Geometry',
  'Bit Manipulation', 'BFS / DFS', 'Union Find', 'Topological Sort', 'Divide & Conquer',
];

function NoteCard({ note, onEdit, onDelete }: {
  note: ConceptNote;
  onEdit: (note: ConceptNote) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[#141428] border border-[#2a2a4e] rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{note.title}</h3>
            {note.pattern && (
              <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 flex items-center gap-1">
                <Tag size={9} />{note.pattern}
              </span>
            )}
          </div>
          {note.source && (
            <a href={note.source} target="_blank" rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-violet-400 flex items-center gap-1 mt-0.5">
              <ExternalLink size={10} />{note.source.replace('https://', '').slice(0, 40)}
            </a>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onEdit(note)} className="text-slate-600 hover:text-slate-300"><Edit3 size={14} /></button>
          <button onClick={() => onDelete(note.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
        </div>
      </div>
      <div className={`mt-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap ${!expanded && 'line-clamp-3'}`}>
        {note.content}
      </div>
      {note.content.length > 200 && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-xs text-violet-400 hover:text-violet-300 mt-2">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
      <div className="text-xs text-slate-600 mt-3">
        Updated {format(parseISO(note.updatedAt), 'MMM d, yyyy')}
      </div>
    </div>
  );
}

const emptyNote = (): Omit<ConceptNote, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  content: '',
  pattern: '',
  source: '',
  linkedProblemIds: [],
  linkedDivisionId: '',
});

export default function NotesPage() {
  const { conceptNotes, addNote, updateNote, deleteNote } = useStore();
  const [editing, setEditing] = useState<ConceptNote | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyNote());
  const [filterPattern, setFilterPattern] = useState('');

  const openCreate = () => { setForm(emptyNote()); setCreating(true); setEditing(null); };
  const openEdit = (note: ConceptNote) => { setEditing(note); setForm({ ...note }); setCreating(false); };
  const closeForm = () => { setCreating(false); setEditing(null); };

  const saveForm = () => {
    if (!form.title.trim()) return;
    const now = new Date().toISOString();
    if (creating) {
      addNote({ ...form, id: `note-${Date.now()}`, createdAt: now, updatedAt: now });
    } else if (editing) {
      updateNote(editing.id, { ...form });
    }
    closeForm();
  };

  const filtered = filterPattern
    ? conceptNotes.filter((n) => n.pattern === filterPattern)
    : conceptNotes;

  const FormPanel = () => (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 pt-16 overflow-auto">
      <div className="bg-[#141428] border border-[#2d2d52] rounded-xl w-full max-w-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-white">{creating ? 'New Concept Note' : 'Edit Note'}</h3>
          <button onClick={closeForm} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Title (e.g. Two Pointer Technique)" autoFocus
          className="w-full bg-[#10101e] border border-[#2d2d52] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500" />
        <select value={form.pattern} onChange={(e) => setForm({ ...form, pattern: e.target.value })}
          className="w-full bg-[#10101e] border border-[#2d2d52] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-violet-500">
          <option value="">Select NeetCode pattern...</option>
          {NEETCODE_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
          placeholder="Source URL (GFG, NeetCode, CP-algorithms...)"
          className="w-full bg-[#10101e] border border-[#2d2d52] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500" />
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={10} placeholder="Write your concept notes here. Keep it simple — enough to understand the pattern..."
          className="w-full bg-[#10101e] border border-[#2d2d52] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 resize-none font-mono" />
        <div className="flex gap-3">
          <button onClick={saveForm}
            className="flex-1 bg-violet-500 hover:bg-violet-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Save size={14} />{creating ? 'Add Note' : 'Save Changes'}
          </button>
          <button onClick={closeForm}
            className="px-4 bg-[#10101e] border border-[#2d2d52] text-slate-400 rounded-lg text-sm hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Concept Notes</h1>
          <p className="text-slate-400 text-sm mt-0.5">{conceptNotes.length} notes · Organized by NeetCode patterns</p>
        </div>
        <div className="flex-1" />
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} />New Note
        </button>
      </div>

      {/* Pattern filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilterPattern('')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !filterPattern ? 'bg-violet-500/20 border-violet-500 text-violet-400' : 'border-[#2d2d52] text-slate-500 hover:border-[#555]'
          }`}>All</button>
        {NEETCODE_PATTERNS.filter((p) => conceptNotes.some((n) => n.pattern === p)).map((p) => (
          <button key={p} onClick={() => setFilterPattern(p)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterPattern === p ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-[#2d2d52] text-slate-500 hover:border-[#555]'
            }`}>{p}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#141428] border border-[#2a2a4e] rounded-xl p-12 text-center">
          <p className="text-slate-500 text-sm">No concept notes yet.</p>
          <p className="text-slate-600 text-xs mt-1">Add notes about patterns, concepts, and techniques you learn.</p>
          <button onClick={openCreate}
            className="mt-4 text-sm text-violet-400 hover:text-violet-300">Add your first note →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={deleteNote} />
          ))}
        </div>
      )}

      {(creating || editing) && <FormPanel />}
    </div>
  );
}
