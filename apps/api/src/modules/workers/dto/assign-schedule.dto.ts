import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsString, Matches, Min } from "class-validator";
import { DayOfWeek } from "@prisma/client";
import { IsEnum } from "class-validator";

export class AssignScheduleDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: "08:00" })
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, { message: "startTime doit être au format HH:mm" })
  startTime: string;

  @ApiProperty({ example: "17:00" })
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, { message: "endTime doit être au format HH:mm" })
  endTime: string;

  @ApiProperty({ example: 10, default: 10 })
  @IsInt()
  @Min(0)
  toleranceMinutes: number;
}
