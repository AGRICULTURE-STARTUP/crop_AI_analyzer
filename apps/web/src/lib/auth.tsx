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
  ApiError,
  clearTokens,
  getStoredTokens,
  isSessionIdle,
  recordActivity,
  roleHome,
  storeTokens,
} from "@/lib/api";
import type { MeResponse, TokenPair, UserRole } from "@/lib/types";

type AuthState = {
  user: MeResponse | null;
  loading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ home: string; role: UserRole }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  acceptTokens: (tokens: TokenPair) => Promise<{ home: string; role: UserRole }>;
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
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, [refreshMe]);

  useEffect(() => {
    let lastRecordedAt = 0;
    let lastServerSyncAt = Date.now();
    let syncInFlight = false;
    const noteActivity = () => {
      if (getStoredTokens() && isSessionIdle()) {
        clearTokens();
        setUser(null);
        return;
      }
      const now = Date.now();
      if (now - lastRecordedAt >= 15_000) {
        recordActivity();
        lastRecordedAt = now;
      }
      if (
        getStoredTokens() &&
        now - lastServerSyncAt >= 60_000 &&
        !syncInFlight
      ) {
        syncInFlight = true;
        lastServerSyncAt = now;
        void apiRequest("/api/v1/me/")
          .catch((err) => {
            if (err instanceof ApiError && err.status === 401) {
              clearTokens();
              setUser(null);
            }
          })
          .finally(() => {
            syncInFlight = false;
          });
      }
    };
    const expireIfIdle = () => {
      if (getStoredTokens() && isSessionIdle()) {
        clearTokens();
        setUser(null);
      }
    };
    const sessionCleared = () => setUser(null);
    const storageChanged = (event: StorageEvent) => {
      if (event.key?.startsWith("agriscan_")) {
        expireIfIdle();
        if (!getStoredTokens()) setUser(null);
      }
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    activityEvents.forEach((event) =>
      window.addEventListener(event, noteActivity, { passive: true })
    );
    window.addEventListener("focus", noteActivity);
    window.addEventListener("storage", storageChanged);
    window.addEventListener("agriscan:session-cleared", sessionCleared);
    const interval = window.setInterval(expireIfIdle, 15_000);

    return () => {
      activityEvents.forEach((event) =>
        window.removeEventListener(event, noteActivity)
      );
      window.removeEventListener("focus", noteActivity);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("agriscan:session-cleared", sessionCleared);
      window.clearInterval(interval);
    };
  }, []);

  const acceptTokens = useCallback(async (tokens: TokenPair) => {
    storeTokens(tokens);
    const me = await apiRequest<MeResponse>("/api/v1/me/");
    setUser(me);
    return { home: roleHome(me.role), role: me.role };
  }, []);

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
    const refresh = getStoredTokens()?.refresh;
    try {
      await apiRequest("/api/v1/auth/logout/", {
        method: "POST",
        body: refresh ? { refresh } : {},
      });
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
