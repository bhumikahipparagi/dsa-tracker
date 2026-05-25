import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import { RotateCcw, CheckCircle2, Clock, ArrowRight, Calendar } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SHEET_PROBLEMS } from '../../data/striverSheet';

const REVIEW_LABELS = ['', '3-day review', '7-day review', '14-day review'];

export default function ReviewPage() {
  const userProblems = useStore((s) => s.userProblems);
  const completeReview = useStore((s) => s.completeReview);
  const navigate = useNavigate();

  const items = useMemo(() => {
    const list: {
      problemId: string;
      name: string;
      difficulty: string;
      reviewNumber: 1 | 2 | 3;
      dueDate: string;
      isDue: boolean;
      isOverdue: boolean;
      completedDate: string | null;
      solvedAt: string | null;
    }[] = [];

    Object.entries(userProblems).forEach(([id, p]) => {
      if (!p.reviewDates.length) return;
      const sp = SHEET_PROBLEMS.find((x) => x.id === id);
      const name = sp?.name ?? id;
      const diff = sp?.difficulty ?? 'Medium';

      p.reviewDates.forEach((rd) => {
        const due = parseISO(rd.dueDate);
        list.push({
          problemId: id,
          name,
          difficulty: diff,
          reviewNumber: rd.reviewNumber,
          dueDate: rd.dueDate,
          isDue: (isToday(due) || isPast(due)) && !rd.completedDate,
          isOverdue: isPast(due) && !isToday(due) && !rd.completedDate,
          completedDate: rd.completedDate,
          solvedAt: p.solvedAt,
        });
      });
    });

    // Sort: overdue first, then due today, then upcoming, then completed
    return list.sort((a, b) => {
      if (a.completedDate && !b.completedDate) return 1;
      if (!a.completedDate && b.completedDate) return -1;
      if (a.isOverdue && !b.isOverdue) return -1;
      if (b.isOverdue && !a.isOverdue) return 1;
      return a.dueDate < b.dueDate ? -1 : 1;
    });
  }, [userProblems]);

  const due = items.filter((i) => i.isDue && !i.completedDate);
  const upcoming = items.filter((i) => !i.isDue && !i.completedDate);
  const completed = items.filter((i) => i.completedDate);

  const Section = ({ title, items: list, color }: { title: string; items: typeof items; color: string }) => {
    if (list.length === 0) return null;
    return (
      <div>
        <h2 className={`text-sm font-semibold mb-3 ${color}`}>{title}</h2>
        <div className="space-y-2">
          {list.map((item, i) => {
            const dueDate = parseISO(item.dueDate);
            const daysUntil = differenceInDays(dueDate, new Date());
            return (
              <div key={`${item.problemId}-${item.reviewNumber}-${i}`}
                className="bg-[#141428] border border-[#2a2a4e] rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-white font-medium truncate">{item.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      item.difficulty === 'Easy' ? 'text-green-400 bg-green-500/10'
                      : item.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-500/10'
                      : 'text-red-400 bg-red-500/10'}`}>
                      {item.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <RotateCcw size={11} />
                      {REVIEW_LABELS[item.reviewNumber]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Due: {format(dueDate, 'MMM d')}
                      {item.isOverdue && !item.completedDate && (
                        <span className="text-red-400 ml-1">
                          ({Math.abs(daysUntil)}d overdue)
                        </span>
                      )}
                      {!item.isOverdue && !item.isDue && !item.completedDate && (
                        <span className="text-slate-600 ml-1">
                          (in {daysUntil}d)
                        </span>
                      )}
                    </span>
                    {item.completedDate && (
                      <span className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 size={11} />
                        Done {format(parseISO(item.completedDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => navigate(`/problem/${item.problemId}`)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#10101e] border border-[#2d2d52] hover:border-violet-500 text-slate-400 hover:text-white rounded-lg transition-colors">
                    <ArrowRight size={12} />
                    Solve
                  </button>
                  {!item.completedDate && (
                    <button
                      onClick={() => completeReview(item.problemId, item.reviewNumber)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 rounded-lg transition-colors">
                      <CheckCircle2 size={12} />
                      Done
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Review Queue</h1>
        <p className="text-slate-400 text-sm mt-1">Spaced repetition: 3-day, 7-day, 14-day reviews</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Due Now', value: due.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Upcoming', value: upcoming.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Completed', value: completed.length, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-[#141428] border border-[#2a2a4e] rounded-xl p-8 text-center">
          <RotateCcw size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No problems in review queue yet.</p>
          <p className="text-slate-600 text-xs mt-1">Submit a problem and mark it solved to add it here.</p>
        </div>
      ) : (
        <>
          <Section title="⚠️ Due Now / Overdue" items={due} color="text-red-400" />
          <Section title="📅 Upcoming Reviews" items={upcoming} color="text-yellow-400" />
          <Section title="✅ Completed Reviews" items={completed} color="text-green-400" />
        </>
      )}
    </div>
  );
}
