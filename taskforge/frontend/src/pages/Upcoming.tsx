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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="st-kicker text-[color:var(--st-accent)]">Looking ahead</p>
            <h2 className="page-title mt-2">Upcoming</h2>
            <p className="page-subtitle">Plan the next stretch without losing context.</p>
          </div>
        </div>
      )}

      <div className="st-pill-group w-fit text-sm">
        <button
          className={`st-pill-toggle ${windowDays === 7 ? "st-pill-toggle-active" : ""}`}
          onClick={() => setWindowDays(7)}
        >
          7 days
        </button>
        <button
          className={`st-pill-toggle ${windowDays === 30 ? "st-pill-toggle-active" : ""}`}
          onClick={() => setWindowDays(30)}
        >
          30 days
        </button>
      </div>

      <div className="grid gap-2">
        {tasks.length === 0 && (
          <div className="st-surface p-4 text-sm text-[color:var(--st-ink-soft)]">
            No upcoming tasks in the next {windowDays} days.
          </div>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="section-card"
            data-testid={`upcoming-row-${task.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-[color:var(--st-ink)]">{task.name}</p>
                <p className="mt-2 text-sm text-[color:var(--st-ink-soft)]">
                  Due {task.due_date || "No due date"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="st-input mt-0"
                  value={task.due_date || ""}
                  onChange={(e) => {
                    const next = e.target.value || null;
                    reschedule.mutate({ id: task.id, due_date: next });
                  }}
                  data-testid={`upcoming-date-${task.id}`}
                />
                <button
                  className="st-button-secondary"
                  onClick={() => reschedule.mutate({ id: task.id, due_date: null })}
                >
                  Clear
                </button>
              </div>
            </div>
            {reschedule.isPending && <p className="mt-3 text-xs text-[color:var(--st-ink-muted)]">Saving...</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
