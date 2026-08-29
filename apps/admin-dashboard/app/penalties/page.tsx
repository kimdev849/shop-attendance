"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Check, X, Ban, Search, RotateCcw } from "lucide-react";
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
import { SortableHead } from "@/components/ui/sortable-head";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatDate, formatFcfa } from "@/lib/utils";

export default function PenaltiesPage() {
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ id: string; action: "approve" | "reject" | "cancel"; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await api.penalties.list({
      search: search || undefined,
      status: status || undefined,
      page,
      limit: 20,
      sortBy: sortBy || undefined,
      sortOrder: sortBy ? sortOrder : undefined,
    });
    setResult(data);
    setLoading(false);
  }, [search, status, page, sortBy, sortOrder]);

  useEffect(() => {
    load();
    return () => {};
  }, [load]);

  useEffect(() => { setPage(1); }, [search, status]);

  function handleSort(field: string, order: "asc" | "desc") {
    setSortBy(field); setSortOrder(order); setPage(1);
  }
  function resetFilters() { setSearch(""); setStatus(""); setPage(1); }
  const hasFilters = search || status;

  const actionLabels = { approve: "Approuver", reject: "Rejeter", cancel: "Annuler" };

  async function handleAction() {
    if (!actionTarget) return;
    setSaving(true);
    try {
      await api.penalties[actionTarget.action](actionTarget.id);
      toast(`Pénalité ${actionTarget.action === "approve" ? "approuvée" : actionTarget.action === "reject" ? "rejetée" : "annulée"}.`, "success");
      setActionTarget(null);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  const penalties = result?.data ?? [];

  return (
    <AppShell title="Pénalités">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un travailleur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Statut</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">Tous</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Approuvées</option>
            <option value="REJECTED">Rejetées</option>
            <option value="CANCELLED">Annulées</option>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" /> Réinitialiser</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={8} columns={7} />
          ) : penalties.length === 0 ? (
            <EmptyState icon={<Banknote className="h-10 w-10" />} message="Aucune pénalité trouvée." onReset={hasFilters ? resetFilters : undefined} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Travailleur</TableHead>
                    <SortableHead label="Date" field="createdAt" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead>Retard</TableHead>
                    <SortableHead label="Montant" field="amount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead>Motif</TableHead>
                    <SortableHead label="Statut" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penalties.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.worker.firstName} {p.worker.lastName}</TableCell>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell>{p.attendance?.latenessMinutes ?? "—"} min</TableCell>
                      <TableCell className="font-medium">{formatFcfa(p.amount)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{p.reason}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="text-right">
                        {p.status === "PENDING" && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setActionTarget({ id: p.id, action: "approve", name: `${p.worker.firstName} ${p.worker.lastName}` })}>
                              <Check className="h-3.5 w-3.5" /> Valider
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setActionTarget({ id: p.id, action: "reject", name: `${p.worker.firstName} ${p.worker.lastName}` })}>
                              <X className="h-3.5 w-3.5" /> Rejeter
                            </Button>
                          </div>
                        )}
                        {p.status === "APPROVED" && (
                          <Button size="sm" variant="ghost" onClick={() => setActionTarget({ id: p.id, action: "cancel", name: `${p.worker.firstName} ${p.worker.lastName}` })}>
                            <Ban className="h-3.5 w-3.5" /> Annuler
                          </Button>
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
        title={`${actionLabels[actionTarget?.action ?? "approve"]} la pénalité`}
        message={`Êtes-vous sûr de vouloir ${(actionLabels[actionTarget?.action ?? "approve"]).toLowerCase()} la pénalité de ${actionTarget?.name} ?`}
        confirmLabel={actionLabels[actionTarget?.action ?? "approve"]}
        variant={actionTarget?.action === "approve" ? "default" : "destructive"}
      />
    </AppShell>
  );
}
