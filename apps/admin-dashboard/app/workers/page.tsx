"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Users as UsersIcon, RotateCcw, Fingerprint, Camera, ScanFace } from "lucide-react";
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
import { api, apiClient } from "@/lib/api";
// Face detection loaded dynamically on client only (SSR incompatible)
const loadFaceDetection = () => import("@/lib/face-detection");

interface Worker {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  position?: string;
  pinHash?: string | null;
  facePhoto?: string | null;
  faceDescriptor?: string | null;
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
  const [faceStatus, setFaceStatus] = useState<"idle" | "detecting" | "detected" | "no-face" | "error">("idle");
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
        page, limit: 15,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      });
      setResult(data);
    } finally { setLoading(false); }
  }, [search, filterShop, filterStatus, page, sortBy, sortOrder]);

  useEffect(() => {
    api.shops.list({ limit: 200 }).then(({ data }) => setShops(data.data ?? data));
    // Pre-load face-api models in background (client only)
    if (typeof window !== "undefined") {
      loadFaceDetection().then(m => m.loadFaceModels().catch(() => {}));
    }
  }, []);

  useEffect(() => { const t = setTimeout(() => load(), 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterShop]);

  function handleSort(field: string, order: "asc" | "desc") { setSortBy(field); setSortOrder(order); setPage(1); }
  function resetFilters() { setSearch(""); setFilterStatus(""); setFilterShop(""); setPage(1); }
  const hasFilters = search || filterStatus || filterShop;

  async function handleCreate() {
    setSaving(true);
    try { await api.workers.create(form); toast("Travailleur créé.", "success"); setCreateOpen(false); setForm(EMPTY_FORM); load(); }
    catch (err: any) { toast(err?.response?.data?.message ?? "Erreur.", "error"); }
    finally { setSaving(false); }
  }

  function openEdit(w: Worker) {
    setEditId(w.id);
    setForm({ employeeNumber: w.employeeNumber, firstName: w.firstName, lastName: w.lastName, position: w.position ?? "", phone: (w as any).phone ?? "", email: (w as any).email ?? "", shopId: w.shop?.id ?? "" });
    setEditOpen(true);
  }

  async function handleEdit() {
    setSaving(true);
    try { await api.workers.update(editId, form); toast("Travailleur modifié.", "success"); setEditOpen(false); setForm(EMPTY_FORM); load(); }
    catch (err: any) { toast(err?.response?.data?.message ?? "Erreur.", "error"); }
    finally { setSaving(false); }
  }

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setSaving(true);
    try {
      const isActive = deactivateTarget.status === "ACTIVE";
      if (isActive) { await api.workers.deactivate(deactivateTarget.id); toast("Désactivé.", "success"); }
      else { await api.workers.activate(deactivateTarget.id); toast("Réactivé.", "success"); }
      setDeactivateTarget(null); load();
    } catch (err: any) { toast(err?.response?.data?.message ?? "Erreur.", "error"); }
    finally { setSaving(false); }
  }

  async function handleSetPin() {
    if (!pinTarget) return;
    setSaving(true);
    try { await api.workers.setPin(pinTarget.id, pinValue); toast("MDP défini.", "success"); setPinTarget(null); setPinValue(""); load(); }
    catch (err: any) { toast(err?.response?.data?.message ?? "Erreur.", "error"); }
    finally { setSaving(false); }
  }

  async function handleResetPin(w: Worker) {
    setSaving(true);
    try { await api.workers.resetPin(w.id); toast("MDP réinitialisé.", "success"); load(); }
    catch (err: any) { toast(err?.response?.data?.message ?? "Erreur.", "error"); }
    finally { setSaving(false); }
  }

  async function openCamera() {
    setCameraActive(true);
    setCapturedPhoto(null);
    setFaceStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch { toast("Impossible d'accéder à la caméra.", "error"); setCameraActive(false); }
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0, 300, 300);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();

    // Extract face descriptor
    setFaceStatus("detecting");
    try {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const { extractFaceDescriptor, serializeDescriptor } = await loadFaceDetection();
      const descriptor = await extractFaceDescriptor(img);
      if (descriptor) {
        setFaceStatus("detected");
        // Store descriptor temporarily
        (window as any).__faceDescriptor = serializeDescriptor(descriptor);
      } else {
        setFaceStatus("no-face");
        toast("Aucun visage détecté. Réessayez.", "info");
      }
    } catch {
      setFaceStatus("error");
      toast("Erreur lors de la détection faciale.", "error");
    }
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
      const descriptor = (window as any).__faceDescriptor || null;
      await apiClient.patch(`/v1/workers/${faceTarget.id}/face-photo`, {
        facePhoto: capturedPhoto,
        faceDescriptor: descriptor,
      });
      toast("Photo faciale + descripteur enregistrés.", "success");
      setFaceTarget(null);
      setCapturedPhoto(null);
      setFaceStatus("idle");
      delete (window as any).__faceDescriptor;
      load();
    } catch (err: any) {
      toast(err?.response?.data?.message ?? "Erreur.", "error");
    } finally { setSaving(false); }
  }

  async function handleRemoveFacePhoto(w: Worker) {
    setSaving(true);
    try { await api.workers.removeFacePhoto(w.id); toast("Photo supprimée.", "success"); load(); }
    catch (err: any) { toast(err?.response?.data?.message ?? "Erreur.", "error"); }
    finally { setSaving(false); }
  }

  const workers = result?.data ?? [];

  return (
    <AppShell title="Travailleurs">
      {/* Toolbar */}
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
          <Select value={filterShop} onChange={(e) => setFilterShop(e.target.value)} className="w-40">
            <option value="">Tous shops</option>
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <EmptyState icon={<UsersIcon className="h-10 w-10" />} message={hasFilters ? "Aucun résultat." : "Aucun travailleur."} onReset={hasFilters ? resetFilters : undefined} actionLabel={!hasFilters ? "Ajouter" : undefined} onAction={!hasFilters ? () => setCreateOpen(true) : undefined} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Matricule" field="employeeNumber" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <SortableHead label="Nom" field="lastName" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead className="hidden sm:table-cell">Poste</TableHead>
                    <TableHead className="hidden md:table-cell">Shop</TableHead>
                    <SortableHead label="Statut" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead className="text-center">Face ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{w.employeeNumber}</TableCell>
                      <TableCell>
                        <Link href={`/workers/${w.id}`} className="font-medium hover:underline">{w.firstName} {w.lastName}</Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{w.position ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell">{w.shop?.name ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={w.status} /></TableCell>
                      <TableCell className="text-center">
                        {w.facePhoto ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <ScanFace className="h-3.5 w-3.5" /> {w.faceDescriptor ? "✓" : "📷"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ActionButtons
                            onView={() => router.push(`/workers/${w.id}`)}
                            onEdit={() => openEdit(w)}
                            onDeactivate={w.status === "ACTIVE" ? () => setDeactivateTarget(w) : undefined}
                            onActivate={w.status !== "ACTIVE" ? () => setDeactivateTarget(w) : undefined}
                          />
                          <button onClick={() => { setPinTarget(w); setPinValue(""); }} title="MDP"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Fingerprint className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setFaceTarget(w); setCapturedPhoto(null); setFaceStatus("idle"); }} title="Face ID"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Camera className="h-4 w-4" />
                          </button>
                        </div>
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

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Créer un travailleur">
        <WorkerForm form={form} setForm={setForm} shops={shops} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} saving={saving} submitLabel="Créer" />
      </Modal>

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le travailleur">
        <WorkerForm form={form} setForm={setForm} shops={shops} onSubmit={handleEdit} onCancel={() => setEditOpen(false)} saving={saving} submitLabel="Enregistrer" />
      </Modal>

      {/* Deactivate/Activate confirm */}
      <ConfirmDialog open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} onConfirm={handleDeactivate} loading={saving}
        title={deactivateTarget?.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
        message={`Êtes-vous sûr de vouloir ${deactivateTarget?.status === "ACTIVE" ? "désactiver" : "réactiver"} ${deactivateTarget?.firstName} ${deactivateTarget?.lastName} ?`}
        confirmLabel={deactivateTarget?.status === "ACTIVE" ? "Désactiver" : "Réactiver"}
        variant={deactivateTarget?.status === "ACTIVE" ? "destructive" : "default"} />

      {/* PIN modal */}
      <Modal open={!!pinTarget} onClose={() => setPinTarget(null)} title={`MDP — ${pinTarget?.firstName} ${pinTarget?.lastName}`}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Matricule: <span className="font-mono font-medium">{pinTarget?.employeeNumber}</span></p>
          <div className="space-y-1.5">
            <Label>Nouveau mot de passe (min. 4 car.)</Label>
            <Input type="password" value={pinValue} onChange={(e) => setPinValue(e.target.value)} placeholder="••••••" autoFocus />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPinTarget(null)}>Annuler</Button>
            <Button onClick={handleSetPin} disabled={saving || pinValue.length < 4}>{saving ? "..." : "Définir"}</Button>
          </div>
        </div>
      </Modal>

      {/* Face photo modal — WITH REAL FACE DETECTION */}
      <Modal open={!!faceTarget} onClose={() => { setFaceTarget(null); stopCamera(); }} title={`Face ID — ${faceTarget?.firstName} ${faceTarget?.lastName}`} className="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Matricule: <span className="font-mono font-medium">{faceTarget?.employeeNumber}</span></p>

          {/* Current photo */}
          {faceTarget?.facePhoto && !capturedPhoto && !cameraActive && (
            <div className="text-center">
              <p className="mb-2 text-xs text-green-600 font-medium">Photo actuelle {faceTarget?.faceDescriptor ? "(descripteur facial ✓)" : "(pas de descripteur)"}</p>
              <img src={faceTarget.facePhoto} alt="Face" className="mx-auto h-36 w-36 rounded-xl object-cover border-2 border-border" />
            </div>
          )}

          {/* Camera live */}
          {cameraActive && (
            <div className="text-center">
              <video ref={videoRef} className="mx-auto h-56 w-56 rounded-xl object-cover border-2 border-primary" autoPlay muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
              <p className="mt-2 text-xs text-primary font-medium">Regardez la caméra…</p>
              <div className="mt-3 flex justify-center gap-2">
                <Button onClick={capturePhoto}><Camera className="h-4 w-4" /> Capturer</Button>
                <Button variant="outline" onClick={stopCamera}>Annuler</Button>
              </div>
            </div>
          )}

          {/* Captured photo with face status */}
          {capturedPhoto && (
            <div className="text-center">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Photo capturée :</p>
              <img src={capturedPhoto} alt="Captured" className="mx-auto h-36 w-36 rounded-xl object-cover border-2 border-green-500" />
              <div className="mt-2">
                {faceStatus === "detecting" && <p className="text-xs text-primary animate-pulse">🔍 Détection du visage en cours…</p>}
                {faceStatus === "detected" && <p className="text-xs text-green-600 font-medium">✅ Visage détecté — descripteur extrait (128 features)</p>}
                {faceStatus === "no-face" && <p className="text-xs text-amber-600">⚠️ Aucun visage détecté — la photo sera enregistrée sans descripteur</p>}
                {faceStatus === "error" && <p className="text-xs text-destructive">❌ Erreur de détection</p>}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <div className="flex gap-2">
              {!cameraActive && (
                <Button variant="outline" size="sm" onClick={openCamera}>
                  <Camera className="h-3.5 w-3.5" /> {capturedPhoto ? "Reprendre" : "Ouvrir caméra"}
                </Button>
              )}
              {faceTarget?.facePhoto && (
                <Button variant="ghost" size="sm" onClick={() => { if (faceTarget) handleRemoveFacePhoto(faceTarget); setFaceTarget(null); }} className="text-destructive">
                  Supprimer
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

function WorkerForm({ form, setForm, shops, onSubmit, onCancel, saving, submitLabel }: {
  form: typeof EMPTY_FORM; setForm: (f: typeof EMPTY_FORM) => void; shops: { id: string; name: string }[];
  onSubmit: () => void; onCancel: () => void; saving: boolean; submitLabel: string;
}) {
  return (
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
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={onSubmit} disabled={saving || !form.employeeNumber || !form.firstName || !form.lastName}>
          {saving ? "..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
