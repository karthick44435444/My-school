import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MobileUser,
  clearToken,
  fetchMe,
  getToken,
  loadUser,
  login as apiLogin,
  logout as apiLogout,
} from "@/lib/api";
import { addNotificationListeners, setupPushForUser } from "@/lib/notifications";

type AuthState = {
  user: MobileUser | null;
  loading: boolean;
  login: (schoolCode: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  themeColor: string;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setUser(null);
        return;
      }
      const cached = await loadUser();
      if (cached) setUser(cached);
      try {
        const me = await fetchMe();
        setUser(me);
      } catch {
        await clearToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Setup push listeners and registration for active user
  useEffect(() => {
    if (!user) return;
    setupPushForUser().then((r) => {
      if (!r.success) console.warn("[push]", r.error);
    });
    const removeListeners = addNotificationListeners();
    return () => {
      removeListeners();
    };
  }, [user?.id]);

  const login = useCallback(async (schoolCode: string, username: string, password: string) => {
    const { user: u } = await apiLogin(schoolCode, username, password);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refresh,
      themeColor: user?.themeColor || "#6366F1",
    }),
    [user, loading, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
