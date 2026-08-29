import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateAbsenceDto {
  @ApiProperty()
  @IsUUID()
  workerId: string;

  @ApiProperty()
  @IsUUID()
  shopId: string;

  @ApiProperty()
  @IsISO8601()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
