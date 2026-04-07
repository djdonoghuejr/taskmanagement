import { Task } from "../types";

export default function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  const statusClass =
    task.status === "completed"
      ? "st-badge st-badge-success"
      : task.status === "blocked"
        ? "st-badge st-badge-warning"
        : "st-badge";

  return (
    <button
      type="button"
      onClick={onClick}
      className="st-surface w-full p-4 text-left transition hover:-translate-y-0.5 hover:bg-white"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-[color:var(--st-ink)]">{task.name}</p>
            <span className="st-badge st-badge-brand">Recently Added</span>
          </div>
          {task.due_date && (
            <p className="mt-2 text-sm text-[color:var(--st-ink-soft)]">Due {task.due_date}</p>
          )}
          {task.expected_minutes ? (
            <p className="mt-1 text-sm text-[color:var(--st-ink-muted)]">{task.expected_minutes} min expected</p>
          ) : null}
        </div>
        <span className={`${statusClass} self-start`}>{task.status}</span>
      </div>
    </button>
  );
}
