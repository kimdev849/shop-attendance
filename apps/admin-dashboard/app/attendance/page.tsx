"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, Search, RotateCcw } from "lucide-react";
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
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
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
                    <SortableHead label="Retard" field="latenessMinutes" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                    <SortableHead label="Statut" field="status" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
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
                      <TableCell>{a.latenessMinutes > 0 ? `${a.latenessMinutes} min` : "—"}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
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
    </AppShell>
  );
}
