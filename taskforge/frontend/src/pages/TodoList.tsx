import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listTasks,
  createTask,
  completeTask,
  deleteTask,
  updateTask,
  duplicateTask,
  reopenTask,
} from "../api/tasks";
import TaskForm from "../components/forms/TaskForm";
import { Task } from "../types";

export default function TodoList() {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editName, setEditName] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCompletionNotes, setEditCompletionNotes] = useState("");
  const [completeTarget, setCompleteTarget] = useState<Task | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });

  const addTask = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setCreateError(null);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: Error) => {
      setCreateError(error.message || "Failed to create task.");
    },
  });

  const complete = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      completeTask(id, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const reopen = useMutation({
    mutationFn: reopenTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Task> }) =>
      updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingTask(null);
    },
  });

  const duplicate = useMutation({
    mutationFn: duplicateTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = tasks.filter((t) => (showCompleted ? true : t.status === "pending"));

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setEditName(task.name);
    setEditDueDate(task.due_date || "");
    setEditDescription(task.description || "");
    setEditCompletionNotes(task.completion_notes || "");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">To-Do List</h2>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show Completed
        </label>
      </div>

      {createError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {createError}
        </div>
      )}

      <TaskForm onSubmit={(payload) => addTask.mutate(payload)} />

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-200">
          {filtered.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3" data-testid={`task-row-${task.id}`}>
              <div>
                <p className="font-medium text-slate-900">{task.name}</p>
                <p className="text-xs text-slate-500">{task.due_date || "No due date"}</p>
                {task.status === "completed" && task.completed_at && (
                  <p className="text-xs text-slate-400">
                    Completed {new Date(task.completed_at).toLocaleDateString()}
                  </p>
                )}
                {task.completion_notes && (
                  <p className="text-xs text-slate-500">Notes: {task.completion_notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {task.status === "pending" ? (
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                    onClick={() => {
                      setCompleteTarget(task);
                      setCompleteNotes("");
                    }}
                  >
                    Complete
                  </button>
                ) : (
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                    onClick={() => reopen.mutate(task.id)}
                  >
                    Reopen
                  </button>
                )}
                <button
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  onClick={() => openEdit(task)}
                  data-testid={`task-edit-${task.id}`}
                >
                  Edit
                </button>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  onClick={() => duplicate.mutate(task.id)}
                  data-testid={`task-duplicate-${task.id}`}
                >
                  Duplicate
                </button>
                <button
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  onClick={() => remove.mutate(task.id)}
                  data-testid={`task-delete-${task.id}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {completeTarget && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Complete Task</h3>
            <button className="text-sm text-slate-500" onClick={() => setCompleteTarget(null)}>
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <p className="text-sm text-slate-600">{completeTarget.name}</p>
            <label className="text-sm">
              <span className="text-slate-600">Completion Notes (optional)</span>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                rows={3}
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() => {
                  complete.mutate({ id: completeTarget.id, notes: completeNotes || undefined });
                  setCompleteTarget(null);
                }}
              >
                Save & Complete
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                onClick={() => setCompleteTarget(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Edit Task</h3>
            <button
              className="text-sm text-slate-500"
              onClick={() => setEditingTask(null)}
            >
              Close
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">
              <span className="text-slate-600">Name</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                data-testid="task-edit-name"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Due Date</span>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                data-testid="task-edit-due"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">Description</span>
              <textarea
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                data-testid="task-edit-description"
              />
            </label>
            {editingTask.status === "completed" && (
              <label className="text-sm">
                <span className="text-slate-600">Completion Notes</span>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  rows={3}
                  value={editCompletionNotes}
                  onChange={(e) => setEditCompletionNotes(e.target.value)}
                />
              </label>
            )}
            <div className="flex gap-2">
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
                onClick={() =>
                  update.mutate({
                    id: editingTask.id,
                    payload: {
                      name: editName,
                      due_date: editDueDate || null,
                      description: editDescription || null,
                      completion_notes:
                        editingTask.status === "completed" ? editCompletionNotes || null : undefined,
                    },
                  })
                }
                data-testid="task-edit-save"
              >
                Save
              </button>
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                onClick={() => setEditingTask(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
