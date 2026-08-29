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
    @Query("format") format: "json" | "csv" = "json",
    @Res({ passthrough: true }) res?: Response,
  ) {
    const rows = await this.reportsService.attendanceReport({ from, to, shopId, workerId });
    if (format === "csv") {
      const flat = this.reportsService.flattenAttendanceForExport(rows);
      const csv = this.reportsService.toCsv(flat);
      res?.set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rapport-pointages-${from}-${to}.csv"`,
      });
      return csv;
    }
    return rows;
  }

  @Get("lateness")
  lateness(@Query("from") from: string, @Query("to") to: string, @Query("shopId") shopId?: string) {
    return this.reportsService.latenessReport({ from, to, shopId });
  }

  @Get("absences")
  absences(@Query("from") from: string, @Query("to") to: string, @Query("shopId") shopId?: string) {
    return this.reportsService.absencesReport({ from, to, shopId });
  }

  @Get("penalties")
  penalties(@Query("from") from: string, @Query("to") to: string, @Query("shopId") shopId?: string) {
    return this.reportsService.penaltiesReport({ from, to, shopId });
  }
}
