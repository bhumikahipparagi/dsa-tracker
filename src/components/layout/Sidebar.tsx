import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, RotateCcw, BookOpen, Settings, Code2, FlameIcon } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SHEET_PROBLEMS } from '../../data/striverSheet';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sheet', icon: ListChecks, label: "Striver's Sheet" },
  { to: '/review', icon: RotateCcw, label: 'Review Queue' },
  { to: '/notes', icon: BookOpen, label: 'Concept Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const userProblems = useStore((s) => s.userProblems);
  const solved = Object.values(userProblems).filter((p) => p.status === 'solved').length;
  const total = SHEET_PROBLEMS.length;
  const pct = Math.round((solved / total) * 100);

  return (
    <aside className="w-56 min-h-screen bg-[#141414] border-r border-[#2a2a4e] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2a2a4e]">
        <div className="flex items-center gap-2">
          <FlameIcon className="text-violet-500" size={22} />
          <span className="font-bold text-white text-sm tracking-wide">DSA Tracker</span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{solved}/{total} solved</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-[#1e1e3a] rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-violet-500/15 text-violet-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#2a2a4e] text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <Code2 size={12} />
          Striver's A2Z Sheet
        </div>
      </div>
    </aside>
  );
}
