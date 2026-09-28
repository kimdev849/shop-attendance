import { Controller, Get, Header, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
@Controller({ path: "reports", version: "1" })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("attendance")
  async attendance(
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("shopId") shopId?: string,
    @Query("workerId") workerId?: string,
    @Query("format") format: "json" | "excel" = "json",
    @Res({ passthrough: true }) res?: Response,
  ) {
    const rows = await this.reportsService.attendanceReport({ from, to, shopId, workerId });
    if (format === "excel") {
      const flat = this.reportsService.flattenAttendanceForExport(rows);
      const buffer = await this.reportsService.toExcelWorkbook([
        { name: "Pointages", rows: flat },
      ]);
      res?.set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rapport-pointages-${from}-${to}.xlsx"`,
      });
      return buffer;
    }
    return rows;
  }

  /**
   * Exporte TOUS les rapports dans un seul classeur Excel
   * (une feuille par type de rapport : Pointages, Retards, Absences, Pénalités).
   */
  @Get("export")
  async exportAll(
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("shopId") shopId?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const [attendance, lateness, absences, penalties] = await Promise.all([
      this.reportsService.attendanceReport({ from, to, shopId }),
      this.reportsService.latenessReport({ from, to, shopId }),
      this.reportsService.absencesReport({ from, to, shopId }),
      this.reportsService.penaltiesReport({ from, to, shopId }),
    ]);

    const buffer = await this.reportsService.toExcelWorkbook([
      { name: "Pointages", rows: this.reportsService.flattenAttendanceForExport(attendance) },
      { name: "Retards", rows: this.reportsService.flattenAttendanceForExport(lateness.filter((r: any) => (r.latenessMinutes ?? 0) > 0)) },
      { name: "Absences", rows: absences as any[] },
      { name: "Pénalités", rows: this.reportsService.flattenPenaltiesForExport(penalties) },
    ]);

    res?.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="rapports-${from}-${to}.xlsx"`,
    });
    return buffer;
  }
}
