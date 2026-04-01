import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, updateTask } from "../api/tasks";

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Upcoming({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [windowDays, setWindowDays] = useState<7 | 30>(7);

  const today = new Date().toISOString().slice(0, 10);
  const end = useMemo(() => addDaysIso(windowDays), [windowDays]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "upcoming", windowDays, today],
    queryFn: () =>
      listTasks({
        status: "pending",
        due_after: today,
        due_before: end,
        order_by: "due_date",
        sort: "asc",
      }),
  });

  const reschedule = useMutation({
    mutationFn: ({ id, due_date }: { id: string; due_date: string | null }) =>
      updateTask(id, { due_date }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold">Upcoming</h2>
            <p className="text-slate-600">Plan your next steps</p>
          </div>
        </div>
      )}

      <div className="flex rounded-full border border-slate-300 bg-white p-1 text-sm">
        <button
          className={`rounded-full px-3 py-1.5 ${
            windowDays === 7 ? "bg-slate-900 text-white" : "text-slate-700"
          }`}
          onClick={() => setWindowDays(7)}
        >
          7 days
        </button>
        <button
          className={`rounded-full px-3 py-1.5 ${
            windowDays === 30 ? "bg-slate-900 text-white" : "text-slate-700"
          }`}
          onClick={() => setWindowDays(30)}
        >
          30 days
        </button>
      </div>

      <div className="grid gap-2">
        {tasks.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No upcoming tasks in the next {windowDays} days.
          </div>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
            data-testid={`upcoming-row-${task.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{task.name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Due {task.due_date || "No due date"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={task.due_date || ""}
                  onChange={(e) => {
                    const next = e.target.value || null;
                    reschedule.mutate({ id: task.id, due_date: next });
                  }}
                  data-testid={`upcoming-date-${task.id}`}
                />
                <button
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
                  onClick={() => reschedule.mutate({ id: task.id, due_date: null })}
                >
                  Clear
                </button>
              </div>
            </div>
            {reschedule.isPending && <p className="mt-2 text-xs text-slate-500">Saving...</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
