import { Module } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardController } from "./dashboard.controller";
import { DashboardRepository } from "./dashboard.repository";

@Module({
  providers: [DashboardService, DashboardRepository],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
