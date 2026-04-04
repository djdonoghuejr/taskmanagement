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
    () => tasks.filter((t) => (showCompleted ? true : t.status === "pending")),
    [tasks, showCompleted]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Tasks</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Show Completed
          </label>
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
            onClick={() => setCreateOpen(true)}
          >
            Add Task
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-200">
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-slate-600">No tasks.</div>
          )}
          {filtered.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50"
              data-testid={`task-row-${task.id}`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-slate-900">{task.name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    Recently Added
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {task.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{task.due_date || "No due date"}</p>
              </button>

              <div className="flex shrink-0 items-center gap-3">
                {task.status === "pending" && (
                  <div className="text-right">
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 hover:bg-slate-50"
                      onClick={() => {
                        if (task.status === "blocked") {
                          setBlockedCompleteTarget(task);
                          return;
                        }
                        quickComplete.mutate(task.id);
                      }}
                      aria-label="Complete task"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className="mt-1 block text-xs text-slate-600 hover:text-slate-900"
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
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  onClick={(e) => {
                    duplicate.mutate(task.id);
                  }}
                  data-testid={`task-duplicate-${task.id}`}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  onClick={(e) => {
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
