import { PartialType } from "@nestjs/swagger";
import { CreatePenaltyRuleDto } from "./create-penalty-rule.dto";

export class UpdatePenaltyRuleDto extends PartialType(CreatePenaltyRuleDto) {}
