"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarX, Check, X, Search, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function AbsencesPage() {
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ id: string; action: "validate" | "reject"; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.absences.list({
      search: search || undefined,
      status: status || undefined,
      page,
      limit: 20,
    });
    setResult(data);
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => {
    load();
    return () => {};
  }, [load]);

  useEffect(() => { setPage(1); }, [search, status]);

  function resetFilters() { setSearch(""); setStatus(""); setPage(1); }
  const hasFilters = search || status;

  async function handleAction() {
    if (!actionTarget) return;
    setSaving(true);
    try {
      if (actionTarget.action === "validate") {
        await api.absences.validate(actionTarget.id);
        toast("Absence validée.", "success");
      } else {
        await api.absences.reject(actionTarget.id);
        toast("Absence rejetée.", "success");
      }
      setActionTarget(null);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  const absences = result?.data ?? [];

  return (
    <AppShell title="Absences">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un travailleur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Statut</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="VALIDATED">Validées</option>
            <option value="REJECTED">Rejetées</option>
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
            <TableSkeleton rows={8} columns={7} />
          ) : absences.length === 0 ? (
            <EmptyState icon={<CalendarX className="h-10 w-10" />} message="Aucune absence trouvée." onReset={hasFilters ? resetFilters : undefined} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Travailleur</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Validateur</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absences.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.worker.firstName} {a.worker.lastName}</TableCell>
                      <TableCell>{a.shop.name}</TableCell>
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs">{a.reason ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.validator?.email ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {a.status === "PENDING" && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setActionTarget({ id: a.id, action: "validate", name: `${a.worker.firstName} ${a.worker.lastName}` })}>
                              <Check className="h-3.5 w-3.5" /> Valider
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setActionTarget({ id: a.id, action: "reject", name: `${a.worker.firstName} ${a.worker.lastName}` })}>
                              <X className="h-3.5 w-3.5" /> Rejeter
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result && <Pagination page={result.page} totalPages={result.totalPages} total={result.total} limit={result.limit} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleAction}
        loading={saving}
        title={actionTarget?.action === "validate" ? "Valider l'absence" : "Rejeter l'absence"}
        message={`Êtes-vous sûr de vouloir ${actionTarget?.action === "validate" ? "valider" : "rejeter"} l'absence de ${actionTarget?.name} ?`}
        confirmLabel={actionTarget?.action === "validate" ? "Valider" : "Rejeter"}
        variant={actionTarget?.action === "reject" ? "destructive" : "default"}
      />
    </AppShell>
  );
}
