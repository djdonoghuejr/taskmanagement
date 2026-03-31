import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, createTask, completeTask, deleteTask } from "../api/tasks";
import TaskForm from "../components/forms/TaskForm";

export default function TodoList() {
  const queryClient = useQueryClient();
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasks = [] } = useQuery({ queryKey: ["tasks"], queryFn: listTasks });

  const addTask = useMutation({
    mutationFn: createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const complete = useMutation({
    mutationFn: completeTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const remove = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const filtered = tasks.filter((t) => (showCompleted ? true : t.status === "pending"));

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

      <TaskForm onSubmit={(payload) => addTask.mutate(payload)} />

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-200">
          {filtered.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3">
              <div>
                <p className="font-medium text-slate-900">{task.name}</p>
                <p className="text-xs text-slate-500">{task.due_date || "No due date"}</p>
              </div>
              <div className="flex items-center gap-2">
                {task.status === "pending" && (
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                    onClick={() => complete.mutate(task.id)}
                  >
                    Complete
                  </button>
                )}
                <button
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs"
                  onClick={() => remove.mutate(task.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
