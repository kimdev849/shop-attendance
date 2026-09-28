import { Injectable } from "@nestjs/common";
import * as ExcelJS from "exceljs";
import { ReportsRepository } from "./reports.repository";

export type ReportFormat = "json" | "excel";

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
      Date: this.toDateString(row.attendanceDate),
      Travailleur: `${row.worker?.firstName ?? ""} ${row.worker?.lastName ?? ""}`.trim(),
      Matricule: row.worker?.employeeNumber ?? "",
      Shop: row.shop?.name ?? "",
      "Heure prévue": row.scheduledTime ? this.toTimeString(row.scheduledTime) : "",
      "Heure réelle": row.checkInTime ? this.toTimeString(row.checkInTime) : "",
      Sortie: row.checkOutTime ? this.toTimeString(row.checkOutTime) : "",
      Retard: row.latenessMinutes > 0 ? `${row.latenessMinutes} min` : "",
      Statut: row.status ?? "",
      "Pénalité (FCFA)": row.penalty?.amount ?? "",
    }));
  }

  flattenPenaltiesForExport(rows: any[]) {
    return rows.map((row) => ({
      "Date pointage": row.attendance ? this.toDateString(row.attendance.attendanceDate) : "",
      Matricule: row.worker?.employeeNumber ?? "",
      Travailleur: `${row.worker?.firstName ?? ""} ${row.worker?.lastName ?? ""}`.trim(),
      Retard: row.attendance?.latenessMinutes ? `${row.attendance.latenessMinutes} min` : "",
      "Montant (FCFA)": row.amount ?? "",
      Statut: row.status ?? "",
    }));
  }

  /**
   * Génère un classeur Excel avec une feuille par type de rapport.
   * Chaque feuille contient un tableau avec en-têtes en gras.
   */
  async toExcelWorkbook(sheets: { name: string; rows: any[] }[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ShopAttendance";
    workbook.created = new Date();

    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name, {
        properties: { defaultRowHeight: 18 },
      });
      const data = sheet.rows ?? [];
      const headers = data.length > 0 ? Object.keys(data[0]) : [];
      if (headers.length === 0) {
        worksheet.addRow(["Aucune donnée pour cette période."]);
        continue;
      }

      worksheet.columns = headers.map((h) => ({ header: h, key: h, width: Math.min(Math.max(h.length + 4, 12), 40) }));
      for (const row of data) {
        worksheet.addRow(headers.map((h) => row[h] ?? ""));
      }

      // Style des en-têtes
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 22;
      worksheet.views = [{ state: "frozen", ySplit: 1 }];
      worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
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

  private toDateString(value: any): string {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }

  private toTimeString(value: any): string {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
}
