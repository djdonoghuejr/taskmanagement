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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-[color:var(--st-ink)]">{task.name}</p>
            <span className="st-badge st-badge-brand">Recently Added</span>
          </div>
          {task.due_date && (
            <p className="mt-2 text-sm text-[color:var(--st-ink-soft)]">Due {task.due_date}</p>
          )}
        </div>
        <span className={statusClass}>{task.status}</span>
      </div>
    </button>
  );
}
