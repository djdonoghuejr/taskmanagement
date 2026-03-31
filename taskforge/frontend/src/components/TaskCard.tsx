import { Task } from "../types";

export default function TaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">{task.name}</p>
          {task.due_date && (
            <p className="text-xs text-slate-500">Due {task.due_date}</p>
          )}
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {task.status}
        </span>
      </div>
    </div>
  );
}
