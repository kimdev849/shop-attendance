"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Users, Tablet, CheckCircle2, Clock, CalendarX, Banknote, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AttendanceTrendChart, TrendPoint } from "@/components/charts/attendance-trend-chart";
import { ShopDistributionChart, ShopDistributionPoint } from "@/components/charts/shop-distribution-chart";
import { api } from "@/lib/api";
import { formatFcfa, formatDateTime } from "@/lib/utils";

interface Stats {
  totalShops: number;
  totalWorkers: number;
  totalDevices: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  totalPenaltiesAmountPending: number;
}

function StatCard({ icon: Icon, label, value, accent, href }: {
  icon: any; label: string; value: string | number; accent: string; href?: string;
}) {
  const content = (
    <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 sm:h-11 sm:w-11"
          style={{ backgroundColor: `hsl(${accent} / 0.1)` }}>
          <Icon className="h-5 w-5" style={{ color: `hsl(${accent})` }} />
        </div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function DashboardSkeleton({ isSlow }: { isSlow?: boolean }) {
  return (
    <div className="space-y-4 sm:space-y-6">        {isSlow && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Le serveur se réveille, cela peut prendre quelques secondes...</span>
        </div>
      )}
      <div className="space-y-4 animate-pulse sm:space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="flex items-center justify-between p-4">
              <div className="space-y-2"><div className="h-2.5 w-16 rounded bg-muted-foreground/10" /><div className="h-6 w-10 rounded bg-muted-foreground/15" /></div>
              <div className="h-10 w-10 rounded-xl bg-muted-foreground/10" />
            </CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 sm:gap-4">
          <Card><CardContent className="h-64" /></Card>
          <Card><CardContent className="h-64" /></Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [shopDistribution, setShopDistribution] = useState<ShopDistributionPoint[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    // Show "warming" hint after 5s (Render cold start)
    const timer = setTimeout(() => setIsSlow(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function load() {
    try {
      const [statsRes, trendRes, shopRes, logsRes] = await Promise.all([
        api.dashboard.stats(), api.dashboard.dailyTrend(14),
        api.dashboard.attendanceByShop(), api.auditLogs.list({ limit: 6 }),
      ]);
      setStats(statsRes.data);
      setTrend(trendRes.data);
      setShopDistribution(shopRes.data.map((s: any) => ({ shopName: s.shopName, present: s.present, late: s.late, absent: s.absent })));
      setRecentLogs((logsRes.data.data ?? logsRes.data).slice(0, 6));
    } catch (err: any) {
      setDashboardError(err?.response?.data?.message ?? "Le serveur est indisponible. Réessayez dans quelques instants.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell title="Tableau de bord">
      {(loading || !stats) && !dashboardError ? <DashboardSkeleton isSlow={isSlow} /> : dashboardError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium text-destructive">Erreur de chargement</p>
          <p className="text-xs text-muted-foreground">{dashboardError}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); setDashboardError(null); load(); }}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Stats — 2 cols on mobile, 3 on sm, 6 on lg */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            <StatCard icon={Store} label="Shops" value={stats.totalShops} accent="222 84% 40%" href="/shops" />
            <StatCard icon={Users} label="Workers" value={stats.totalWorkers} accent="262 83% 58%" href="/workers" />
            <StatCard icon={Tablet} label="Tablettes" value={stats.totalDevices} accent="200 90% 50%" href="/devices" />
            <StatCard icon={CheckCircle2} label="Présents" value={stats.presentToday} accent="152 69% 31%" href="/attendance" />
            <StatCard icon={Clock} label="Retards" value={stats.lateToday} accent="38 92% 50%" href="/attendance" />
            <StatCard icon={CalendarX} label="Absents" value={stats.absentToday} accent="0 84% 60%" href="/absences" />
            <StatCard icon={Banknote} label="Pénalités" value={formatFcfa(stats.totalPenaltiesAmountPending)} accent="25 95% 53%" href="/penalties" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 sm:gap-4">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold uppercase tracking-wider">Tendance 14 jours</CardTitle></CardHeader>
              <CardContent>
                {trend.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p> : <AttendanceTrendChart data={trend} />}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs font-semibold uppercase tracking-wider">Par shop</CardTitle></CardHeader>
              <CardContent>
                {shopDistribution.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p> : <ShopDistributionChart data={shopDistribution} />}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider">Activité récente</CardTitle>
              <Link href="/audit" className="text-xs font-medium text-primary hover:underline">Tout voir →</Link>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité.</p> : (
                <div className="space-y-1">
                  {recentLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm">
                          {actionIcon(log.action)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{actionLabel(log.action)}{metaLabel(log.metadata) ? ` — ${metaLabel(log.metadata)}` : ""}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{log.user?.email ?? "Système"}</p>
                        </div>
                      </div>
                      <span className="shrink-0 ml-2 text-[11px] text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

const ACTION_LABELS: Record<string, string> = {
  WORKER_CREATED: "Travailleur créé", WORKER_UPDATED: "Travailleur modifié",
  WORKER_STATUS_ACTIVE: "Activé", WORKER_STATUS_INACTIVE: "Désactivé",
  SHOP_CREATED: "Shop créé", SHOP_UPDATED: "Shop modifié",
  SHOP_ACTIVATED: "Shop activé", SHOP_DEACTIVATED: "Shop désactivé",
  ATTENDANCE_CHECK_IN: "Pointage", ABSENCE_CREATED: "Absence créée",
  ABSENCE_VALIDATED: "Absence validée", ABSENCE_REJECTED: "Absence rejetée",
  PENALTY_APPROVED: "Pénalité approuvée", PENALTY_REJECTED: "Pénalité rejetée",
  PENALTY_CANCELLED: "Pénalité annulée",
};
function actionLabel(action: string) { return ACTION_LABELS[action] ?? action.replace(/_/g, " "); }
function actionIcon(action: string) {
  if (action.includes("SHOP")) return "🏪"; if (action.includes("WORKER")) return "👤";
  if (action.includes("ATTENDANCE")) return "⏰"; if (action.includes("ABSENCE")) return "📋";
  if (action.includes("PENALTY")) return "💰"; return "📝";
}
function metaLabel(meta: any) {
  if (!meta) return ""; if (meta.employeeNumber) return meta.employeeNumber;
  if (meta.name && meta.code) return `${meta.name} (${meta.code})`; if (meta.name) return meta.name;
  if (meta.email) return meta.email; if (meta.amount !== undefined) return `${meta.amount} FCFA`; return "";
}
