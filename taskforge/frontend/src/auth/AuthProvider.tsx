import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserMe } from "../types";
import * as authApi from "../api/auth";

type AuthContextValue = {
  user: UserMe | null;
  isLoading: boolean;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    try {
      const next = await authApi.me();
      setUser(next);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await authApi.bootstrapAuth();
        await authApi.getCsrf();
        await refresh();
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email, password) => {
        await authApi.getCsrf();
        const next = await authApi.login(email, password);
        setUser(next);
      },
      register: async (email, password) => {
        await authApi.getCsrf();
        const next = await authApi.register(email, password);
        setUser(next);
      },
      logout: async () => {
        await authApi.getCsrf();
        await authApi.logout();
        setUser(null);
      },
      refresh,
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
