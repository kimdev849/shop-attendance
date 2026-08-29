import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateAbsenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
