import { apiFetch } from "./client";
import { Task } from "../types";

export function listTasks() {
  return apiFetch<Task[]>("/tasks");
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

export function completeTask(id: string) {
  return apiFetch<Task>(`/tasks/${id}/complete`, { method: "PATCH" });
}

export function deleteTask(id: string) {
  return apiFetch<{ ok: boolean }>(`/tasks/${id}`, { method: "DELETE" });
}
