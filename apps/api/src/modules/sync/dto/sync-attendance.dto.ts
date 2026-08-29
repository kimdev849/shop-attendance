import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { CheckInDto } from "../../attendance/dto/check-in.dto";

export class SyncAttendanceDto {
  @ApiProperty({
    type: [CheckInDto],
    description:
      "Liste des pointages accumulés hors ligne sur la tablette, dans l'ordre chronologique. " +
      "Chaque élément doit avoir un clientRequestId unique généré au moment du pointage local.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckInDto)
  items: CheckInDto[];
}
