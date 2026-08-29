"use client";

import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { useSidebar } from "./sidebar";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  SHOP_MANAGER: "Gérant de shop",
  WORKER: "Travailleur",
};

export function Header({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { setMobileOpen } = useSidebar();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("sa_theme");
    const prefersDark = stored === "dark";
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("sa_theme", next ? "dark" : "light");
  }

  const [firstName, lastName] = (user?.email?.split("@")[0] ?? "U ").split(".");

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Changer de thème">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials(firstName ?? "U", lastName ?? "")}
          </div>
          <div className="text-sm">
            <p className="leading-none">{user?.email}</p>
            <p className="text-xs text-muted-foreground">{user ? ROLE_LABELS[user.role] : ""}</p>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={logout} aria-label="Se déconnecter">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
