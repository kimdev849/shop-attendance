"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Search, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { id: string; email: string; role: string } | null;
}

const ENTITY_OPTIONS = ["Worker", "Shop", "Attendance", "Absence", "Penalty", "Schedule", "Device", "User"];

const ACTION_LABELS: Record<string, string> = {
  WORKER_CREATED: "Travailleur créé",
  WORKER_UPDATED: "Travailleur modifié",
  WORKER_STATUS_ACTIVE: "Travailleur activé",
  WORKER_STATUS_INACTIVE: "Travailleur désactivé",
  WORKER_STATUS_SUSPENDED: "Travailleur suspendu",
  WORKER_SCHEDULE_ASSIGNED: "Horaire affecté",
  SHOP_CREATED: "Shop créé",
  SHOP_UPDATED: "Shop modifié",
  SHOP_ACTIVATED: "Shop activé",
  SHOP_DEACTIVATED: "Shop désactivé",
  ATTENDANCE_CHECK_IN: "Pointage enregistré",
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

const ACTION_COLORS: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  CREATED: "success",
  UPDATED: "warning",
  DELETED: "destructive",
  ACTIVATED: "success",
  ACTIVE: "success",
  DEACTIVATED: "secondary",
  INACTIVE: "secondary",
  APPROVED: "success",
  VALIDATED: "success",
  REJECTED: "destructive",
  CANCELLED: "secondary",
  CHECK_IN: "success",
  ASSIGNED: "warning",
  SUSPENDED: "destructive",
};

function actionVariant(action: string): "success" | "warning" | "destructive" | "secondary" {
  for (const [key, variant] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return variant;
  }
  return "secondary";
}

/**
 * Extrait un résumé lisible des metadata — sans jamais afficher d'UUID.
 * Les metadata contiennent souvent : employeeNumber, name, code, dayOfWeek, amount, etc.
 */
function summarizeMetadata(meta: Record<string, unknown> | null | undefined): string {
  if (!meta || Object.keys(meta).length === 0) return "";

  const parts: string[] = [];

  // Champs lisibles connus
  if (meta.employeeNumber) parts.push(`Matricule: ${meta.employeeNumber}`);
  if (meta.name) parts.push(`${meta.name}`);
  if (meta.code) parts.push(`Code: ${meta.code}`);
  if (meta.dayOfWeek) parts.push(`${meta.dayOfWeek}`);
  if (meta.amount !== undefined) parts.push(`${meta.amount} FCFA`);
  if (meta.status) parts.push(`Statut: ${meta.status}`);
  if (meta.firstName) parts.push(`${meta.firstName}${meta.lastName ? ` ${meta.lastName}` : ""}`);
  if (!meta.firstName && meta.lastName) parts.push(`${meta.lastName}`);
  if (meta.email) parts.push(`${meta.email}`);
  if (meta.position) parts.push(`Poste: ${meta.position}`);
  if (meta.phone) parts.push(`Tél: ${meta.phone}`);
  if (meta.latenessMinutes !== undefined) parts.push(`Retard: ${meta.latenessMinutes} min`);

  if (parts.length > 0) return parts.join(" · ");

  // Fallback : afficher les valeurs non-UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const safeEntries = Object.entries(meta)
    .filter(([, v]) => typeof v !== "object" && !uuidPattern.test(String(v)))
    .slice(0, 3);

  if (safeEntries.length === 0) return "";
  return safeEntries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

/**
 * Tente d'afficher un identifiant lisible pour l'entité ciblée,
 * à partir des metadata (qui contiennent souvent le nom/matricule/code).
 * Ne jamais afficher d'UUID brut.
 */
function entityDisplay(log: AuditLog): string {
  const label = ENTITY_LABELS[log.entity] ?? log.entity;
  const meta = log.metadata;
  if (!meta) return label;

  // Chercher un identifiant lisible dans les metadata
  if (meta.employeeNumber) return `${label} — ${meta.employeeNumber}`;
  if (meta.name && meta.code) return `${label} — ${meta.name} (${meta.code})`;
  if (meta.name) return `${label} — ${meta.name}`;
  if (meta.code) return `${label} — ${meta.code}`;
  if (meta.email) return `${label} — ${meta.email}`;

  return label;
}

export default function AuditPage() {
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.auditLogs.list({
        action: search || undefined,
        entity: filterEntity || undefined,
        page,
        limit: 30,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [search, filterEntity, page]);

  useEffect(() => {
    load();
    return () => {};
  }, [load]);

  useEffect(() => { setPage(1); }, [search, filterEntity]);

  function resetFilters() { setSearch(""); setFilterEntity(""); setPage(1); }
  const hasFilters = search || filterEntity;

  const logs: AuditLog[] = result?.data ?? [];

  return (
    <AppShell title="Historique des actions">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Filtrer par action..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Entité</Label>
          <Select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className="w-40">
            <option value="">Toutes</option>
            {ENTITY_OPTIONS.map((e) => (
              <option key={e} value={e}>{ENTITY_LABELS[e] ?? e}</option>
            ))}
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={12} columns={5} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-10 w-10" />}
              message={hasFilters ? "Aucun log pour ces filtres." : "Aucune action enregistrée."}
              onReset={hasFilters ? resetFilters : undefined}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Élément</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.user?.email ?? <span className="italic text-muted-foreground">Système</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionVariant(log.action)} className="text-[10px]">
                          {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {entityDisplay(log)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-[11px] text-muted-foreground">
                        {summarizeMetadata(log.metadata)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result && (
                <Pagination page={result.page} totalPages={result.totalPages} total={result.total} limit={result.limit} onPageChange={setPage} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
