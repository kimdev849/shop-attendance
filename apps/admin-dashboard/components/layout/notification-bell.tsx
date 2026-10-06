"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, Bell, CalendarX, CheckCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Notification } from "@shop-attendance/types";

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  LATE_CHECK_IN: Clock,
  ABSENCE: CalendarX,
  PENALTY: Banknote,
  SYSTEM: AlertTriangle,
};

const NOTIFICATION_HREFS: Record<string, string> = {
  LATE_CHECK_IN: "/attendance",
  ABSENCE: "/absences",
  PENALTY: "/penalties",
  SYSTEM: "/dashboard",
};

const PAGE_SIZE = 15;
const POLL_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.notifications.unreadCount();
      setUnreadCount(Number(data) || 0);
    } catch {
      // Silencieux : le badge disparaît simplement en cas d'erreur réseau.
    }
  }, [user]);

  const loadNotifications = useCallback(
    async (targetPage: number, append = false) => {
      setLoading(true);
      try {
        const { data } = await api.notifications.list({ page: targetPage, limit: PAGE_SIZE });
        setTotal(data.total ?? 0);
        setNotifications((prev) => (append ? [...prev, ...data.data] : data.data));
        setPage(targetPage);
      } catch {
        if (!append) setNotifications([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Polling du compteur de non-lus (léger) + rechargement du dropdown si ouvert.
  useEffect(() => {
    if (!user) return;
    refreshUnreadCount();
    const interval = setInterval(() => {
      refreshUnreadCount();
      if (open) loadNotifications(1);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, open, refreshUnreadCount, loadNotifications]);

  // Recharge à l'ouverture du dropdown.
  useEffect(() => {
    if (open) loadNotifications(1);
  }, [open, loadNotifications]);

  // Fermeture au clic extérieur / touche Échap.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  async function handleNotificationClick(n: Notification) {
    if (!n.readAt) {
      // Fire-and-forget : ne bloque pas la navigation.
      api.notifications.markAsRead(n.id).then(refreshUnreadCount).catch(() => {});
    }
    setOpen(false);
    if (n.entity) {
      router.push(NOTIFICATION_HREFS[n.entity] ?? "/dashboard");
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.notifications.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
      setUnreadCount(0);
    } catch {
      // Silencieux.
    }
  }

  async function handleLoadMore() {
    await loadNotifications(page + 1, true);
  }

  const hasMore = notifications.length < total;

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-xl"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/10 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="space-y-2 px-4 py-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-secondary/60" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Aucune notification.</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const Icon = NOTIFICATION_ICONS[n.type] ?? AlertTriangle;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => handleNotificationClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-secondary/60",
                          !n.readAt && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                            !n.readAt ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={cn("truncate text-xs", !n.readAt ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                              {n.title}
                            </span>
                            {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>
                          <span className="mt-1 block text-[10px] text-muted-foreground/70">
                            {new Date(n.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full border-t border-border/60 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-secondary/60 disabled:opacity-50"
            >
              {loading ? "Chargement…" : "Charger plus"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
