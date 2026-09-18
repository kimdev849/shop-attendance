import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

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

  @ApiProperty({
    description: "Type de pointage: CHECK_IN ou CHECK_OUT. Si omis, détection automatique.",
    enum: ["CHECK_IN", "CHECK_OUT"],
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: "CHECK_IN" | "CHECK_OUT";

  @ApiProperty({
    description:
      "Photo de pointage capturée sur la tablette (data URL base64). Audit uniquement: " +
      "stockée sur Cloudinary avec expiration 28 jours, elle ne bloque JAMAIS le pointage.",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(15_000_000) // ~10 MB de base64 (limite body JSON de main.ts)
  checkInPhoto?: string;
}
