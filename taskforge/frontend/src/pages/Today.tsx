import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listTasks, completeTask } from "../api/tasks";
import {
  listRecurring,
  completeRecurring,
  undoRecurringCompletion,
  listRecurringCompletions,
} from "../api/recurring";
import { isDueOn } from "../utils/recurring";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
      <path
        d="M16.25 5.5L8.5 13.25L3.75 8.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Today({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "today", today],
    queryFn: () =>
      listTasks({ status: "pending", due_after: today, due_before: today, order_by: "due_date" }),
  });

  const { data: overdueTasks = [] } = useQuery({
    queryKey: ["tasks", "overdue", today],
    queryFn: () => listTasks({ status: "pending", due_before: today, order_by: "due_date" }),
  });

  const { data: recurring = [] } = useQuery({
    queryKey: ["recurring"],
    queryFn: listRecurring,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["recurring", "completions", today],
    queryFn: () => listRecurringCompletions(today),
  });

  const completionIds = useMemo(
    () => new Set(completions.map((c) => c.recurring_item_id)),
    [completions]
  );
  const dueTodayRecurring = useMemo(() => {
    const now = new Date();
    return recurring.filter((item) => isDueOn(now, item));
  }, [recurring]);

  const [completeTaskTarget, setCompleteTaskTarget] = useState<string | null>(null);
  const [completeRecurringTarget, setCompleteRecurringTarget] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const completeTaskMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => completeTask(id, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const completeRecurringMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => completeRecurring(id, notes),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recurring", "completions", today] }),
  });

  const undoRecurringMutation = useMutation({
    mutationFn: (id: string) => undoRecurringCompletion(id, today),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["recurring", "completions", today] }),
  });

  const overdueCount = useMemo(() => {
    const todayDate = new Date(today);
    return overdueTasks.filter((t) => t.due_date && new Date(t.due_date) < todayDate).length;
  }, [overdueTasks, today]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold">Today</h2>
            <p className="text-slate-600">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {overdueCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Overdue</p>
              <p className="text-sm">{overdueCount} task(s) are overdue.</p>
            </div>
            <Link
              to="/?view=upcoming"
              className="rounded-full bg-amber-900 px-4 py-2 text-sm text-white"
            >
              Review
            </Link>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Due Today</h3>
        <div className="grid gap-2">
          {tasks.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No tasks due today.
            </div>
          )}
          {tasks.map((task) => (
            <button
              key={task.id}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
              onClick={() => {
                setCompleteTaskTarget(task.id);
                setCompleteRecurringTarget(null);
                setNotes("");
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{task.name}</p>
                  {task.description && <p className="mt-1 text-sm text-slate-600">{task.description}</p>}
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300">
                  <CheckIcon className="h-6 w-6 text-slate-700" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Recurring Today</h3>
        <div className="grid gap-2">
          {dueTodayRecurring.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              No recurring items due today.
            </div>
          )}
          {dueTodayRecurring.map((item) => {
            const checked = completionIds.has(item.id);
            return (
              <button
                key={item.id}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                onClick={() => {
                  if (checked) {
                    undoRecurringMutation.mutate(item.id);
                    return;
                  }
                  setCompleteRecurringTarget(item.id);
                  setCompleteTaskTarget(null);
                  setNotes("");
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {item.cadence_type}
                    </p>
                  </div>
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${
                      checked ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-300"
                    }`}
                  >
                    <CheckIcon className="h-6 w-6" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {(completeTaskTarget || completeRecurringTarget) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Add Notes (Optional)</h3>
            <button
              className="text-sm text-slate-500"
              onClick={() => {
                setCompleteTaskTarget(null);
                setCompleteRecurringTarget(null);
              }}
            >
              Close
            </button>
          </div>
          <textarea
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go?"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={() => {
                if (completeTaskTarget) {
                  completeTaskMutation.mutate({ id: completeTaskTarget, notes: notes || undefined });
                } else if (completeRecurringTarget) {
                  completeRecurringMutation.mutate({
                    id: completeRecurringTarget,
                    notes: notes || undefined,
                  });
                }
                setCompleteTaskTarget(null);
                setCompleteRecurringTarget(null);
              }}
            >
              Save & Complete
            </button>
            <button
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm"
              onClick={() => {
                if (completeTaskTarget) {
                  completeTaskMutation.mutate({ id: completeTaskTarget, notes: undefined });
                } else if (completeRecurringTarget) {
                  completeRecurringMutation.mutate({ id: completeRecurringTarget, notes: undefined });
                }
                setCompleteTaskTarget(null);
                setCompleteRecurringTarget(null);
              }}
            >
              Complete Without Notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
