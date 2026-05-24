import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, BookOpen, Play, Plus, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SHEET_PROBLEMS, SHEET_STEPS } from '../../data/striverSheet';
import { SheetProblem } from '../../types';

const DIFF_COLOR: Record<string, string> = {
  Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  solved: <CheckCircle2 size={15} className="text-green-500" />,
  attempted: <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />,
  review: <div className="w-3.5 h-3.5 rounded-full bg-blue-500/30 border-2 border-blue-400" />,
  stuck: <div className="w-3.5 h-3.5 rounded-full bg-red-500/20 border-2 border-red-400" />,
  not_started: <Circle size={15} className="text-slate-600" />,
};

// Modal for adding a custom problem
function AddProblemModal({ divisionId, onClose }: { divisionId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [diff, setDiff] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const handleAdd = () => {
    if (!name.trim()) return;
    const id = `custom-${Date.now()}`;
    // We'll store the custom problem inline in userProblems with name in notes
    // and navigate to it; the problem page will handle custom problems
    navigate(`/problem/${id}?name=${encodeURIComponent(name)}&div=${divisionId}&diff=${diff}&desc=${encodeURIComponent(desc)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Add Problem</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Problem name (e.g. Two Sum)" autoFocus
            className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
            placeholder="Brief description (optional)"
            className="w-full bg-[#151515] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500 resize-none" />
          <div className="flex gap-2">
            {(['Easy', 'Medium', 'Hard'] as const).map((d) => (
              <button key={d} onClick={() => setDiff(d)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  diff === d
                    ? d === 'Easy' ? 'bg-green-500/20 border-green-500 text-green-400'
                      : d === 'Medium' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                      : 'bg-red-500/20 border-red-500 text-red-400'
                    : 'border-[#333] text-slate-500 hover:border-[#555]'
                }`}>{d}</button>
            ))}
          </div>
          <button onClick={handleAdd}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
            Open Problem →
          </button>
        </div>
      </div>
    </div>
  );
}

function ProblemRow({ problem, userStatus }: { problem: SheetProblem; userStatus: string }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/problem/${problem.id}`)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/4 cursor-pointer border-b border-[#1e1e1e] group"
    >
      <span className="w-5 shrink-0">{STATUS_ICON[userStatus] ?? STATUS_ICON.not_started}</span>
      <span className="flex-1 text-sm text-slate-200 group-hover:text-white truncate">{problem.name}</span>
      <span className={`text-xs shrink-0 ${DIFF_COLOR[problem.difficulty]}`}>{problem.difficulty}</span>
      <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {problem.leetcodeUrl && (
          <a href={problem.leetcodeUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-orange-400 hover:underline">LC</a>
        )}
        {problem.gfgUrl && (
          <a href={problem.gfgUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-green-400 hover:underline">GFG</a>
        )}
      </div>
      <Play size={13} className="text-slate-600 group-hover:text-orange-400 shrink-0 ml-1" />
    </div>
  );
}

function DivisionBlock({ divisionId, divisionName, isTheory, problems, completedDivisions, toggleDivision }:
  { divisionId: string; divisionName: string; isTheory?: boolean; problems: SheetProblem[];
    completedDivisions: string[]; toggleDivision: (id: string) => void; }) {
  const [open, setOpen] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const userProblems = useStore((s) => s.userProblems);
  const isDone = completedDivisions.includes(divisionId);

  const solvedCount = problems.filter((p) => userProblems[p.id]?.status === 'solved').length;

  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden mb-2">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#191919] cursor-pointer"
        onClick={() => setOpen(!open)}>
        <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="text-slate-500">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <span className="flex-1 text-sm font-medium text-slate-200">{divisionName}</span>
        {isTheory && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleDivision(divisionId); }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              isDone
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : 'border-[#333] text-slate-500 hover:border-[#555]'
            }`}
          >
            {isDone ? <CheckCircle2 size={12} /> : <BookOpen size={12} />}
            {isDone ? 'Theory Done' : 'Mark Theory Done'}
          </button>
        )}
        {!isTheory && (
          <span className="text-xs text-slate-500">{solvedCount}/{problems.length}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setAddModal(true); }}
          className="text-slate-600 hover:text-orange-400 transition-colors"
          title="Add custom problem"
        >
          <Plus size={14} />
        </button>
      </div>
      {open && !isTheory && problems.length > 0 && (
        <div className="bg-[#141414]">
          {problems.map((p) => (
            <ProblemRow key={p.id} problem={p} userStatus={userProblems[p.id]?.status ?? 'not_started'} />
          ))}
        </div>
      )}
      {open && isTheory && (
        <div className="bg-[#141414] px-4 py-3 text-sm text-slate-500">
          This is a theory division. Mark it complete once you've studied the concepts,
          then practice problems will be suggested.
        </div>
      )}
      {addModal && <AddProblemModal divisionId={divisionId} onClose={() => setAddModal(false)} />}
    </div>
  );
}

export default function SheetPage() {
  const { completedDivisions, toggleDivisionComplete } = useStore();
  const [search, setSearch] = useState('');
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]));

  const toggleStep = (id: number) =>
    setOpenSteps((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    return SHEET_PROBLEMS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const userProblems = useStore((s) => s.userProblems);
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Striver's A2Z Sheet</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {SHEET_PROBLEMS.length} problems across 18 steps
          </p>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="bg-[#1e1e1e] border border-[#333] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500 w-56"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {filtered && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-[#2a2a2a] text-xs text-slate-500">
            {filtered.length} results
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-600">No problems found.</div>
          ) : (
            filtered.map((p) => (
              <ProblemRow key={p.id} problem={p} userStatus={userProblems[p.id]?.status ?? 'not_started'} />
            ))
          )}
        </div>
      )}

      {/* Sheet tree */}
      {!filtered && SHEET_STEPS.map((step) => {
        const isOpen = openSteps.has(step.id);
        const stepProblems = SHEET_PROBLEMS.filter((p) => p.stepId === step.id);
        const solved = stepProblems.filter((p) => userProblems[p.id]?.status === 'solved').length;
        return (
          <div key={step.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(step.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition-colors"
            >
              {isOpen ? <ChevronDown size={16} className="text-orange-400" /> : <ChevronRight size={16} className="text-slate-500" />}
              <span className="text-xs font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-md">
                Step {step.id}
              </span>
              <span className="flex-1 text-left font-medium text-white">{step.name}</span>
              <span className="text-sm text-slate-400">{solved}/{stepProblems.length}</span>
              <div className="w-24 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden ml-2">
                <div className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${stepProblems.length ? (solved / stepProblems.length) * 100 : 0}%` }} />
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-0 border-t border-[#222]">
                <div className="pt-3 space-y-2">
                  {step.divisions.map((div) => (
                    <DivisionBlock
                      key={div.id}
                      divisionId={div.id}
                      divisionName={div.name}
                      isTheory={div.isTheory}
                      problems={SHEET_PROBLEMS.filter((p) => p.divisionId === div.id)}
                      completedDivisions={completedDivisions}
                      toggleDivision={toggleDivisionComplete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
