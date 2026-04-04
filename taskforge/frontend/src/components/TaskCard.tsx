import { Task } from "../types";

export default function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">{task.name}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              Recently Added
            </span>
          </div>
          {task.due_date && (
            <p className="text-xs text-slate-500">Due {task.due_date}</p>
          )}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {task.status}
        </span>
      </div>
    </button>
  );
}
