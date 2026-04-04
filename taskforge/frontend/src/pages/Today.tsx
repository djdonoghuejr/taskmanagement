import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { completeTask, listTasks } from "../api/tasks";
import { listHabits, listHabitCompletions } from "../api/habits";
import { isDueOn } from "../utils/habits";
import TaskDialog from "../components/TaskDialog";
import HabitDialog from "../components/HabitDialog";
import BlockedCompleteDialog from "../components/BlockedCompleteDialog";
import { Habit, Task } from "../types";

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

  const { data: habits = [] } = useQuery({
    queryKey: ["habits"],
    queryFn: listHabits,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["habits", "completions", today],
    queryFn: () => listHabitCompletions(today),
  });

  const completionIds = useMemo(
    () => new Set(completions.map((c) => c.habit_id)),
    [completions]
  );
  const dueTodayHabits = useMemo(() => {
    const now = new Date();
    return habits.filter((item) => isDueOn(now, item));
  }, [habits]);

  const dueItems = useMemo(() => {
    const items: Array<
      | { kind: "task"; id: string; task: (typeof tasks)[number] }
      | { kind: "habit"; id: string; habit: (typeof dueTodayHabits)[number] }
    > = [];

    for (const task of tasks) items.push({ kind: "task", id: task.id, task });
    for (const habit of dueTodayHabits) items.push({ kind: "habit", id: habit.id, habit });

    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "task" ? -1 : 1;
      const aName = a.kind === "task" ? a.task.name : a.habit.name;
      const bName = b.kind === "task" ? b.task.name : b.habit.name;
      return aName.localeCompare(bName);
    });
    return items;
  }, [tasks, dueTodayHabits]);

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [focusTaskCompletionNotes, setFocusTaskCompletionNotes] = useState(false);
  const [blockedCompleteTarget, setBlockedCompleteTarget] = useState<Task | null>(null);

  const quickComplete = useMutation({
    mutationFn: (id: string) => completeTask(id, undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
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
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Due Today</h3>
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            onClick={() => setCreateTaskOpen(true)}
          >
            Add Task
          </button>
        </div>
        <div className="grid gap-2">
          {dueItems.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Nothing due today.
            </div>
          )}
          {dueItems.map((item) => {
            if (item.kind === "task") {
              const task = item.task;
              return (
                <button
                  key={task.id}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                  onClick={() => {
                    setSelectedTask(task);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{task.name}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          Recently Added
                        </span>
                      </div>
                      {task.description && (
                        <p className="mt-1 text-sm text-slate-600">{task.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (task.status === "blocked") {
                            setBlockedCompleteTarget(task);
                            return;
                          }
                          quickComplete.mutate(task.id);
                        }}
                        aria-label="Complete task"
                      >
                        <CheckIcon className="h-6 w-6 text-slate-700" />
                      </button>
                      <button
                        type="button"
                        className="mt-1 block text-xs text-slate-600 hover:text-slate-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusTaskCompletionNotes(true);
                          setSelectedTask(task);
                        }}
                      >
                        Complete with Notes
                      </button>
                    </div>
                  </div>
                </button>
              );
            }

            const habit = item.habit;
            const checked = completionIds.has(habit.id);
            return (
              <button
                key={habit.id}
                className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                onClick={() => {
                  setSelectedHabit(habit);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">{habit.name}</p>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                        Habit
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {habit.cadence_type}
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

      <TaskDialog open={createTaskOpen} task={null} initialDueDate={today} onClose={() => setCreateTaskOpen(false)} />
      <TaskDialog
        open={Boolean(selectedTask)}
        task={selectedTask}
        focusCompletionNotes={focusTaskCompletionNotes}
        onClose={() => {
          setSelectedTask(null);
          setFocusTaskCompletionNotes(false);
        }}
      />
      <HabitDialog
        open={Boolean(selectedHabit)}
        habit={selectedHabit}
        today={today}
        completedToday={selectedHabit ? completionIds.has(selectedHabit.id) : false}
        onClose={() => setSelectedHabit(null)}
      />

      <BlockedCompleteDialog
        open={Boolean(blockedCompleteTarget)}
        taskId={blockedCompleteTarget?.id || null}
        taskName={blockedCompleteTarget?.name || "Task"}
        onClose={() => setBlockedCompleteTarget(null)}
        onViewBlockers={() => {
          if (!blockedCompleteTarget) return;
          setSelectedTask(blockedCompleteTarget);
        }}
      />
    </div>
  );
}
