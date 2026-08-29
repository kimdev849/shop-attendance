import { Injectable } from "@nestjs/common";
import { ReportsRepository } from "./reports.repository";

export type ReportFormat = "json" | "csv";

@Injectable()
export class ReportsService {
  constructor(private readonly repository: ReportsRepository) {}

  private dateOnly(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  async attendanceReport(params: { from: string; to: string; shopId?: string; workerId?: string }) {
    const from = this.dateOnly(new Date(params.from));
    const to = this.dateOnly(new Date(params.to));
    // Add one day to include the end date
    to.setUTCDate(to.getUTCDate() + 1);

    return this.repository.findAttendanceReport({
      from,
      to,
      shopId: params.shopId,
      workerId: params.workerId,
    });
  }

  async penaltyReport(params: { from: string; to: string; shopId?: string; status?: string }) {
    const from = this.dateOnly(new Date(params.from));
    const to = this.dateOnly(new Date(params.to));
    to.setUTCDate(to.getUTCDate() + 1);

    return this.repository.findPenaltyReport({
      from,
      to,
      shopId: params.shopId,
      status: params.status,
    });
  }

  flattenAttendanceForExport(rows: any[]) {
    return rows.map((row) => ({
      Date: row.attendanceDate,
      Travailleur: `${row.worker?.firstName} ${row.worker?.lastName}`,
      Matricule: row.worker?.employeeNumber,
      Shop: row.shop?.name,
      "Heure prévue": row.scheduledTime,
      "Heure réelle": row.checkInTime,
      Retard: row.latenessMinutes > 0 ? `${row.latenessMinutes} min` : "",
      Statut: row.status,
      Pénalité: row.penalty?.amount ?? "",
    }));
  }

  toCsv(data: any[]): string {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];
    for (const row of data) {
      const values = headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`);
      csvRows.push(values.join(","));
    }
    return csvRows.join("\n");
  }

  async latenessReport(params: { from: string; to: string; shopId?: string }) {
    const from = this.dateOnly(new Date(params.from));
    const to = this.dateOnly(new Date(params.to));
    to.setUTCDate(to.getUTCDate() + 1);

    return this.repository.findAttendanceReport({
      from,
      to,
      shopId: params.shopId,
    });
  }

  async absencesReport(params: { from: string; to: string; shopId?: string }) {
    // TODO: Implement absences report
    return [];
  }

  async penaltiesReport(params: { from: string; to: string; shopId?: string }) {
    return this.penaltyReport(params);
  }
}
