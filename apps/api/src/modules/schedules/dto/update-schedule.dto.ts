import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Matches, Min } from "class-validator";

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: "08:00" })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
  startTime?: string;

  @ApiPropertyOptional({ example: "17:00" })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
  endTime?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  toleranceMinutes?: number;
}
