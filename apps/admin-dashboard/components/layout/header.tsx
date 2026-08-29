"use client";

import { LogOut, Menu, Moon, Sun, Bell, ChevronRight, MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { useSidebar } from "./sidebar";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  SHOP_MANAGER: "Gérant",
  WORKER: "Worker",
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
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/40 bg-card/80 px-4 backdrop-blur-md md:px-6">
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <h1 className="text-base font-semibold tracking-tight text-foreground">{title}</h1>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Thème" className="h-9 w-9 rounded-xl">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* User pill - hidden on small mobile */}
        <div className="hidden items-center gap-2 rounded-full bg-secondary/60 pl-1 pr-3 py-1 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {initials(user?.email?.split("@")[0] ?? "U", "")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium leading-none text-foreground max-w-[120px]">{user?.email}</p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{user ? ROLE_LABELS[user.role] : ""}</p>
          </div>
        </div>

        {/* Logout - icon only on mobile */}
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Déconnexion" className="h-9 w-9 rounded-xl">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
