import { NavLink } from "react-router-dom";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium ${
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-200"
  }`;

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
      <h1 className="text-xl font-semibold text-slate-900">TaskForge</h1>
      <nav className="mt-6 space-y-2">
        <NavLink to="/" className={navClass} end>
          Dashboard
        </NavLink>
        <NavLink to="/tasks" className={navClass}>
          To-Do List
        </NavLink>
        <NavLink to="/recurring" className={navClass}>
          Recurring Checklist
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
