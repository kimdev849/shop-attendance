"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem("sa_user");
    const token = window.localStorage.getItem("sa_access_token");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem("sa_user");
      }
    }
    setIsLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.auth.login(email, password);
    window.localStorage.setItem("sa_access_token", data.accessToken);
    window.localStorage.setItem("sa_refresh_token", data.refreshToken);
    window.localStorage.setItem("sa_user", JSON.stringify(data.user));
    setUser(data.user);
    router.push("/dashboard");
  }

  function logout() {
    window.localStorage.removeItem("sa_access_token");
    window.localStorage.removeItem("sa_refresh_token");
    window.localStorage.removeItem("sa_user");
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
