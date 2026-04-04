import { apiFetch } from "./client";
import type { UserMe } from "../types";

export async function getCsrf(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/auth/csrf");
}

export async function me(): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/me");
}

export async function register(email: string, password: string): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<UserMe> {
  return apiFetch<UserMe>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

