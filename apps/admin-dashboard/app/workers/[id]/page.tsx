"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Phone, Mail, Store, ArrowLeft, Pencil, Power, PowerOff } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatDate, formatTime, formatFcfa, initials } from "@/lib/utils";

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "ADMIN";
  const [worker, setWorker] = useState<any>(null);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeNumber: "", firstName: "", lastName: "", phone: "", email: "", position: "", shopId: "" });
  const { toast } = useToast();

  async function load() {
    const { data } = await api.workers.get(id);
    setWorker(data);
    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    load();
    api.shops.list({ limit: 200 }).then(({ data }) => setShops(data.data ?? data));
  }, [id]);

  function openEdit() {
    if (!worker) return;
    setForm({
      employeeNumber: worker.employeeNumber,
      firstName: worker.firstName,
      lastName: worker.lastName,
      phone: worker.phone ?? "",
      email: worker.email ?? "",
      position: worker.position ?? "",
      shopId: worker.shop?.id ?? worker.shopId ?? "",
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    setSaving(true);
    try {
      await api.workers.update(id, form);
      toast("Travailleur modifié avec succès.", "success");
      setEditOpen(false);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  async function handleToggle() {
    if (!worker) return;
    setSaving(true);
    try {
      if (worker.status === "ACTIVE") {
        await api.workers.deactivate(id);
        toast("Travailleur désactivé.", "success");
      } else {
        await api.workers.activate(id);
        toast("Travailleur réactivé.", "success");
      }
      setToggleOpen(false);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  if (loading || !worker) {
    return (
      <AppShell title="Travailleur">
        <TableSkeleton rows={4} columns={3} />
      </AppShell>
    );
  }

  return (
    <AppShell title={`${worker.firstName} ${worker.lastName}`}>
      {/* Header bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workers")} title="Retour">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
            {initials(worker.firstName, worker.lastName)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{worker.firstName} {worker.lastName}</h2>
              <StatusBadge status={worker.status} />
            </div>
            <p className="font-mono text-xs text-muted-foreground">{worker.employeeNumber}</p>
          </div>
        </div>
        {(isAdmin || authUser?.role === "SHOP_MANAGER") && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </Button>
            {worker.status === "ACTIVE" ? (
              <Button variant="ghost" size="sm" onClick={() => setToggleOpen(true)}>
                <PowerOff className="h-3.5 w-3.5" /> Désactiver
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setToggleOpen(true)}>
                <Power className="h-3.5 w-3.5" /> Réactiver
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoRow icon={Store} label="Shop" value={worker.shop?.name ?? "Non affecté"} />
        <InfoRow icon={Phone} label="Téléphone" value={worker.phone ?? "—"} />
        <InfoRow icon={Mail} label="Email" value={worker.email ?? "—"} />
      </div>

      {/* Data tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Horaires</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jour</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Tolérance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worker.schedules?.length ? (
                  worker.schedules.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.dayOfWeek}</TableCell>
                      <TableCell>{s.startTime}</TableCell>
                      <TableCell>{s.endTime}</TableCell>
                      <TableCell>{s.toleranceMinutes} min</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Aucun horaire configuré.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Historique des pointages</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Retard</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worker.attendances?.length ? (
                  worker.attendances.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.attendanceDate)}</TableCell>
                      <TableCell>{formatTime(a.checkInTime)}</TableCell>
                      <TableCell>{a.latenessMinutes > 0 ? `${a.latenessMinutes} min` : "—"}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Aucun pointage enregistré.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Absences</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Motif</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {worker.absences?.length ? worker.absences.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell>{a.reason ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune absence enregistrée.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pénalités</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {worker.penalties?.length ? worker.penalties.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.createdAt)}</TableCell>
                    <TableCell>{formatFcfa(p.amount)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune pénalité enregistrée.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le travailleur">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Matricule *</Label><Input value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Prénom *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Poste</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Shop</Label>
            <Select value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={saving || !form.employeeNumber || !form.firstName || !form.lastName}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toggle confirm */}
      <ConfirmDialog
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={handleToggle}
        loading={saving}
        title={worker.status === "ACTIVE" ? "Désactiver le travailleur" : "Réactiver le travailleur"}
        message={`Êtes-vous sûr de vouloir ${worker.status === "ACTIVE" ? "désactiver" : "réactiver"} ${worker.firstName} ${worker.lastName} ?`}
        confirmLabel={worker.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
        variant={worker.status === "ACTIVE" ? "destructive" : "default"}
      />
    </AppShell>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
