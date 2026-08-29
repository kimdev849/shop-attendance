import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsISO8601, IsNumberString, IsOptional, IsString, IsUUID } from "class-validator";
import { AttendanceStatus } from "@prisma/client";

export class QueryAttendanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workerId?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
