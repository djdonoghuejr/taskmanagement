import { apiFetch } from "./client";
import { Task } from "../types";

export function listTasks(params?: {
  status?: string;
  project_id?: string;
  tag?: string;
  due_before?: string;
  due_after?: string;
  completed_before?: string;
  completed_after?: string;
  order_by?: "due_date" | "completed_at" | "created_at";
  sort?: "asc" | "desc";
}) {
  const search = new URLSearchParams();
  if (!params) return apiFetch<Task[]>("/tasks");
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return apiFetch<Task[]>(`/tasks${qs ? `?${qs}` : ""}`);
}

export function createTask(payload: Partial<Task>) {
  return apiFetch<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTask(id: string, payload: Partial<Task>) {
  return apiFetch<Task>(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function completeTask(id: string, completion_notes?: string) {
  return apiFetch<Task>(`/tasks/${id}/complete`, {
    method: "PATCH",
    body: JSON.stringify({ completion_notes }),
  });
}

export function reopenTask(id: string) {
  return apiFetch<Task>(`/tasks/${id}/reopen`, { method: "PATCH" });
}

export function duplicateTask(id: string) {
  return apiFetch<Task>(`/tasks/${id}/duplicate`, { method: "POST" });
}

export function deleteTask(id: string) {
  return apiFetch<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" });
}
