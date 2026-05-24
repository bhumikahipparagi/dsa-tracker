import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, BookOpen, Play, Plus, Search, X, Sparkles, Lock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SHEET_PROBLEMS, SHEET_STEPS } from '../../data/striverSheet';
import { SheetProblem } from '../../types';

const DIFF_COLOR: Record<string, string> = {
  Easy: 'text-green-400', Medium: 'text-yellow-400', Hard: 'text-red-400',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  solved: <CheckCircle2 size={15} className="text-green-500" />,
  attempted: <div className="w-3.5 h-3.5 rounded-full border-2 border-yellow-500" />,
  review: <div className="w-3.5 h-3.5 rounded-full bg-blue-500/30 border-2 border-blue-400" />,
  stuck: <div className="w-3.5 h-3.5 rounded-full bg-red-500/20 border-2 border-red-400" />,
  not_started: <Circle size={15} className="text-slate-600" />,
};

// ── Add custom problem modal ──────────────────────────────────────────────────
function AddProblemModal({ divisionId, onClose }: { divisionId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [diff, setDiff] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

  const handleAdd = () => {
    if (!name.trim()) return;
    const id = `custom-${Date.now()}`;
    navigate(`/problem/${id}?name=${encodeURIComponent(name)}&div=${divisionId}&diff=${diff}&desc=${encodeURIComponent(desc)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-white">Add Custom Problem</h3>
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

// ── Suggested problems banner (shown after theory marked done) ────────────────
function SuggestedProblems({ divisionId, stepId }: { divisionId: string; stepId: number }) {
  const navigate = useNavigate();
  const userProblems = useStore((s) => s.userProblems);

  // Suggest: unsolved problems from same division or adjacent divisions in same step
  const suggestions = useMemo(() => {
    const sameDivProblems = SHEET_PROBLEMS.filter((p) => p.divisionId === divisionId);
    const sameStepProblems = SHEET_PROBLEMS.filter((p) => p.stepId === stepId && p.divisionId !== divisionId);

    const unsolved = (arr: SheetProblem[]) =>
      arr.filter((p) => !userProblems[p.id] || userProblems[p.id].status === 'not_started');

    // Take up to 4: prefer same division, then same step, sorted Easy first
    const pool = [...unsolved(sameDivProblems), ...unsolved(sameStepProblems)];
    const sorted = pool.sort((a, b) => {
      const order = { Easy: 0, Medium: 1, Hard: 2 };
      return order[a.difficulty] - order[b.difficulty];
    });
    return sorted.slice(0, 4);
  }, [divisionId, stepId, userProblems]);

  if (suggestions.length === 0) return (
    <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 flex items-center gap-2">
      <CheckCircle2 size={13} /> All problems in this section solved!
    </div>
  );

  return (
    <div className="mt-2 bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-orange-400 font-medium mb-2">
        <Sparkles size={12} />
        Theory done! Start practicing these:
      </div>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map((p) => (
          <button key={p.id} onClick={() => navigate(`/problem/${p.id}`)}
            className="flex items-start gap-2 text-left px-2.5 py-2 bg-[#1e1e1e] hover:bg-[#252525] border border-[#333] rounded-lg transition-colors group">
            <Circle size={12} className="text-slate-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-slate-200 truncate group-hover:text-white">{p.name}</div>
              <div className={`text-xs mt-0.5 ${DIFF_COLOR[p.difficulty]}`}>{p.difficulty}</div>
            </div>
          </button>
        ))}
      </div>
      {suggestions.length === 4 && (
        <p className="text-xs text-slate-600 mt-2">Expand the division below to see all problems →</p>
      )}
    </div>
  );
}

// ── Problem row ────────────────────────────────────────────────────────────────
function ProblemRow({ problem, userStatus }: { problem: SheetProblem; userStatus: string }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/problem/${problem.id}`)}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] cursor-pointer border-b border-[#1e1e1e] group"
    >
      <span className="w-5 shrink-0">{STATUS_ICON[userStatus] ?? STATUS_ICON.not_started}</span>
      <span className="flex-1 text-sm text-slate-200 group-hover:text-white truncate">{problem.name}</span>
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
      <span className={`text-xs shrink-0 ${DIFF_COLOR[problem.difficulty]}`}>{problem.difficulty}</span>
      <Play size={13} className="text-slate-600 group-hover:text-orange-400 shrink-0" />
    </div>
  );
}

// ── Division block ─────────────────────────────────────────────────────────────
function DivisionBlock({ divisionId, divisionName, stepId, isTheory, problems, completedDivisions, toggleDivision }:
  { divisionId: string; divisionName: string; stepId: number; isTheory?: boolean; problems: SheetProblem[];
    completedDivisions: string[]; toggleDivision: (id: string) => void; }) {
  const [open, setOpen] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const userProblems = useStore((s) => s.userProblems);
  const isDone = completedDivisions.includes(divisionId);
  const solvedCount = problems.filter((p) => userProblems[p.id]?.status === 'solved').length;

  // Auto-open when theory is newly marked done
  const handleMarkDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willBeDone = !isDone;
    toggleDivision(divisionId);
    if (willBeDone) setOpen(true);
  };

  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden mb-2">
      {/* Division header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#191919] cursor-pointer select-none"
        onClick={() => setOpen(!open)}>
        <span className="text-slate-500">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <span className="flex-1 text-sm font-medium text-slate-200">{divisionName}</span>

        {isTheory ? (
          <button
            onClick={handleMarkDone}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              isDone
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : 'border-[#333] text-slate-500 hover:border-orange-500 hover:text-orange-400'
            }`}
          >
            {isDone ? <CheckCircle2 size={12} /> : <BookOpen size={12} />}
            {isDone ? 'Theory Done ✓' : 'Mark Theory Done'}
          </button>
        ) : (
          <span className="text-xs text-slate-500">{solvedCount}/{problems.length}</span>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setAddModal(true); }}
          className="text-slate-600 hover:text-orange-400 transition-colors ml-1"
          title="Add custom problem"
        ><Plus size={14} /></button>
      </div>

      {/* Theory: show suggestion panel if done */}
      {open && isTheory && (
        <div className="bg-[#141414] px-4 py-3">
          {isDone ? (
            <SuggestedProblems divisionId={divisionId} stepId={stepId} />
          ) : (
            <p className="text-xs text-slate-500 leading-relaxed">
              Study the theory for <strong className="text-slate-300">{divisionName}</strong>, then click
              <strong className="text-orange-400"> "Mark Theory Done"</strong> above to unlock practice problem suggestions.
            </p>
          )}
        </div>
      )}

      {/* Problems list */}
      {open && !isTheory && problems.length > 0 && (
        <div className="bg-[#141414]">
          {problems.map((p) => (
            <ProblemRow key={p.id} problem={p} userStatus={userProblems[p.id]?.status ?? 'not_started'} />
          ))}
        </div>
      )}

      {open && !isTheory && problems.length === 0 && (
        <div className="bg-[#141414] px-4 py-3 text-xs text-slate-600">
          No pre-loaded problems. Use the + button to add custom ones.
        </div>
      )}

      {addModal && <AddProblemModal divisionId={divisionId} onClose={() => setAddModal(false)} />}
    </div>
  );
}

// ── Main SheetPage ─────────────────────────────────────────────────────────────
export default function SheetPage() {
  const { completedDivisions, toggleDivisionComplete } = useStore();
  const userProblems = useStore((s) => s.userProblems);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]));

  const toggleStep = (id: number) =>
    setOpenSteps((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    return SHEET_PROBLEMS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Striver's A2Z Sheet</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {SHEET_PROBLEMS.length} problems · {Object.values(userProblems).filter(p => p.status === 'solved').length} solved
          </p>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..."
            className="bg-[#1e1e1e] border border-[#333] rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-orange-500 w-56"
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
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-600">No problems match.</div>
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
        const pct = stepProblems.length ? Math.round((solved / stepProblems.length) * 100) : 0;

        return (
          <div key={step.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <button
              onClick={() => toggleStep(step.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
            >
              {isOpen
                ? <ChevronDown size={16} className="text-orange-400 shrink-0" />
                : <ChevronRight size={16} className="text-slate-500 shrink-0" />}
              <span className="text-xs font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-md shrink-0">
                Step {step.id}
              </span>
              <span className="flex-1 font-medium text-white">{step.name}</span>
              <span className="text-sm text-slate-400 shrink-0">{solved}/{stepProblems.length}</span>
              <div className="w-24 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden ml-2 shrink-0">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 border-t border-[#222] pt-3 space-y-2">
                {step.divisions.map((div) => (
                  <DivisionBlock
                    key={div.id}
                    divisionId={div.id}
                    divisionName={div.name}
                    stepId={step.id}
                    isTheory={div.isTheory}
                    problems={SHEET_PROBLEMS.filter((p) => p.divisionId === div.id)}
                    completedDivisions={completedDivisions}
                    toggleDivision={toggleDivisionComplete}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
