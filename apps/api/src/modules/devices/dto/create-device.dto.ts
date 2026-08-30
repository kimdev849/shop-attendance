import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";

export class CreateDeviceDto {
  @ApiPropertyOptional({ description: "Identifiant unique matériel de la tablette (auto-généré si absent)" })
  @IsOptional()
  @IsString()
  deviceIdentifier?: string;

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
