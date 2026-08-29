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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

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

/* ─── Desktop sidebar ─── */
function DesktopSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((item: any) => !item.adminOnly || user?.role === "ADMIN");

  return (
    <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col lg:border-r lg:border-border/50 lg:bg-card/80 lg:backdrop-blur-sm">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border/40 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-foreground truncate">ShopAttendance</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Administration</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
              <span>{item.label}</span>
              {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border/40 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {user?.email?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{user?.email ?? "—"}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{user?.role ?? ""}</p>
          </div>
          <button onClick={logout} title="Déconnexion" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Mobile bottom tabs ─── */
function MobileBottomTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item: any) => !item.adminOnly || user?.role === "ADMIN");
  // Show 5 most important items on bottom bar
  const bottomItems = items.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border/50 bg-card/95 backdrop-blur-md lg:hidden safe-area-bottom">
      {bottomItems.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── Mobile slide-over menu (for remaining items) ─── */
function MobileSlideOver() {
  const { mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const items = NAV_ITEMS.filter((item: any) => !item.adminOnly || user?.role === "ADMIN");
  // Items not in the bottom bar
  const overflowItems = items.slice(5);

  if (!mobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      <div className="relative z-10 flex w-72 flex-col bg-card shadow-2xl animate-slide-in">
        <div className="flex h-16 items-center justify-between border-b border-border/40 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold">ShopAttendance</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {overflowItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border/40 p-4">
          <button onClick={() => { logout(); setMobileOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut className="h-[18px] w-[18px]" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main sidebar export ─── */
export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileBottomTabs />
      <MobileSlideOver />
    </>
  );
}
