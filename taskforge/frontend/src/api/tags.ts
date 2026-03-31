import { apiFetch } from "./client";
import { Tag } from "../types";

export function listTags() {
  return apiFetch<Tag[]>("/tags");
}

export function createTag(payload: Partial<Tag>) {
  return apiFetch<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteTag(id: string) {
  return apiFetch<{ ok: boolean }>(`/tags/${id}`, { method: "DELETE" });
}
