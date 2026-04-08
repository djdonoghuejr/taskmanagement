import { Preferences } from "@capacitor/preferences";
import { isNativeShell } from "../platform/runtime";

const REFRESH_TOKEN_KEY = "secreterry.mobile_refresh_token";

type MobileAuthPayload = {
  access_token: string;
  refresh_token: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let bootstrapPromise: Promise<void> | null = null;
let refreshPromise: Promise<boolean> | null = null;

async function loadStoredRefreshToken() {
  if (!isNativeShell()) return null;
  const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
  return value || null;
}

async function persistRefreshToken(value: string | null) {
  if (!isNativeShell()) return;
  if (!value) {
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    return;
  }
  await Preferences.set({ key: REFRESH_TOKEN_KEY, value });
}

async function hydrateRefreshToken() {
  if (refreshToken || !isNativeShell()) return;
  refreshToken = await loadStoredRefreshToken();
}

export function getMobileAccessToken() {
  return accessToken;
}

export async function setMobileSessionTokens(payload: MobileAuthPayload) {
  accessToken = payload.access_token;
  refreshToken = payload.refresh_token;
  await persistRefreshToken(payload.refresh_token);
}

export async function clearMobileSessionTokens() {
  accessToken = null;
  refreshToken = null;
  bootstrapPromise = null;
  await persistRefreshToken(null);
}

export async function refreshMobileSession(apiBase: string): Promise<boolean> {
  if (!isNativeShell()) return false;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    await hydrateRefreshToken();
    if (!refreshToken) return false;

    const res = await fetch(`${apiBase}/auth/mobile/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      await clearMobileSessionTokens();
      return false;
    }

    const payload = (await res.json()) as MobileAuthPayload;
    await setMobileSessionTokens(payload);
    return true;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function bootstrapMobileSession(apiBase: string) {
  if (!isNativeShell()) return;
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    await hydrateRefreshToken();
    if (refreshToken) {
      await refreshMobileSession(apiBase);
    }
  })();
  return bootstrapPromise;
}
