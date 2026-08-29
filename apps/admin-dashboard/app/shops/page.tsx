"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Store as StoreIcon, RotateCcw } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SortableHead } from "@/components/ui/sortable-head";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

interface Shop {
  id: string;
  name: string;
  code: string;
  city?: string;
  address?: string;
  status: string;
  manager?: { email: string } | null;
  _count?: { workers: number };
}

const EMPTY_FORM = { name: "", code: "", city: "", address: "" };

export default function ShopsPage() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [toggleTarget, setToggleTarget] = useState<Shop | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.shops.list({
        search: search || undefined,
        status: filterStatus || undefined,
        page,
        limit: 15,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, page, sortBy, sortOrder]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [search, filterStatus]);

  function handleSort(field: string, order: "asc" | "desc") {
    setSortBy(field); setSortOrder(order); setPage(1);
  }

  function resetFilters() { setSearch(""); setFilterStatus(""); setPage(1); }
  const hasFilters = search || filterStatus;

  async function handleCreate() {
    setSaving(true);
    try {
      await api.shops.create(form);
      toast("Shop créé avec succès.", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  function openEdit(s: Shop) {
    setEditId(s.id);
    setForm({ name: s.name, code: s.code, city: s.city ?? "", address: s.address ?? "" });
    setEditOpen(true);
  }

  async function handleEdit() {
    setSaving(true);
    try {
      await api.shops.update(editId, form);
      toast("Shop modifié avec succès.", "success");
      setEditOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    setSaving(true);
    try {
      if (toggleTarget.status === "ACTIVE") {
        await api.shops.deactivate(toggleTarget.id);
        toast("Shop désactivé.", "success");
      } else {
        await api.shops.activate(toggleTarget.id);
        toast("Shop réactivé.", "success");
      }
      setToggleTarget(null);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  const shops: Shop[] = result?.data ?? [];

  return (
    <AppShell title="Shops">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-36">
            <option value="">Tous statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Nouveau shop
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : shops.length === 0 ? (
            <EmptyState
              icon={<StoreIcon className="h-10 w-10" />}
              message={hasFilters ? "Aucun résultat pour ces filtres." : "Aucun shop enregistré."}
              onReset={hasFilters ? resetFilters : undefined}
              actionLabel={!hasFilters ? "Créer un shop" : undefined}
              onAction={!hasFilters ? () => setCreateOpen(true) : undefined}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Nom" field="name" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <SortableHead label="Code" field="code" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <SortableHead label="Ville" field="city" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead>Gérant</TableHead>
                    <TableHead>Employés</TableHead>
                    <SortableHead label="Statut" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shops.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/shops/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{s.code}</TableCell>
                      <TableCell>{s.city ?? "—"}</TableCell>
                      <TableCell className="text-xs">{s.manager?.email ?? "—"}</TableCell>
                      <TableCell>{s._count?.workers ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        <ActionButtons
                          onView={() => router.push(`/shops/${s.id}`)}
                          onEdit={() => openEdit(s)}
                          onDeactivate={s.status === "ACTIVE" ? () => setToggleTarget(s) : undefined}
                          onActivate={s.status !== "ACTIVE" ? () => setToggleTarget(s) : undefined}
                        />
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un shop">
        <ShopForm form={form} setForm={setForm} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} saving={saving} label="Créer" />
      </Modal>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le shop">
        <ShopForm form={form} setForm={setForm} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} saving={saving} label="Enregistrer" />
      </Modal>
      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        loading={saving}
        title={toggleTarget?.status === "ACTIVE" ? "Désactiver le shop" : "Réactiver le shop"}
        message={`Êtes-vous sûr de vouloir ${toggleTarget?.status === "ACTIVE" ? "désactiver" : "réactiver"} « ${toggleTarget?.name} » ?`}
        confirmLabel={toggleTarget?.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
        variant={toggleTarget?.status === "ACTIVE" ? "destructive" : "default"}
      />
    </AppShell>
  );
}

function ShopForm({ form, setForm, onSubmit, onCancel, saving, label }: any) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e: any) => setForm({ ...form, code: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Ville</Label><Input value={form.city} onChange={(e: any) => setForm({ ...form, city: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Adresse</Label><Input value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={onSubmit} disabled={saving || !form.name || !form.code}>{saving ? "Enregistrement..." : label}</Button>
      </div>
    </div>
  );
}
