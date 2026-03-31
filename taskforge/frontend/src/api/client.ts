const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}
