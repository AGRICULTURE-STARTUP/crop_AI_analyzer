"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  apiRequest,
  clearTokens,
  getStoredTokens,
  roleHome,
  storeTokens,
} from "@/lib/api";
import type { MeResponse, TokenPair, UserRole } from "@/lib/types";

type AuthState = {
  user: MeResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  acceptTokens: (tokens: TokenPair) => Promise<string>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens) {
      setUser(null);
      return;
    }
    const me = await apiRequest<MeResponse>("/api/v1/me/");
    setUser(me);
  }, []);

  useEffect(() => {
    refreshMe()
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [refreshMe]);

  const acceptTokens = useCallback(
    async (tokens: TokenPair) => {
      storeTokens(tokens);
      const me = await apiRequest<MeResponse>("/api/v1/me/");
      setUser(me);
      return roleHome(me.role);
    },
    []
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const tokens = await apiRequest<TokenPair>("/api/v1/auth/login/", {
        method: "POST",
        auth: false,
        body: { username, password },
      });
      return acceptTokens(tokens);
    },
    [acceptTokens]
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/v1/auth/logout/", { method: "POST" });
    } catch {
      /* client discard is enough */
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe, acceptTokens }),
    [user, loading, login, logout, refreshMe, acceptTokens]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireRole(roles: UserRole[]) {
  const { user, loading } = useAuth();
  return {
    loading,
    allowed: !!user && roles.includes(user.role),
    user,
  };
}
