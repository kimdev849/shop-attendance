"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, Clock, Search, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { SortableHead } from "@/components/ui/sortable-head";
import { api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/utils";

export default function AttendancePage() {
  const [result, setResult] = useState<any>(null);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "", shopId: "", status: "" });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    api.shops.list({ limit: 200 }).then(({ data }) => setShops(data.data ?? data));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.attendance.list({
        search: search || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        shopId: filters.shopId || undefined,
        status: filters.status || undefined,
        page,
        limit: 20,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }, [search, filters, page, sortBy, sortOrder]);

  useEffect(() => {
    load();
    return () => {};
  }, [load]);

  useEffect(() => { setPage(1); }, [search, filters]);

  function handleSort(field: string, order: "asc" | "desc") {
    setSortBy(field); setSortOrder(order); setPage(1);
  }

  function resetFilters() {
    setSearch(""); setFilters({ from: "", to: "", shopId: "", status: "" }); setPage(1);
  }

  const hasFilters = search || filters.from || filters.to || filters.shopId || filters.status;
  const attendances = result?.data ?? [];

  /** État de la photo d'audit pour une ligne de pointage. */
  function photoState(a: any): "none" | "expired" | "available" {
    if (!a.checkInPhotoUrl) return "none";
    if (a.checkInPhotoExpiresAt && new Date(a.checkInPhotoExpiresAt).getTime() < Date.now()) return "expired";
    return "available";
  }

  return (
    <AppShell title="Pointages">
      <Card className="mb-4">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un travailleur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Du</Label><Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="w-40" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Au</Label><Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="w-40" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Shop</Label>
              <Select value={filters.shopId} onChange={(e) => setFilters({ ...filters, shopId: e.target.value })} className="w-40">
                <option value="">Tous</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Statut</Label>
              <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-36">
                <option value="">Tous</option>
                <option value="ON_TIME">À l'heure</option>
                <option value="LATE">En retard</option>
                <option value="ABSENT">Absent</option>
              </Select>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={10} columns={8} />
          ) : attendances.length === 0 ? (
            <EmptyState icon={<Clock className="h-10 w-10" />} message="Aucun pointage trouvé." onReset={hasFilters ? resetFilters : undefined} />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Date" field="attendanceDate" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead>Travailleur</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Heure prévue</TableHead>
                    <SortableHead label="Heure réelle" field="checkInTime" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead>Sortie</TableHead>
                    <SortableHead label="Retard" field="latenessMinutes" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <SortableHead label="Statut" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <TableHead>Photo</TableHead>
                    <TableHead>Appareil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.attendanceDate)}</TableCell>
                      <TableCell>{a.worker.firstName} {a.worker.lastName}</TableCell>
                      <TableCell>{a.shop.name}</TableCell>
                      <TableCell>{a.scheduledTime ? formatTime(a.scheduledTime) : "—"}</TableCell>
                      <TableCell>{formatTime(a.checkInTime)}</TableCell>
                      <TableCell>{a.checkOutTime ? formatTime(a.checkOutTime) : "—"}</TableCell>
                      <TableCell>{a.latenessMinutes > 0 ? `${a.latenessMinutes} min` : "—"}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell>
                        {photoState(a) === "available" && (
                          <button
                            type="button"
                            onClick={() => setLightbox({ url: a.checkInPhotoUrl, title: `${a.worker.firstName} ${a.worker.lastName} — ${formatDate(a.attendanceDate)}` })}
                            className="group relative block h-10 w-14 overflow-hidden rounded-md border border-border transition-opacity hover:opacity-80"
                            title="Voir la photo de pointage"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={a.checkInPhotoUrl}
                              alt={`Photo de pointage de ${a.worker.firstName} ${a.worker.lastName}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <Camera className="absolute bottom-0.5 right-0.5 h-3 w-3 text-white drop-shadow" />
                          </button>
                        )}
                        {photoState(a) === "expired" && (
                          <span className="text-xs italic text-muted-foreground">Photo expirée</span>
                        )}
                        {photoState(a) === "none" && (
                          <span className="text-xs text-muted-foreground">Aucune photo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.device?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result && <Pagination page={result.page} totalPages={result.totalPages} total={result.total} limit={result.limit} onPageChange={setPage} />}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lightbox photo de pointage */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="max-h-full w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">{lightbox.title}</p>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                Fermer ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.title} className="max-h-[75vh] w-full object-contain bg-black" />
          </div>
        </div>
      )}
    </AppShell>
  );
}
