import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { ReportsRepository } from "./reports.repository";

@Module({
  providers: [ReportsService, ReportsRepository],
  controllers: [ReportsController],
})
export class ReportsModule {}
