"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Users, CheckCircle2, Clock, CalendarX, Banknote, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttendanceTrendChart, TrendPoint } from "@/components/charts/attendance-trend-chart";
import { ShopDistributionChart, ShopDistributionPoint } from "@/components/charts/shop-distribution-chart";
import { api } from "@/lib/api";
import { formatFcfa, formatDateTime } from "@/lib/utils";

interface Stats {
  totalShops: number;
  totalWorkers: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  totalPenaltiesAmountPending: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  trend,
  trendValue,
  href,
}: {
  icon: any;
  label: string;
  value: string | number;
  accent?: string;
  trend?: "up" | "down";
  trendValue?: string;
  href?: string;
}) {
  const content = (
    <Card className="group transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
            {trendValue && (
              <div className="flex items-center gap-1">
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
            style={{ backgroundColor: `hsl(${accent ?? "205 65% 24%"} / 0.1)` }}
          >
            <Icon className="h-5 w-5" style={{ color: `hsl(${accent ?? "205 65% 24%"})` }} />
          </div>
        </div>
        {href && (
          <Link href={href} className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Voir plus <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
  return content;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-2.5 w-24 rounded bg-muted-foreground/10" />
                  <div className="h-7 w-12 rounded bg-muted-foreground/15" />
                </div>
                <div className="h-11 w-11 rounded-xl bg-muted-foreground/10" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardContent className="h-72" /></Card>
        <Card><CardContent className="h-72" /></Card>
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

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, trendRes, shopRes, logsRes] = await Promise.all([
          api.dashboard.stats(),
          api.dashboard.dailyTrend(14),
          api.dashboard.attendanceByShop(),
          api.auditLogs.list({ limit: 8 }),
        ]);
        setStats(statsRes.data);
        setTrend(trendRes.data);
        setShopDistribution(
          shopRes.data.map((s: any) => ({
            shopName: s.shopName,
            present: s.present,
            late: s.late,
            absent: s.absent,
          })),
        );
        setRecentLogs((logsRes.data.data ?? logsRes.data).slice(0, 8));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell title="Tableau de bord">
      {loading || !stats ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Store} label="Shops" value={stats.totalShops} accent="205 65% 24%" href="/shops" />
            <StatCard icon={Users} label="Travailleurs" value={stats.totalWorkers} accent="262 83% 58%" href="/workers" />
            <StatCard icon={CheckCircle2} label="Présents" value={stats.presentToday} accent="142 71% 45%" trend="up" trendValue="Aujourd'hui" href="/attendance" />
            <StatCard icon={Clock} label="Retards" value={stats.lateToday} accent="38 85% 50%" trend="down" trendValue="Aujourd'hui" href="/attendance" />
            <StatCard icon={CalendarX} label="Absents" value={stats.absentToday} accent="0 72% 51%" href="/absences" />
            <StatCard icon={Banknote} label="Pénalités" value={formatFcfa(stats.totalPenaltiesAmountPending)} accent="25 95% 53%" href="/penalties" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Évolution quotidienne (14 jours)</CardTitle>
              </CardHeader>
              <CardContent>
                {trend.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p>
                ) : (
                  <AttendanceTrendChart data={trend} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Répartition par shop</CardTitle>
              </CardHeader>
              <CardContent>
                {shopDistribution.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p>
                ) : (
                  <ShopDistributionChart data={shopDistribution} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Activité récente</CardTitle>
              <Link href="/audit" className="text-xs font-medium text-primary hover:underline">
                Tout voir →
              </Link>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité récente.</p>
              ) : (
                <div className="space-y-1.5">
                  {recentLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5 transition-colors hover:bg-secondary/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">
                          {actionIcon(log.action)}
                        </div>
                        <div>
                          <p className="text-xs">
                            <span className="font-semibold">{actionLabel(log.action)}</span>
                            {metaLabel(log.metadata) && (
                              <span className="ml-1 text-muted-foreground">— {metaLabel(log.metadata)}</span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{log.user?.email ?? "Système"}</p>
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">{formatDateTime(log.createdAt)}</span>
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
  WORKER_CREATED: "Travailleur créé",
  WORKER_UPDATED: "Travailleur modifié",
  WORKER_STATUS_ACTIVE: "Activé",
  WORKER_STATUS_INACTIVE: "Désactivé",
  WORKER_SCHEDULE_ASSIGNED: "Horaire affecté",
  SHOP_CREATED: "Shop créé",
  SHOP_UPDATED: "Shop modifié",
  SHOP_ACTIVATED: "Shop activé",
  SHOP_DEACTIVATED: "Shop désactivé",
  ATTENDANCE_CHECK_IN: "Pointage",
  ABSENCE_CREATED: "Absence créée",
  ABSENCE_VALIDATED: "Absence validée",
  ABSENCE_REJECTED: "Absence rejetée",
  PENALTY_APPROVED: "Pénalité approuvée",
  PENALTY_REJECTED: "Pénalité rejetée",
  PENALTY_CANCELLED: "Pénalité annulée",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function actionIcon(action: string): string {
  if (action.includes("SHOP")) return "🏪";
  if (action.includes("WORKER")) return "👤";
  if (action.includes("ATTENDANCE")) return "⏰";
  if (action.includes("ABSENCE")) return "📋";
  if (action.includes("PENALTY")) return "💰";
  return "📝";
}

function metaLabel(meta: any): string {
  if (!meta) return "";
  if (meta.employeeNumber) return meta.employeeNumber;
  if (meta.name && meta.code) return `${meta.name} (${meta.code})`;
  if (meta.name) return meta.name;
  if (meta.email) return meta.email;
  if (meta.dayOfWeek) return meta.dayOfWeek;
  if (meta.amount !== undefined) return `${meta.amount} FCFA`;
  return "";
}
