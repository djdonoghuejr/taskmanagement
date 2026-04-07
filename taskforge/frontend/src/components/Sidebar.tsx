import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `st-nav-link ${isActive ? "st-nav-link-active" : ""}`;

const todayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = useMemo(() => {
    const email = user?.email || "st";
    return email.slice(0, 2).toUpperCase();
  }, [user?.email]);

  return (
    <aside className="hidden w-full max-w-[290px] shrink-0 p-3 md:block md:p-6 md:pr-0">
      <div className="st-sidebar-card sticky top-6">
        <div className="st-sidebar-hero">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="st-kicker text-[color:var(--st-brand)]">SecreTerry</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[color:var(--st-ink)]">Your personal secretary</h1>
              <p className="mt-3 text-sm leading-6 text-[color:var(--st-ink-soft)]">
                Calm structure for tasks, habits, and the moving pieces of your day.
              </p>
            </div>
            <div className="st-sidebar-avatar">{initials}</div>
          </div>

          <div className="st-sidebar-date mt-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--st-ink-muted)]">Today</p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--st-ink)]">{todayFormatter.format(new Date())}</p>
            </div>
            <span className="st-badge st-badge-brand">In flow</span>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          <NavLink to="/" className={navClass} end>
            <span className="st-nav-copy">
              <span className="st-nav-title">Home</span>
              <span className="st-nav-meta">Today, upcoming, history</span>
            </span>
          </NavLink>
          <NavLink to="/tasks" className={navClass}>
            <span className="st-nav-copy">
              <span className="st-nav-title">Tasks</span>
              <span className="st-nav-meta">Plan and execute</span>
            </span>
          </NavLink>
          <NavLink to="/habits" className={navClass}>
            <span className="st-nav-copy">
              <span className="st-nav-title">Habits</span>
              <span className="st-nav-meta">Keep your rhythm visible</span>
            </span>
          </NavLink>
          <NavLink to="/calendar" className={navClass}>
            <span className="st-nav-copy">
              <span className="st-nav-title">Calendar</span>
              <span className="st-nav-meta">See the shape of the day</span>
            </span>
          </NavLink>
          <NavLink to="/projects/overview" className={navClass}>
            <span className="st-nav-copy">
              <span className="st-nav-title">Projects</span>
              <span className="st-nav-meta">Context and timelines</span>
            </span>
          </NavLink>
          <NavLink to="/account" className={navClass}>
            <span className="st-nav-copy">
              <span className="st-nav-title">Account</span>
              <span className="st-nav-meta">Email and password</span>
            </span>
          </NavLink>
        </nav>

        <div className="st-sidebar-footer mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--st-ink-muted)]">
            Working style
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">
            Prioritize what matters today, keep habits visible, and leave enough room to breathe.
          </p>
          <button
            className="st-button-secondary mt-4 w-full justify-center"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
