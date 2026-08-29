"use client";

import { useState } from "react";
import { Download, FileBarChart } from "lucide-react";
import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { api, apiClient } from "@/lib/api";
import { formatDate, formatTime, formatFcfa } from "@/lib/utils";

const REPORT_TYPES = [
  { value: "attendance", label: "Pointages" },
  { value: "lateness", label: "Retards" },
  { value: "absences", label: "Absences" },
  { value: "penalties", label: "Pénalités" },
] as const;

type ReportType = (typeof REPORT_TYPES)[number]["value"];

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>("attendance");
  const [range, setRange] = useState(defaultDateRange());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const reportFn: Record<ReportType, (p: any) => Promise<any>> = {
    attendance: api.reports.attendance,
    lateness: api.reports.lateness,
    absences: api.reports.absences,
    penalties: api.reports.penalties,
  };

  async function handleGenerate() {
    setLoading(true);
    try {
      const { data } = await reportFn[type]({ from: range.from, to: range.to });
      setRows(data);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCsv() {
    const { data } = await apiClient.get("/reports/attendance", {
      params: { from: range.from, to: range.to, format: "csv" },
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `rapport-${type}-${range.from}-${range.to}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Rapports">
      <Card className="mb-6">
        <CardHeader><CardTitle>Générer un rapport</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Type de rapport</Label>
            <Select value={type} onChange={(e) => { setType(e.target.value as ReportType); setGenerated(false); }}>
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Du</Label>
            <Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Au</Label>
            <Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleGenerate} disabled={loading} className="flex-1">
              <FileBarChart className="h-4 w-4" /> {loading ? "Génération..." : "Générer"}
            </Button>
            {type === "attendance" && generated && rows.length > 0 && (
              <Button variant="outline" onClick={handleExportCsv} title="Exporter en CSV">
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : !generated ? (
            <EmptyState icon={<FileBarChart className="h-10 w-10" />} message='Sélectionnez une période et un type puis cliquez sur "Générer".' />
          ) : rows.length === 0 ? (
            <EmptyState icon={<FileBarChart className="h-10 w-10" />} message="Aucune donnée pour cette période." />
          ) : (
            <ReportTable type={type} rows={rows} />
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function ReportTable({ type, rows }: { type: ReportType; rows: any[] }) {
  if (type === "attendance" || type === "lateness") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Matricule</TableHead>
            <TableHead>Travailleur</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead>Heure prévue</TableHead>
            <TableHead>Heure réelle</TableHead>
            <TableHead>Retard</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Pénalité</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id ?? i}>
              <TableCell>{formatDate(r.attendanceDate)}</TableCell>
              <TableCell className="font-mono text-xs">{r.worker?.employeeNumber ?? "—"}</TableCell>
              <TableCell>{r.worker ? `${r.worker.firstName} ${r.worker.lastName}` : "—"}</TableCell>
              <TableCell>{r.shop?.name ?? "—"}</TableCell>
              <TableCell>{r.scheduledTime ? formatTime(r.scheduledTime) : "—"}</TableCell>
              <TableCell>{formatTime(r.checkInTime)}</TableCell>
              <TableCell>{r.latenessMinutes > 0 ? `${r.latenessMinutes} min` : "—"}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
              <TableCell>{r.penalty ? formatFcfa(r.penalty.amount) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (type === "absences") {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Matricule</TableHead>
            <TableHead>Travailleur</TableHead>
            <TableHead>Shop</TableHead>
            <TableHead>Motif</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.id ?? i}>
              <TableCell>{formatDate(r.date)}</TableCell>
              <TableCell className="font-mono text-xs">{r.worker?.employeeNumber ?? "—"}</TableCell>
              <TableCell>{r.worker ? `${r.worker.firstName} ${r.worker.lastName}` : "—"}</TableCell>
              <TableCell>{r.shop?.name ?? "—"}</TableCell>
              <TableCell className="max-w-xs truncate text-xs">{r.reason ?? "—"}</TableCell>
              <TableCell><StatusBadge status={r.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // penalties
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date pointage</TableHead>
          <TableHead>Matricule</TableHead>
          <TableHead>Travailleur</TableHead>
          <TableHead>Retard</TableHead>
          <TableHead>Montant</TableHead>
          <TableHead>Statut</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.id ?? i}>
            <TableCell>{r.attendance ? formatDate(r.attendance.attendanceDate) : "—"}</TableCell>
            <TableCell className="font-mono text-xs">{r.worker?.employeeNumber ?? "—"}</TableCell>
            <TableCell>{r.worker ? `${r.worker.firstName} ${r.worker.lastName}` : "—"}</TableCell>
            <TableCell>{r.attendance?.latenessMinutes ? `${r.attendance.latenessMinutes} min` : "—"}</TableCell>
            <TableCell className="font-medium">{formatFcfa(r.amount)}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
