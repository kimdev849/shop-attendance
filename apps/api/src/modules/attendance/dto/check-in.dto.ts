import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsISO8601, IsString, IsUUID } from "class-validator";

export class CheckInDto {
  @ApiProperty({ description: "ID du travailleur qui pointe" })
  @IsUUID()
  workerId: string;

  @ApiProperty({ description: "ID du shop où se trouve la tablette" })
  @IsUUID()
  shopId: string;

  @ApiProperty({ description: "ID de la tablette utilisée pour le pointage" })
  @IsUUID()
  deviceId: string;

  @ApiProperty({ description: "Horodatage capturé sur la tablette (ISO 8601)" })
  @IsISO8601()
  clientTimestamp: string;

  @ApiProperty({
    description:
      "Identifiant unique généré côté tablette (UUID). Garantit l'idempotence: rejouer le même " +
      "clientRequestId (ex: après une synchronisation offline) ne crée jamais de doublon.",
  })
  @IsString()
  clientRequestId: string;

  @ApiProperty({
    description:
      "Confirme que la vérification biométrique locale (empreinte/visage) a réussi sur l'appareil. " +
      "Aucune donnée biométrique brute n'est envoyée ni stockée côté serveur.",
  })
  @IsBoolean()
  biometricConfirmed: boolean;
}
