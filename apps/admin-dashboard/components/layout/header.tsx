"use client";

import { LogOut, Menu, Moon, Sun, Bell } from "lucide-react";
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

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-card/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
          <div className="hidden h-0.5 w-8 rounded-full bg-primary sm:block" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Changer de thème" className="rounded-xl">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* Divider */}
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        {/* User */}
        <div className="hidden items-center gap-2.5 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-xs font-bold text-primary-foreground shadow-sm">
            {initials(user?.email?.split("@")[0] ?? "U", "")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-none text-foreground">{user?.email}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {user ? ROLE_LABELS[user.role] : ""}
            </p>
          </div>
        </div>

        {/* Logout */}
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Se déconnecter" className="rounded-xl">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
