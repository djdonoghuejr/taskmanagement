import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../platform/runtime", () => ({
  isNativeShell: () => true,
  currentPlatform: () => "android",
}));

const preferences = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

vi.mock("@capacitor/preferences", () => ({
  Preferences: preferences,
}));

describe("mobile auth client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    preferences.get.mockResolvedValue({ value: null });
    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockResolvedValue(undefined);
  });

  it("stores tokens on mobile login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: "user-1", email: "android@example.com", email_verified_at: null, providers: ["local"] },
        access_token: "access-1",
        refresh_token: "refresh-1",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const authApi = await import("../api/auth");
    const user = await authApi.login("android@example.com", "password123");

    expect(user.email).toBe("android@example.com");
    expect(preferences.set).toHaveBeenCalledWith({ key: "secreterry.mobile_refresh_token", value: "refresh-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/mobile/login",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("refreshes once on 401 and retries the mobile request", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ detail: "expired" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: { id: "user-1", email: "android@example.com", email_verified_at: null, providers: ["local"] },
          access_token: "access-2",
          refresh_token: "refresh-2",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: "task-1", name: "Task" }],
      });

    vi.stubGlobal("fetch", fetchMock);

    const { setMobileSessionTokens } = await import("../auth/mobileSession");
    await setMobileSessionTokens({ access_token: "access-1", refresh_token: "refresh-1" });

    const { apiFetch } = await import("../api/client");
    const tasks = await apiFetch<{ id: string; name: string }[]>("/tasks");

    expect(tasks).toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/auth/mobile/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh_token: "refresh-1" }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/tasks",
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get("Authorization")).toBe("Bearer access-2");
  });
});
