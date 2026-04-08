import { apiFetch, bootstrapApiAuth, isNativeApiAuth } from "./client";
import { clearMobileSessionTokens, setMobileSessionTokens } from "../auth/mobileSession";
import type { MobileAuthResponse, UserMe } from "../types";

export async function bootstrapAuth(): Promise<void> {
  await bootstrapApiAuth();
}

export async function getCsrf(): Promise<{ ok: boolean }> {
  if (isNativeApiAuth()) return { ok: true };
  return apiFetch<{ ok: boolean }>("/auth/csrf");
}

export async function me(): Promise<UserMe> {
  if (isNativeApiAuth()) return apiFetch<UserMe>("/auth/mobile/me");
  return apiFetch<UserMe>("/auth/me");
}

export async function register(email: string, password: string): Promise<UserMe> {
  if (isNativeApiAuth()) {
    const payload = await apiFetch<MobileAuthResponse>("/auth/mobile/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setMobileSessionTokens(payload);
    return payload.user;
  }
  return apiFetch<UserMe>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<UserMe> {
  if (isNativeApiAuth()) {
    const payload = await apiFetch<MobileAuthResponse>("/auth/mobile/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setMobileSessionTokens(payload);
    return payload.user;
  }
  return apiFetch<UserMe>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<{ ok: boolean }> {
  if (isNativeApiAuth()) {
    try {
      return await apiFetch<{ ok: boolean }>("/auth/mobile/logout", { method: "POST" });
    } finally {
      await clearMobileSessionTokens();
    }
  }
  return apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export async function changePassword(current_password: string, new_password: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
}
