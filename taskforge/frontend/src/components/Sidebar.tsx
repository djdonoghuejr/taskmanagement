import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `st-nav-link ${isActive ? "st-nav-link-active" : ""}`;

export default function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="w-full max-w-[290px] shrink-0 p-3 md:p-6 md:pr-0">
      <div className="st-sidebar-card sticky top-6">
        <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 text-white backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/65">
                SecreTerry
              </p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Your personal secretary</h1>
            </div>
            <div className="rounded-2xl border border-white/12 bg-white/10 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/60">Today</p>
              <p className="text-lg font-bold">{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/78">
            Calm structure for tasks, habits, and the moving pieces of your day.
          </p>
          {user ? <p className="mt-4 truncate text-sm text-white/72">{user.email}</p> : null}
        </div>

        <nav className="mt-6 space-y-2">
          <NavLink to="/" className={navClass} end>
            <span>Home</span>
            <span className="text-xs text-white/45">Today</span>
          </NavLink>
          <NavLink to="/tasks" className={navClass}>
            <span>Tasks</span>
            <span className="text-xs text-white/45">Plan</span>
          </NavLink>
          <NavLink to="/habits" className={navClass}>
            <span>Habits</span>
            <span className="text-xs text-white/45">Rhythm</span>
          </NavLink>
          <NavLink to="/calendar" className={navClass}>
            <span>Calendar</span>
            <span className="text-xs text-white/45">Schedule</span>
          </NavLink>
          <NavLink to="/projects/overview" className={navClass}>
            <span>Projects</span>
            <span className="text-xs text-white/45">Context</span>
          </NavLink>
        </nav>

        <div className="mt-8 rounded-[22px] border border-white/10 bg-white/8 p-4 text-white/78">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/52">
            Working style
          </p>
          <p className="mt-2 text-sm leading-6">
            Prioritize what matters today, keep habits visible, and leave enough room to breathe.
          </p>
          <button
            className="mt-4 w-full rounded-2xl border border-white/14 bg-white/8 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/14"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
