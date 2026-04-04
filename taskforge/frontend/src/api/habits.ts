import { apiFetch } from "./client";
import { Habit, HabitCompletion, HabitMetrics } from "../types";

export function listHabits() {
  return apiFetch<Habit[]>("/habits");
}

export function createHabit(payload: Partial<Habit>) {
  return apiFetch<Habit>("/habits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateHabit(id: string, payload: Partial<Habit>) {
  return apiFetch<Habit>(`/habits/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function completeHabit(id: string, completion_notes?: string) {
  return apiFetch<HabitCompletion>(`/habits/${id}/complete`, {
    method: "POST",
    body: JSON.stringify({ completion_notes }),
  });
}

export function updateHabitCompletion(id: string, date?: string, completion_notes?: string) {
  const query = date ? `?date=${date}` : "";
  return apiFetch<HabitCompletion>(`/habits/${id}/complete${query}`, {
    method: "PATCH",
    body: JSON.stringify({ completion_notes }),
  });
}

export function undoHabitCompletion(id: string, date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiFetch<{ ok: boolean }>(`/habits/${id}/complete${query}`, {
    method: "DELETE",
  });
}

export function deleteHabit(id: string) {
  return apiFetch<{ ok: boolean }>(`/habits/${id}`, { method: "DELETE" });
}

export function getHabitMetrics() {
  return apiFetch<HabitMetrics[]>("/habits/metrics");
}

export function listHabitCompletions(date?: string) {
  const query = date ? `?date=${date}` : "";
  return apiFetch<HabitCompletion[]>(`/habits/completions${query}`);
}

export function listHabitCompletionsRange(start: string, end: string) {
  const params = new URLSearchParams({ start, end });
  return apiFetch<HabitCompletion[]>(`/habits/completions?${params.toString()}`);
}
