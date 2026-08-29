"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, Users, CheckCircle2, Clock, CalendarX, Banknote } from "lucide-react";
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
  href,
}: {
  icon: any;
  label: string;
  value: string | number;
  accent?: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? "transition-shadow hover:shadow-md" : ""}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `hsl(${accent ?? "205 65% 24%"} / 0.12)` }}
        >
          <Icon className="h-5 w-5" style={{ color: `hsl(${accent ?? "205 65% 24%"})` }} />
        </div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between p-5">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-muted-foreground/10" />
                <div className="h-6 w-12 rounded bg-muted-foreground/15" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted-foreground/10" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardContent className="h-64" /></Card>
        <Card><CardContent className="h-64" /></Card>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Store} label="Shops" value={stats.totalShops} accent="205 65% 24%" href="/shops" />
            <StatCard icon={Users} label="Travailleurs" value={stats.totalWorkers} accent="205 65% 24%" href="/workers" />
            <StatCard icon={CheckCircle2} label="Présents (aujourd'hui)" value={stats.presentToday} accent="172 66% 30%" href="/attendance" />
            <StatCard icon={Clock} label="Retards (aujourd'hui)" value={stats.lateToday} accent="38 85% 43%" href="/attendance" />
            <StatCard icon={CalendarX} label="Absents (aujourd'hui)" value={stats.absentToday} accent="0 68% 45%" href="/absences" />
            <StatCard icon={Banknote} label="Pénalités en attente" value={formatFcfa(stats.totalPenaltiesAmountPending)} accent="38 85% 43%" href="/penalties" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Évolution quotidienne (14 derniers jours)</CardTitle></CardHeader>
              <CardContent>
                {trend.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p>
                ) : (
                  <AttendanceTrendChart data={trend} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Répartition par shop (aujourd'hui)</CardTitle></CardHeader>
              <CardContent>
                {shopDistribution.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p>
                ) : (
                  <ShopDistributionChart data={shopDistribution} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dernières activités</CardTitle>
              <Link href="/audit" className="text-xs text-primary hover:underline">Voir tout</Link>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Aucune activité récente.</p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between rounded-md border border-border px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {actionLabel(log.action)}
                        </Badge>
                        <div>
                          <p className="text-xs">
                            <span className="font-medium">{entityLabel(log.entity)}</span>
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

const ENTITY_LABELS: Record<string, string> = {
  Worker: "Travailleur",
  Shop: "Shop",
  Attendance: "Pointage",
  Absence: "Absence",
  Penalty: "Pénalité",
  Schedule: "Horaire",
  Device: "Tablette",
  User: "Utilisateur",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

/** Extrait un label lisible depuis les metadata, jamais d'UUID. */
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
