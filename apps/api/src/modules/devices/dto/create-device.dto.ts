import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateDeviceDto {
  @ApiProperty({ description: "Identifiant unique matériel de la tablette (ex: numéro de série)" })
  @IsString()
  deviceIdentifier: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsUUID()
  shopId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appVersion?: string;
}
