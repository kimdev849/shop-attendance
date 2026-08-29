"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, CheckCircle2, Clock, CalendarX, Banknote, Tablet, ArrowLeft, Pencil, Power, PowerOff } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatFcfa, formatDateTime } from "@/lib/utils";

export default function ShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "ADMIN";
  const [shop, setShop] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", city: "", address: "" });
  const { toast } = useToast();

  async function load() {
    const [shopRes, statsRes] = await Promise.all([api.shops.get(id), api.shops.stats(id)]);
    setShop(shopRes.data);
    setStats(statsRes.data);
    setLoading(false);
  }

  useEffect(() => {
    if (!id) return;
    load();
  }, [id]);

  function openEdit() {
    if (!shop) return;
    setForm({ name: shop.name, code: shop.code, city: shop.city ?? "", address: shop.address ?? "" });
    setEditOpen(true);
  }

  async function handleEdit() {
    setSaving(true);
    try {
      await api.shops.update(id, form);
      toast("Shop modifié avec succès.", "success");
      setEditOpen(false);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  async function handleToggle() {
    if (!shop) return;
    setSaving(true);
    try {
      if (shop.status === "ACTIVE") {
        await api.shops.deactivate(id);
        toast("Shop désactivé.", "success");
      } else {
        await api.shops.activate(id);
        toast("Shop réactivé.", "success");
      }
      setToggleOpen(false);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  if (loading || !shop) {
    return (
      <AppShell title="Shop">
        <TableSkeleton rows={3} columns={3} />
      </AppShell>
    );
  }

  return (
    <AppShell title={shop.name}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/shops")} title="Retour">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{shop.name}</h2>
              <StatusBadge status={shop.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {shop.code}
              {shop.city && ` · ${shop.city}`}
              {shop.address && ` · ${shop.address}`}
            </p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </Button>
            {shop.status === "ACTIVE" ? (
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatBlock icon={Users} label="Travailleurs" value={stats.totalWorkers} />
          <StatBlock icon={CheckCircle2} label="Présents" value={stats.presentToday} />
          <StatBlock icon={Clock} label="Retards" value={stats.lateToday} />
          <StatBlock icon={CalendarX} label="Absents" value={stats.absentToday} />
          <StatBlock icon={Banknote} label="Pénalités en attente" value={formatFcfa(stats.pendingPenaltiesAmount)} />
        </div>
      )}

      {/* Devices */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tablet className="h-4 w-4" /> Tablettes de ce shop
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.devices?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tablette enregistrée pour ce shop.</p>
          ) : (
            <div className="space-y-2">
              {stats?.devices?.map((device: any) => (
                <div key={device.id} className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.lastSyncAt ? `Dernière synchro: ${formatDateTime(device.lastSyncAt)}` : "Jamais synchronisée"}
                    </p>
                  </div>
                  <StatusBadge status={device.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le shop">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={saving || !form.name || !form.code}>{saving ? "Enregistrement..." : "Enregistrer"}</Button>
          </div>
        </div>
      </Modal>

      {/* Toggle confirm */}
      <ConfirmDialog
        open={toggleOpen}
        onClose={() => setToggleOpen(false)}
        onConfirm={handleToggle}
        loading={saving}
        title={shop.status === "ACTIVE" ? "Désactiver le shop" : "Réactiver le shop"}
        message={`Êtes-vous sûr de vouloir ${shop.status === "ACTIVE" ? "désactiver" : "réactiver"} « ${shop.name} » ?`}
        confirmLabel={shop.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
        variant={shop.status === "ACTIVE" ? "destructive" : "default"}
      />
    </AppShell>
  );
}

function StatBlock({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
