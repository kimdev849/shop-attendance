"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
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

/** Lit le user depuis localStorage une seule fois (synchrone). */
function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("sa_user");
    const token = localStorage.getItem("sa_access_token");
    if (stored && token) return JSON.parse(stored);
  } catch {
    // token corrompu, on nettoie
    localStorage.removeItem("sa_user");
    localStorage.removeItem("sa_access_token");
    localStorage.removeItem("sa_refresh_token");
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialisation synchrone → pas de flash "Chargement…" à chaque navigation
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const [isLoading] = useState(false);
  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.auth.login(email, password);
    localStorage.setItem("sa_access_token", data.accessToken);
    localStorage.setItem("sa_refresh_token", data.refreshToken);
    localStorage.setItem("sa_user", JSON.stringify(data.user));
    setUser(data.user);
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem("sa_access_token");
    localStorage.removeItem("sa_refresh_token");
    localStorage.removeItem("sa_user");
    setUser(null);
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
