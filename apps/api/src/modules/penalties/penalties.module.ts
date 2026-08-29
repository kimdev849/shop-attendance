import { Module } from "@nestjs/common";
import { PenaltiesService } from "./penalties.service";
import { PenaltyRulesService } from "./penalty-rules.service";
import { PenaltyCalculatorService } from "./penalty-calculator.service";
import { PenaltiesController } from "./penalties.controller";
import { PenaltiesRepository } from "./penalties.repository";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [AuditModule],
  providers: [PenaltiesService, PenaltyRulesService, PenaltyCalculatorService, PenaltiesRepository],
  controllers: [PenaltiesController],
  exports: [PenaltiesService, PenaltyRulesService, PenaltyCalculatorService],
})
export class PenaltiesModule {}
