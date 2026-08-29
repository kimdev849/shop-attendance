import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class CreatePenaltyRuleDto {
  @ApiProperty({ example: 11, description: "Borne basse (minutes de retard), incluse" })
  @IsInt()
  @Min(0)
  fromMinutes: number;

  @ApiPropertyOptional({
    example: 20,
    description: "Borne haute (minutes de retard), incluse. Laisser vide pour 'illimité' (> X minutes)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  toMinutes?: number;

  @ApiProperty({ example: 1000, description: "Montant de la pénalité en FCFA" })
  @IsInt()
  @Min(0)
  amount: number;
}
