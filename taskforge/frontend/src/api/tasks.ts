import { apiFetch } from "./client";
import { Task, TaskActivity, TaskDependencies, TaskSuggestion, TaskSummary } from "../types";

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

export function createTask(
  payload: Partial<Task> & { blocked_by_ids?: string[] | null; blocking_ids?: string[] | null }
) {
  return apiFetch<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTask(
  id: string,
  payload: Partial<Task> & {
    activity_comment?: string | null;
    blocked_by_ids?: string[] | null;
    blocking_ids?: string[] | null;
  }
) {
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

export function getTask(id: string) {
  return apiFetch<Task>(`/tasks/${id}`);
}

export function listTaskActivity(id: string) {
  return apiFetch<TaskActivity[]>(`/tasks/${id}/activity`);
}

export function addTaskComment(id: string, message: string) {
  return apiFetch<TaskActivity>(`/tasks/${id}/activity/comments`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getTaskDependencies(id: string) {
  return apiFetch<TaskDependencies>(`/tasks/${id}/dependencies`);
}

export function searchTasks(params: {
  q: string;
  scope: "all" | "project";
  project_id?: string;
  exclude_id?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  qs.set("q", params.q);
  qs.set("scope", params.scope);
  if (params.project_id) qs.set("project_id", params.project_id);
  if (params.exclude_id) qs.set("exclude_id", params.exclude_id);
  if (params.limit) qs.set("limit", String(params.limit));
  return apiFetch<TaskSummary[]>(`/tasks/search?${qs.toString()}`);
}

export function getSomethingDone(params: { minutes: number; exclude_ids?: string[] }) {
  const qs = new URLSearchParams();
  qs.set("minutes", String(params.minutes));
  for (const id of params.exclude_ids || []) {
    qs.append("exclude_ids", id);
  }
  return apiFetch<TaskSuggestion>(`/tasks/get-something-done?${qs.toString()}`);
}
