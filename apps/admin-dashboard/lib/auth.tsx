"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "SHOP_MANAGER" | "WORKER";
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always start with null + loading=true on both server and client.
  // This avoids hydration mismatch: server renders "Loading...", client
  // also renders "Loading..." then useEffect reads localStorage.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Read localStorage only on client, after mount
    try {
      const stored = localStorage.getItem("sa_user");
      const token = localStorage.getItem("sa_access_token");
      if (stored && token) {
        setUser(JSON.parse(stored));
      }
    } catch {
      localStorage.removeItem("sa_user");
      localStorage.removeItem("sa_access_token");
      localStorage.removeItem("sa_refresh_token");
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.auth.login(email, password);
    localStorage.setItem("sa_access_token", data.accessToken);
    localStorage.setItem("sa_refresh_token", data.refreshToken);
    localStorage.setItem("sa_user", JSON.stringify(data.user));
    // Also set a cookie so Next.js middleware can detect auth server-side
    document.cookie = `sa_access_token=${data.accessToken}; path=/; max-age=86400; SameSite=Lax`;
    setUser(data.user);
    setIsLoading(false);
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem("sa_access_token");
    localStorage.removeItem("sa_refresh_token");
    localStorage.removeItem("sa_user");
    document.cookie = "sa_access_token=; path=/; max-age=0";
    setUser(null);
    setIsLoading(false);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
