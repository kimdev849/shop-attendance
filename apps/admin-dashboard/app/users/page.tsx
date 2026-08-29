"use client";

import { useCallback, useEffect, useState } from "react";
import { UserCog, Plus, Search, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { ActionButtons } from "@/components/ui/action-buttons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  SHOP_MANAGER: "Gérant de shop",
  WORKER: "Travailleur",
};

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "warning"> = {
  ADMIN: "default",
  SHOP_MANAGER: "warning",
  WORKER: "secondary",
};

const EMPTY_FORM = { email: "", password: "", role: "SHOP_MANAGER" };

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ email: "", role: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.users.list({
        search: search || undefined,
        role: filterRole || undefined,
        page,
        limit: 15,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, page]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [search, filterRole]);

  function resetFilters() { setSearch(""); setFilterRole(""); setPage(1); }
  const hasFilters = search || filterRole;

  async function handleCreate() {
    setSaving(true);
    try {
      await api.users.create(form);
      toast("Utilisateur créé avec succès.", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur lors de la création.", "error");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(u: User) {
    setEditId(u.id);
    setEditForm({ email: u.email, role: u.role });
    setEditOpen(true);
  }

  async function handleEdit() {
    setSaving(true);
    try {
      await api.users.update(editId, editForm);
      toast("Utilisateur modifié avec succès.", "success");
      setEditOpen(false);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!toggleTarget) return;
    setSaving(true);
    try {
      if (toggleTarget.isActive) {
        await api.users.deactivate(toggleTarget.id);
        toast("Utilisateur désactivé.", "success");
      } else {
        await api.users.activate(toggleTarget.id);
        toast("Utilisateur réactivé.", "success");
      }
      setToggleTarget(null);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setSaving(false);
    }
  }

  const users: User[] = result?.data ?? [];

  return (
    <AppShell title="Utilisateurs">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher par email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-44">
            <option value="">Tous les rôles</option>
            <option value="ADMIN">Administrateur</option>
            <option value="SHOP_MANAGER">Gérant de shop</option>
            <option value="WORKER">Travailleur</option>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : users.length === 0 ? (
            <EmptyState
              icon={<UserCog className="h-10 w-10" />}
              message={hasFilters ? "Aucun utilisateur pour ces filtres." : "Aucun utilisateur enregistré."}
              onReset={hasFilters ? resetFilters : undefined}
              actionLabel={!hasFilters ? "Créer un utilisateur" : undefined}
              onAction={!hasFilters ? () => setCreateOpen(true) : undefined}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email}
                          {isSelf && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ROLE_VARIANTS[u.role] ?? "secondary"}>
                            {ROLE_LABELS[u.role] ?? u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? "success" : "secondary"}>
                            {u.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                        <TableCell>
                          <ActionButtons
                            onEdit={!isSelf ? () => openEdit(u) : undefined}
                            onDeactivate={!isSelf && u.isActive ? () => setToggleTarget(u) : undefined}
                            onActivate={!isSelf && !u.isActive ? () => setToggleTarget(u) : undefined}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {result && (
                <Pagination page={result.page} totalPages={result.totalPages} total={result.total} limit={result.limit} onPageChange={setPage} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un utilisateur">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@shopattendance.local" />
          </div>
          <div className="space-y-1.5">
            <Label>Mot de passe * (min. 8 caractères)</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          <div className="space-y-1.5">
            <Label>Rôle *</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">Administrateur</option>
              <option value="SHOP_MANAGER">Gérant de shop</option>
              <option value="WORKER">Travailleur</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !form.email || form.password.length < 8}>
              {saving ? "Création..." : "Créer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier l'utilisateur">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Rôle</Label>
            <Select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="ADMIN">Administrateur</option>
              <option value="SHOP_MANAGER">Gérant de shop</option>
              <option value="WORKER">Travailleur</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={saving || !editForm.email}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toggle confirm */}
      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        loading={saving}
        title={toggleTarget?.isActive ? "Désactiver l'utilisateur" : "Réactiver l'utilisateur"}
        message={`Êtes-vous sûr de vouloir ${toggleTarget?.isActive ? "désactiver" : "réactiver"} ${toggleTarget?.email} ? ${toggleTarget?.isActive ? "Il ne pourra plus se connecter." : ""}`}
        confirmLabel={toggleTarget?.isActive ? "Désactiver" : "Réactiver"}
        variant={toggleTarget?.isActive ? "destructive" : "default"}
      />
    </AppShell>
  );
}
