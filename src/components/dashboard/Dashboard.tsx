import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Trophy, Clock, Zap, TrendingUp, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SHEET_PROBLEMS, SHEET_STEPS } from '../../data/striverSheet';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';

const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];
const DIFF_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' };

function StatCard({ icon: Icon, label, value, sub, color = 'orange' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    orange: 'text-orange-400 bg-orange-500/10',
    green: 'text-green-400 bg-green-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
  };
  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 flex gap-4 items-start">
      <div className={`p-2 rounded-lg ${colorMap[color]}`}>
        <Icon size={20} className={colorMap[color].split(' ')[0]} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const userProblems = useStore((s) => s.userProblems);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const solved = Object.values(userProblems).filter((p) => p.status === 'solved');
    const attempted = Object.values(userProblems).filter((p) => p.status === 'attempted');
    const review = Object.values(userProblems).filter((p) => p.status === 'review');
    const totalTime = Object.values(userProblems).reduce((a, p) => a + p.totalTimeSpentSeconds, 0);
    const totalSubs = Object.values(userProblems).reduce((a, p) => a + p.submissions.length, 0);

    const solvedToday = solved.filter((p) => p.solvedAt && isToday(parseISO(p.solvedAt))).length;
    const solvedThisWeek = solved.filter((p) => p.solvedAt && isThisWeek(parseISO(p.solvedAt))).length;

    // By difficulty
    const byDiff: Record<string, { solved: number; total: number }> = { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } };
    SHEET_PROBLEMS.forEach((p) => {
      byDiff[p.difficulty].total++;
      if (userProblems[p.id]?.status === 'solved') byDiff[p.difficulty].solved++;
    });

    // By step
    const byStep = SHEET_STEPS.map((step) => {
      const problems = SHEET_PROBLEMS.filter((p) => p.stepId === step.id);
      const s = problems.filter((p) => userProblems[p.id]?.status === 'solved').length;
      return { name: `Step ${step.id}`, solved: s, total: problems.length };
    });

    // Daily activity (last 14 days)
    const dailyMap: Record<string, number> = {};
    Object.values(userProblems).forEach((p) => {
      p.sessions.forEach((sess) => {
        const day = format(parseISO(sess.startTime), 'MM/dd');
        dailyMap[day] = (dailyMap[day] ?? 0) + sess.durationSeconds;
      });
    });
    const dailyData = Object.entries(dailyMap)
      .slice(-14)
      .map(([date, secs]) => ({ date, minutes: Math.round(secs / 60) }));

    // Recent solved
    const recentSolved = solved
      .filter((p) => p.solvedAt)
      .sort((a, b) => (b.solvedAt! > a.solvedAt! ? 1 : -1))
      .slice(0, 5)
      .map((p) => {
        const sp = SHEET_PROBLEMS.find((x) => x.id === p.id);
        return { id: p.id, name: sp?.name ?? p.id, solvedAt: p.solvedAt!, difficulty: sp?.difficulty ?? 'Easy' };
      });

    // Hints usage stats
    const hintsUsedTotal = Object.values(userProblems).reduce((a, p) => a + p.hintsUsed.length, 0);

    return {
      solved: solved.length,
      attempted: attempted.length,
      review: review.length,
      total: SHEET_PROBLEMS.length,
      totalTimeMin: Math.round(totalTime / 60),
      totalSubs,
      solvedToday,
      solvedThisWeek,
      byDiff,
      byStep,
      dailyData,
      recentSolved,
      hintsUsedTotal,
    };
  }, [userProblems]);

  const diffPieData = Object.entries(stats.byDiff).map(([diff, { solved, total }]) => ({
    name: diff,
    value: solved,
    total,
  }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Your DSA journey at a glance</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Trophy} label="Problems Solved" value={`${stats.solved}/${stats.total}`}
          sub={`${stats.solvedToday} today · ${stats.solvedThisWeek} this week`} color="green" />
        <StatCard icon={Clock} label="Time Spent" value={`${stats.totalTimeMin}m`}
          sub="Total focused time" color="blue" />
        <StatCard icon={Zap} label="Submissions" value={stats.totalSubs}
          sub={`${stats.hintsUsedTotal} hints used`} color="yellow" />
        <StatCard icon={RotateCcw} label="In Review" value={stats.review}
          sub={`${stats.attempted} attempted`} color="orange" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily activity */}
        <div className="lg:col-span-2 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Daily Time Spent (minutes)</h2>
          {stats.dailyData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
              No activity yet — start solving!
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.dailyData} barSize={20}>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#f97316' }} />
                <Bar dataKey="minutes" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Difficulty breakdown */}
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-4">By Difficulty</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={diffPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                dataKey="value" paddingAngle={3}>
                {diffPieData.map((entry) => (
                  <Cell key={entry.name} fill={DIFF_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8 }}
                formatter={(val, name, props) => [`${val}/${props.payload.total}`, name]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {Object.entries(stats.byDiff).map(([diff, { solved, total }]) => (
              <div key={diff}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: DIFF_COLORS[diff] }}>{diff}</span>
                  <span className="text-slate-400">{solved}/{total}</span>
                </div>
                <div className="h-1 bg-[#2a2a2a] rounded">
                  <div className="h-full rounded transition-all" style={{
                    width: `${total ? (solved / total) * 100 : 0}%`,
                    background: DIFF_COLORS[diff],
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step progress */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Progress by Step</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.byStep.map((s, i) => (
            <div key={s.name} className="text-center">
              <div className="relative w-12 h-12 mx-auto mb-1">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2a2a2a" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none"
                    stroke={COLORS[i % COLORS.length]} strokeWidth="3"
                    strokeDasharray={`${s.total ? (s.solved / s.total) * 100 : 0} 100`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {s.solved}
                </span>
              </div>
              <div className="text-xs text-slate-500">{s.name}</div>
              <div className="text-xs text-slate-600">{s.total} total</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent solved */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Recently Solved</h2>
        {stats.recentSolved.length === 0 ? (
          <p className="text-slate-600 text-sm">Solve your first problem to see it here!</p>
        ) : (
          <div className="space-y-2">
            {stats.recentSolved.map((p) => (
              <div key={p.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 cursor-pointer"
                onClick={() => navigate(`/problem/${p.id}`)}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                  <span className="text-sm text-white">{p.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded-full border"
                    style={{ color: DIFF_COLORS[p.difficulty], borderColor: DIFF_COLORS[p.difficulty] + '40' }}>
                    {p.difficulty}
                  </span>
                  <span className="text-xs text-slate-500">
                    {format(parseISO(p.solvedAt), 'MMM d')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weakpoints */}
      {stats.byStep.some((s) => s.solved === 0 && s.total > 0) && (
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-yellow-500" />
            Not Started Yet
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.byStep.filter((s) => s.solved === 0).map((s) => (
              <span key={s.name} className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full border border-yellow-500/20">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
