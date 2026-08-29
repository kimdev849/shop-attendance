"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  UserCog,
  Clock,
  CalendarX,
  Banknote,
  FileBarChart,
  Tablet,
  Settings,
  ShieldCheck,
  ClipboardList,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/shops", label: "Shops", icon: Store },
  { href: "/workers", label: "Travailleurs", icon: Users },
  { href: "/attendance", label: "Pointages", icon: Clock },
  { href: "/absences", label: "Absences", icon: CalendarX },
  { href: "/penalties", label: "Pénalités", icon: Banknote },
  { href: "/reports", label: "Rapports", icon: FileBarChart },
  { href: "/devices", label: "Appareils", icon: Tablet },
  { href: "/users", label: "Utilisateurs", icon: UserCog, adminOnly: true },
  { href: "/audit", label: "Historique", icon: ClipboardList, adminOnly: true },
  { href: "/settings", label: "Paramètres", icon: Settings },
] as const;

// --- Context pour toggle mobile ---
interface SidebarContextValue {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}
const SidebarContext = createContext<SidebarContextValue>({
  mobileOpen: false,
  setMobileOpen: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">ShopAttendance</p>
          <p className="text-xs text-muted-foreground">Gestion multi-shops</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        ShopAttendance v1.0
      </div>
    </>
  );
}

export function Sidebar() {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col bg-card shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
