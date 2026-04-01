import { NavLink } from "react-router-dom";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"
  }`;

export default function Sidebar() {
  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-white/80 p-4 backdrop-blur">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
        <h1 className="text-xl font-semibold">TaskForge</h1>
        <p className="mt-1 text-xs text-slate-200">Daily rhythms, calmly executed.</p>
      </div>

      <nav className="mt-6 space-y-2">
        <NavLink to="/" className={navClass} end>
          Home
        </NavLink>

        <div className="mt-3 border-t border-slate-200 pt-3" />

        <NavLink to="/tasks" className={navClass}>
          Tasks
        </NavLink>
        <NavLink to="/recurring" className={navClass}>
          Recurring
        </NavLink>
        <NavLink to="/calendar" className={navClass}>
          Calendar
        </NavLink>
        <NavLink to="/projects/overview" className={navClass}>
          Projects
        </NavLink>
      </nav>
    </aside>
  );
}
