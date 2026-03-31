import { apiFetch } from "./client";
import { RecurringItem, RecurringCompletion, RecurringMetrics } from "../types";

export function listRecurring() {
  return apiFetch<RecurringItem[]>("/recurring");
}

export function createRecurring(payload: Partial<RecurringItem>) {
  return apiFetch<RecurringItem>("/recurring", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRecurring(id: string, payload: Partial<RecurringItem>) {
  return apiFetch<RecurringItem>(`/recurring/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function completeRecurring(id: string) {
  return apiFetch<RecurringCompletion>(`/recurring/${id}/complete`, {
    method: "POST",
  });
}

export function undoRecurringCompletion(id: string, date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiFetch<{ ok: boolean }>(`/recurring/${id}/complete${query}`, {
    method: "DELETE",
  });
}

export function deleteRecurring(id: string) {
  return apiFetch<{ ok: boolean }>(`/recurring/${id}`, { method: "DELETE" });
}

export function getRecurringMetrics() {
  return apiFetch<RecurringMetrics[]>("/recurring/metrics");
}

export function listRecurringCompletions(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiFetch<RecurringCompletion[]>(`/recurring/completions${query}`);
}
