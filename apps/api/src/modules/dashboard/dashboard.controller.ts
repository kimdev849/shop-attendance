import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SHOP_MANAGER)
@Controller({ path: "dashboard", version: "1" })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get("attendance-by-shop")
  getAttendanceByShop() {
    return this.dashboardService.getAttendanceByShop();
  }

  @Get("daily-trend")
  getDailyTrend(@Query("days") days?: string) {
    return this.dashboardService.getDailyTrend(days ? Number(days) : undefined);
  }
}
