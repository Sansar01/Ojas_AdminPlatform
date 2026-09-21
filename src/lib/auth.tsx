/* eslint-disable prettier/prettier */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { apiFetch, tokenStore, type AuthUser } from "./api";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => tokenStore.user);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    if (!tokenStore.access) {
      setUser(null);
      return;
    }
    try {
      const me = await apiFetch<{ sub: number; email: string; role: string }>("/api/auth/me");
      const u: AuthUser = { id: me.sub, email: me.email, role: me.role };
      localStorage.setItem("medi.user", JSON.stringify(u));
      setUser(u);
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
    const onChange = () => setUser(tokenStore.user);
    window.addEventListener("medi:auth", onChange);
    return () => window.removeEventListener("medi:auth", onChange);
  }, [refreshMe]);

const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { method: "POST", auth: false, body: JSON.stringify({ email, password }) },
    );
    const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
    const user: AuthUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.roles?.[0] ?? payload.userType,
    };
    tokenStore.set({ ...data, user });
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    try {
      if (refreshToken) {
        await apiFetch("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // ignore — clear locally anyway
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
