"use client";

import { useCallback, useEffect, useState } from "react";
import { Tablet, AlertTriangle, Plus, Search, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { ActionButtons } from "@/components/ui/action-buttons";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

const EMPTY_FORM = { deviceIdentifier: "", name: "", shopId: "", appVersion: "" };

export default function DevicesPage() {
  const [result, setResult] = useState<any>(null);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterShop, setFilterShop] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    api.shops.list({ limit: 200 }).then(({ data }) => setShops(data.data ?? data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.devices.list({
        search: search || undefined,
        shopId: filterShop || undefined,
        page,
        limit: 15,
      });
      setResult(data);
    } finally { setLoading(false); }
  }, [search, filterShop, page]);

  useEffect(() => {
    load();
    return () => {};
  }, [load]);

  useEffect(() => { setPage(1); }, [search, filterShop]);

  function resetFilters() { setSearch(""); setFilterShop(""); setPage(1); }
  const hasFilters = search || filterShop;

  async function handleCreate() {
    setSaving(true);
    try {
      await api.devices.create(form);
      toast("Tablette enregistrée.", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  function openEdit(d: any) {
    setEditId(d.id);
    setForm({ deviceIdentifier: d.deviceIdentifier, name: d.name, shopId: d.shopId ?? d.shop?.id ?? "", appVersion: d.appVersion ?? "" });
    setEditOpen(true);
  }

  async function handleEdit() {
    setSaving(true);
    try {
      await api.devices.update(editId, { name: form.name, shopId: form.shopId });
      toast("Tablette modifiée.", "success");
      setEditOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  const devices = result?.data ?? [];

  return (
    <AppShell title="Appareils">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterShop} onChange={(e) => setFilterShop(e.target.value)} className="w-40">
            <option value="">Tous shops</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" /> Réinitialiser</Button>
          )}
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Nouvelle tablette
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : devices.length === 0 ? (
            <EmptyState icon={<Tablet className="h-10 w-10" />} message="Aucune tablette enregistrée." onReset={hasFilters ? resetFilters : undefined} actionLabel={!hasFilters ? "Enregistrer une tablette" : undefined} onAction={!hasFilters ? () => setCreateOpen(true) : undefined} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tablette</TableHead>
                    <TableHead>Identifiant</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière synchro</TableHead>
                    <TableHead>Alerte</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{d.deviceIdentifier}</TableCell>
                      <TableCell>{d.shop?.name ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="text-xs">{d.lastSyncAt ? formatDateTime(d.lastSyncAt) : "Jamais"}</TableCell>
                      <TableCell>
                        {d.isStale && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                            <AlertTriangle className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ActionButtons onEdit={() => openEdit(d)} />
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Enregistrer une tablette">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Identifiant matériel *</Label><Input value={form.deviceIdentifier} onChange={(e) => setForm({ ...form, deviceIdentifier: e.target.value })} placeholder="N° de série" /></div>
          <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Tablette Caisse 1" /></div>
          <div className="space-y-1.5"><Label>Shop *</Label>
            <Select value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !form.deviceIdentifier || !form.name || !form.shopId}>{saving ? "Enregistrement..." : "Créer"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier la tablette">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Shop *</Label>
            <Select value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={saving || !form.name || !form.shopId}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
