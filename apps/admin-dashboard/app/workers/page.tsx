"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Users as UsersIcon, RotateCcw, Fingerprint, Camera } from "lucide-react";
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

interface Worker {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  position?: string;
  pinHash?: string | null;
  pinSetAt?: string | null;
  facePhoto?: string | null;
  facePhotoSetAt?: string | null;
  status: string;
  shop?: { id: string; name: string } | null;
}

interface PaginatedResult {
  data: Worker[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const EMPTY_FORM = { employeeNumber: "", firstName: "", lastName: "", position: "", phone: "", email: "", shopId: "" };

export default function WorkersPage() {
  const router = useRouter();
  const [result, setResult] = useState<PaginatedResult | null>(null);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterShop, setFilterShop] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Worker | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState("");
  const [pinTarget, setPinTarget] = useState<Worker | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [faceTarget, setFaceTarget] = useState<Worker | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.workers.list({
        search: search || undefined,
        shopId: filterShop || undefined,
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
  }, [search, filterShop, filterStatus, page, sortBy, sortOrder]);

  useEffect(() => {
    api.shops.list({ limit: 200 }).then(({ data }) => setShops(data.data ?? data));
  }, []);

  useEffect(() => {
    load();
    return () => {};
  }, [load]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterShop]);

  function handleSort(field: string, order: "asc" | "desc") {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setFilterStatus("");
    setFilterShop("");
    setPage(1);
  }

  const hasFilters = search || filterStatus || filterShop;

  async function handleCreate() {
    setSaving(true);
    try {
      await api.workers.create(form);
      toast("Travailleur créé avec succès.", "success");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur lors de la création.", "error");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(w: Worker) {
    setEditId(w.id);
    setForm({
      employeeNumber: w.employeeNumber,
      firstName: w.firstName,
      lastName: w.lastName,
      position: w.position ?? "",
      phone: (w as any).phone ?? "",
      email: (w as any).email ?? "",
      shopId: w.shop?.id ?? "",
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    setSaving(true);
    try {
      await api.workers.update(editId, form);
      toast("Travailleur modifié avec succès.", "success");
      setEditOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur lors de la modification.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setSaving(true);
    try {
      const isActive = deactivateTarget.status === "ACTIVE";
      if (isActive) {
        await api.workers.deactivate(deactivateTarget.id);
        toast("Travailleur désactivé.", "success");
      } else {
        await api.workers.activate(deactivateTarget.id);
        toast("Travailleur réactivé.", "success");
      }
      setDeactivateTarget(null);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetPin() {
    if (!pinTarget) return;
    setSaving(true);
    try {
      await api.workers.setPin(pinTarget.id, pinValue);
      toast("Mot de passe défini avec succès.", "success");
      setPinTarget(null);
      setPinValue("");
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPin(w: Worker) {
    setSaving(true);
    try {
      await api.workers.resetPin(w.id);
      toast("Mot de passe réinitialisé.", "success");
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function openCamera() {
    setCameraActive(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast("Impossible d'accéder à la caméra.", "error");
      setCameraActive(false);
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0, 300, 300);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function handleSaveFacePhoto() {
    if (!faceTarget || !capturedPhoto) return;
    setSaving(true);
    try {
      await api.workers.setFacePhoto(faceTarget.id, capturedPhoto);
      toast("Photo faciale enregistrée.", "success");
      setFaceTarget(null);
      setCapturedPhoto(null);
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveFacePhoto(w: Worker) {
    setSaving(true);
    try {
      await api.workers.removeFacePhoto(w.id);
      toast("Photo faciale supprimée.", "success");
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally {
      setSaving(false);
    }
  }

  const workers = result?.data ?? [];

  return (
    <AppShell title="Travailleurs">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap items-end gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-36">
            <option value="">Tous statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
          </Select>
          <Select value={filterShop} onChange={(e) => setFilterShop(e.target.value)} className="w-40">
            <option value="">Tous shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
          <Plus className="h-4 w-4" /> Nouveau
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : workers.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-10 w-10" />}
              message={hasFilters ? `Aucun résultat pour "${search || "ces filtres"}"` : "Aucun travailleur enregistré."}
              onReset={hasFilters ? resetFilters : undefined}
              actionLabel={!hasFilters ? "Ajouter un travailleur" : undefined}
              onAction={!hasFilters ? () => setCreateOpen(true) : undefined}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Matricule" field="employeeNumber" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <SortableHead label="Nom" field="lastName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead>Poste</TableHead>
                    <TableHead>Shop</TableHead>
                    <SortableHead label="Statut" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead className="text-center">MDP</TableHead>
                    <TableHead className="text-center">Face ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{w.employeeNumber}</TableCell>
                      <TableCell>
                        <Link href={`/workers/${w.id}`} className="font-medium hover:underline">
                          {w.firstName} {w.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{w.position ?? "—"}</TableCell>
                      <TableCell>{w.shop?.name ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-center">
                        {w.pinHash ? (
                          <span title="Mot de passe défini" className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <Fingerprint className="h-3.5 w-3.5" /> OK
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non défini</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {w.facePhoto ? (
                          <span title="Photo enregistrée" className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <Camera className="h-3.5 w-3.5" /> OK
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Non défini</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ActionButtons
                          onView={() => router.push(`/workers/${w.id}`)}
                          onEdit={() => openEdit(w)}
                          onDeactivate={w.status === "ACTIVE" ? () => setDeactivateTarget(w) : undefined}
                          onActivate={w.status !== "ACTIVE" ? () => setDeactivateTarget(w) : undefined}
                        />
                        <button
                          onClick={() => { setPinTarget(w); setPinValue(""); }}
                          title={w.pinHash ? "Changer le mot de passe" : "Définir le mot de passe"}
                          className="ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Fingerprint className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setFaceTarget(w); setCapturedPhoto(null); }}
                          title={w.facePhoto ? "Changer la photo faciale" : "Capturer la photo faciale"}
                          className="ml-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result && (
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  total={result.total}
                  limit={result.limit}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un travailleur">
        <WorkerForm form={form} setForm={setForm} shops={shops} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} saving={saving} submitLabel="Créer" />
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le travailleur">
        <WorkerForm form={form} setForm={setForm} shops={shops} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} saving={saving} submitLabel="Enregistrer" />
      </Modal>

      {/* Deactivate/Activate confirm */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={saving}
        title={deactivateTarget?.status === "ACTIVE" ? "Désactiver le travailleur" : "Réactiver le travailleur"}
        message={
          deactivateTarget?.status === "ACTIVE"
            ? `Êtes-vous sûr de vouloir désactiver ${deactivateTarget?.firstName} ${deactivateTarget?.lastName} ?`
            : `Êtes-vous sûr de vouloir réactiver ${deactivateTarget?.firstName} ${deactivateTarget?.lastName} ?`
        }
        confirmLabel={deactivateTarget?.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
        variant={deactivateTarget?.status === "ACTIVE" ? "destructive" : "default"}
      />

      {/* PIN modal */}
      <Modal open={!!pinTarget} onClose={() => setPinTarget(null)} title={`Mot de passe — ${pinTarget?.firstName} ${pinTarget?.lastName}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Matricule : <span className="font-mono font-medium">{pinTarget?.employeeNumber}</span>
          </p>
          {pinTarget?.pinHash && (
            <p className="text-xs text-green-600">Un mot de passe est actuellement défini. Vous pouvez le remplacer.</p>
          )}
          <div className="space-y-1.5">
            <Label>Nouveau mot de passe (min. 4 caractères)</Label>
            <Input
              type="password"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder="••••••"
              autoFocus
            />
          </div>
          <div className="flex justify-between pt-2">
            <div>
              {pinTarget?.pinHash && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (pinTarget) handleResetPin(pinTarget);
                    setPinTarget(null);
                  }}
                  className="text-destructive"
                >
                  Supprimer le mot de passe
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPinTarget(null)}>Annuler</Button>
              <Button onClick={handleSetPin} disabled={saving || pinValue.length < 4}>
                {saving ? "Enregistrement..." : "Définir"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Face photo modal */}
      <Modal open={!!faceTarget} onClose={() => { setFaceTarget(null); stopCamera(); }} title={`Face ID — ${faceTarget?.firstName} ${faceTarget?.lastName}`} className="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Matricule : <span className="font-mono font-medium">{faceTarget?.employeeNumber}</span>
          </p>

          {faceTarget?.facePhoto && !capturedPhoto && !cameraActive && (
            <div className="text-center">
              <p className="mb-2 text-xs text-green-600">Photo actuelle :</p>
              <img src={faceTarget.facePhoto} alt="Face" className="mx-auto h-40 w-40 rounded-lg object-cover border border-border" />
            </div>
          )}

          {cameraActive && (
            <div className="text-center">
              <video ref={videoRef} className="mx-auto h-60 w-60 rounded-lg object-cover border-2 border-primary" autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <div className="mt-3 flex justify-center gap-2">
                <Button onClick={capturePhoto}>Capturer</Button>
                <Button variant="outline" onClick={stopCamera}>Annuler</Button>
              </div>
            </div>
          )}

          {capturedPhoto && (
            <div className="text-center">
              <p className="mb-2 text-xs text-muted-foreground">Nouvelle photo :</p>
              <img src={capturedPhoto} alt="Captured" className="mx-auto h-40 w-40 rounded-lg object-cover border-2 border-green-500" />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <div className="flex gap-2">
              {!cameraActive && (
                <Button variant="outline" size="sm" onClick={openCamera}>
                  <Camera className="h-3.5 w-3.5" /> {capturedPhoto ? "Reprendre" : "Ouvrir la caméra"}
                </Button>
              )}
              {faceTarget?.facePhoto && (
                <Button variant="ghost" size="sm" onClick={() => { if (faceTarget) handleRemoveFacePhoto(faceTarget); setFaceTarget(null); }} className="text-destructive">
                  Supprimer la photo
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setFaceTarget(null); stopCamera(); }}>Fermer</Button>
              {capturedPhoto && (
                <Button onClick={handleSaveFacePhoto} disabled={saving}>
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

function WorkerForm({
  form, setForm, shops, onSubmit, onCancel, saving, submitLabel,
}: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  shops: { id: string; name: string }[];
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="employeeNumber">Matricule *</Label>
        <Input id="employeeNumber" value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Nom *</Label>
          <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="position">Poste</Label>
        <Input id="position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shopId">Shop</Label>
        <Select id="shopId" value={form.shopId} onChange={(e) => setForm({ ...form, shopId: e.target.value })}>
          <option value="">— Sélectionner —</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>{shop.name}</option>
          ))}
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={onSubmit} disabled={saving || !form.employeeNumber || !form.firstName || !form.lastName}>
          {saving ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
