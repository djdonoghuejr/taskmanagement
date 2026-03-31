import { apiFetch } from "./client";
import { Project } from "../types";

export function listProjects() {
  return apiFetch<Project[]>("/projects");
}

export function createProject(payload: Partial<Project>) {
  return apiFetch<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProject(id: string, payload: Partial<Project>) {
  return apiFetch<Project>(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProject(id: string) {
  return apiFetch<{ ok: boolean }>(`/projects/${id}`, { method: "DELETE" });
}
