import { apiFetch } from "./client";
import { CalendarEvent } from "../types";

export function listEvents(start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const query = params.toString();
  return apiFetch<CalendarEvent[]>(`/events${query ? `?${query}` : ""}`);
}

export function createEvent(payload: Partial<CalendarEvent>) {
  return apiFetch<CalendarEvent>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEvent(id: string, payload: Partial<CalendarEvent>) {
  return apiFetch<CalendarEvent>(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteEvent(id: string) {
  return apiFetch<{ ok: boolean }>(`/events/${id}`, { method: "DELETE" });
}
