import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeTask, deleteTask, duplicateTask, listTasks } from "../api/tasks";
import TaskDialog from "../components/TaskDialog";
import BlockedCompleteDialog from "../components/BlockedCompleteDialog";
import { Task } from "../types";

export default function TodoList() {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [focusTaskCompletionNotes, setFocusTaskCompletionNotes] = useState(false);
  const [blockedCompleteTarget, setBlockedCompleteTarget] = useState<Task | null>(null);

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });

  const remove = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const duplicate = useMutation({
    mutationFn: duplicateTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const quickComplete = useMutation({
    mutationFn: (id: string) => completeTask(id, undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = useMemo(
    () => tasks.filter((t) => (showCompleted ? true : t.status !== "completed")),
    [tasks, showCompleted]
  );

  const counts = useMemo(
    () => ({
      total: tasks.length,
      open: tasks.filter((t) => t.status !== "completed").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
    }),
    [tasks]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="st-kicker text-[color:var(--st-brand)]">Task center</p>
          <h2 className="page-title mt-2">Tasks</h2>
          <p className="page-subtitle">Sharper hierarchy, denser scanning, and stronger completion feedback.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-[color:var(--st-border)] bg-white/75 px-4 py-2 text-sm text-[color:var(--st-ink-soft)] shadow-sm">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Show Completed
          </label>
          <button className="st-button-primary" onClick={() => setCreateOpen(true)}>Add Task</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="section-card">
          <p className="st-kicker text-[color:var(--st-brand)]">Open tasks</p>
          <p className="mt-3 text-3xl font-extrabold">{counts.open}</p>
          <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">Everything still in motion.</p>
        </div>
        <div className="section-card">
          <p className="st-kicker text-[color:var(--st-warning)]">Blocked</p>
          <p className="mt-3 text-3xl font-extrabold">{counts.blocked}</p>
          <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">Tasks waiting on other work.</p>
        </div>
        <div className="section-card">
          <p className="st-kicker text-[color:var(--st-accent)]">Total</p>
          <p className="mt-3 text-3xl font-extrabold">{counts.total}</p>
          <p className="mt-1 text-sm text-[color:var(--st-ink-soft)]">Your complete task inventory.</p>
        </div>
      </div>

      <div className="st-list">
        <div>
          {filtered.length === 0 && (
            <div className="p-5 text-sm text-[color:var(--st-ink-soft)]">No tasks.</div>
          )}
          {filtered.map((task) => (
            <div
              key={task.id}
              className="st-row st-interactive-row"
              data-testid={`task-row-${task.id}`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-bold text-[color:var(--st-ink)]">{task.name}</p>
                  <span className="st-badge st-badge-brand">Recently Added</span>
                  <span
                    className={
                      task.status === "blocked"
                        ? "st-badge st-badge-warning"
                        : task.status === "completed"
                          ? "st-badge st-badge-success"
                          : "st-badge"
                    }
                  >
                    {task.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[color:var(--st-ink-soft)]">{task.due_date || "No due date"}</p>
              </button>

              <div className="flex shrink-0 items-center gap-3">
                {task.status !== "completed" && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="st-complete-ring h-11 w-11"
                      onClick={() => {
                        if (task.status === "blocked") {
                          setBlockedCompleteTarget(task);
                          return;
                        }
                        quickComplete.mutate(task.id);
                      }}
                      aria-label="Complete task"
                    >
                      <span className="text-lg font-bold text-[color:var(--st-brand-strong)]">✓</span>
                    </button>
                    <button
                      type="button"
                      className="mt-2 block text-xs font-semibold text-[color:var(--st-ink-soft)] hover:text-[color:var(--st-ink)]"
                      onClick={() => {
                        setFocusTaskCompletionNotes(true);
                        setSelectedTask(task);
                      }}
                    >
                      Complete with Notes
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="st-button-secondary px-3 py-2 text-xs"
                  onClick={() => {
                    duplicate.mutate(task.id);
                  }}
                  data-testid={`task-duplicate-${task.id}`}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="st-button-secondary px-3 py-2 text-xs"
                  onClick={() => {
                    remove.mutate(task.id);
                  }}
                  data-testid={`task-delete-${task.id}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TaskDialog open={createOpen} task={null} onClose={() => setCreateOpen(false)} />
      <TaskDialog
        open={Boolean(selectedTask)}
        task={selectedTask}
        focusCompletionNotes={focusTaskCompletionNotes}
        onClose={() => {
          setSelectedTask(null);
          setFocusTaskCompletionNotes(false);
        }}
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
