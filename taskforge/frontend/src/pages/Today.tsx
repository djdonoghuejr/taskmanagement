import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { completeTask, listTasks } from "../api/tasks";
import { listHabits, listHabitCompletions } from "../api/habits";
import { isDueOn } from "../utils/habits";
import TaskDialog from "../components/TaskDialog";
import HabitDialog from "../components/HabitDialog";
import BlockedCompleteDialog from "../components/BlockedCompleteDialog";
import FloatingNotice from "../components/FloatingNotice";
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
      listTasks({ due_after: today, due_before: today, order_by: "due_date" }),
  });

  const { data: overdueTasks = [] } = useQuery({
    queryKey: ["tasks", "overdue", today],
    queryFn: () => listTasks({ due_before: today, order_by: "due_date" }),
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

    for (const task of tasks.filter((entry) => entry.status !== "completed")) {
      items.push({ kind: "task", id: task.id, task });
    }
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    return overdueTasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < todayDate).length;
  }, [overdueTasks, today]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <p className="st-kicker text-[color:var(--st-brand)]">Daily focus</p>
            <h2 className="page-title mt-2">Today</h2>
            <p className="page-subtitle">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {overdueCount > 0 && (
        <div className="section-card border-[color:rgba(183,121,31,0.18)] bg-[color:var(--st-warning-soft)] text-[color:var(--st-warning)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="st-kicker text-[color:var(--st-warning)]">Needs attention</p>
              <p className="mt-2 text-xl font-bold">Overdue</p>
              <p className="mt-1 text-sm">{overdueCount} task(s) are overdue.</p>
            </div>
            <Link
              to="/?view=upcoming"
              className="st-button-secondary border-[color:rgba(183,121,31,0.24)] bg-white/80 text-[color:var(--st-warning)]"
            >
              Review
            </Link>
          </div>
        </div>
      )}

      <section className="section-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="st-kicker text-[color:var(--st-brand)]">Action board</p>
            <h3 className="section-title mt-2">Due Today</h3>
            <p className="section-copy mt-1">Tasks first, habits alongside them, all easy to scan and act on.</p>
          </div>
          <button
            className="st-button-primary w-full sm:w-auto"
            onClick={() => setCreateTaskOpen(true)}
          >
            Add Task
          </button>
        </div>
        <div className="grid gap-3">
          {dueItems.length === 0 && (
            <div className="st-surface p-5 text-sm text-[color:var(--st-ink-soft)]">
              Nothing due today.
            </div>
          )}
          {dueItems.map((item) => {
            if (item.kind === "task") {
              const task = item.task;
              const statusBadge =
                task.status === "blocked" ? "st-badge st-badge-warning" : "st-badge";
              return (
                <button
                  key={task.id}
                  className="st-surface st-interactive-row w-full p-0 text-left"
                  onClick={() => {
                    setSelectedTask(task);
                  }}
                >
                  <div className="st-row">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-[color:var(--st-ink)]">{task.name}</p>
                        <span className="st-badge st-badge-brand">Recently Added</span>
                        <span className={statusBadge}>{task.status}</span>
                      </div>
                      {task.description && (
                        <p className="mt-2 text-sm leading-6 text-[color:var(--st-ink-soft)]">{task.description}</p>
                      )}
                      <p className="mt-2 text-sm font-medium text-[color:var(--st-ink-muted)]">
                        {task.due_date ? `Due ${task.due_date}` : "No due date"}
                      </p>
                      {task.expected_minutes ? (
                        <p className="mt-1 text-sm text-[color:var(--st-ink-muted)]">
                          {task.expected_minutes} min expected
                        </p>
                      ) : null}
                    </div>
                    <div className="ml-auto shrink-0 text-right">
                      <button
                        type="button"
                        className={`st-complete-ring h-12 w-12 ${task.status === "completed" ? "st-complete-ring-success st-celebrate" : ""}`}
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
                        <CheckIcon className="h-6 w-6 text-[color:var(--st-brand-strong)]" />
                      </button>
                      <button
                        type="button"
                        className="mt-2 block text-xs font-semibold text-[color:var(--st-ink-soft)] hover:text-[color:var(--st-ink)]"
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
                className="st-surface st-interactive-row w-full p-0 text-left"
                onClick={() => {
                  setSelectedHabit(habit);
                }}
              >
                <div className="st-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-[color:var(--st-ink)]">{habit.name}</p>
                      <span className="st-badge st-badge-habit">Habit</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-[color:var(--st-ink-muted)]">
                      {habit.cadence_type}
                    </p>
                  </div>
                  <span
                    className={`st-complete-ring h-12 w-12 ${checked ? "st-complete-ring-success st-celebrate" : ""} ${
                      checked ? "" : ""
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

      <TaskDialog
        open={createTaskOpen}
        task={null}
        initialDueDate={today}
        onCreated={(task) =>
          setSuccessMessage(
            task.due_date
              ? `“${task.name}” is saved for ${task.due_date}.`
              : `“${task.name}” is saved and ready when you are.`
          )
        }
        onClose={() => setCreateTaskOpen(false)}
      />
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
      <FloatingNotice message={successMessage} onClose={() => setSuccessMessage(null)} />

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
