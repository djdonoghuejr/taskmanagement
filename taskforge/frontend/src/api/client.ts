import { bootstrapMobileSession, clearMobileSessionTokens, getMobileAccessToken, refreshMobileSession } from "../auth/mobileSession";
import { isNativeShell } from "../platform/runtime";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const MOBILE_UNAUTHORIZED = "Mobile session expired";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return undefined;
  return decodeURIComponent(match.slice(name.length + 1));
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return apiFetchInternal<T>(path, options, false);
}

async function apiFetchInternal<T>(path: string, options: RequestInit | undefined, hasRetried: boolean): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  const headers = new Headers({
    "Content-Type": "application/json",
    ...(options?.headers || {}),
  });
  const nativeShell = isNativeShell();

  if (nativeShell) {
    const accessToken = getMobileAccessToken();
    if (accessToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  if (!nativeShell && ["POST", "PUT", "PATCH", "DELETE"].includes(method) && !headers.has("X-CSRF-Token")) {
    const csrf = getCookie("tf_csrf");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: nativeShell ? "omit" : "include",
    headers,
    ...options,
  });

  if (nativeShell && res.status === 401 && !hasRetried) {
    const refreshed = await refreshMobileSession(API_BASE);
    if (refreshed) {
      return apiFetchInternal<T>(path, options, true);
    }
    await clearMobileSessionTokens();
    throw new Error(MOBILE_UNAUTHORIZED);
  }

  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { detail?: string };
      throw new Error(parsed.detail || text || "Request failed");
    } catch {
      throw new Error(text || "Request failed");
    }
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function bootstrapApiAuth() {
  if (isNativeShell()) {
    await bootstrapMobileSession(API_BASE);
  }
}

export function isNativeApiAuth() {
  return isNativeShell();
}

export function getApiBase() {
  return API_BASE;
}
