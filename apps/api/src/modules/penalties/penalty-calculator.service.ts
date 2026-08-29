import { Injectable } from "@nestjs/common";
import { PenaltyRulesService } from "./penalty-rules.service";

export interface LatenessComputation {
  rawLatenessMinutes: number; // écart brut entre l'heure prévue et l'heure de pointage
  retainedLatenessMinutes: number; // écart après application de la tolérance (voir README §9)
  isLate: boolean;
}

/**
 * Logique métier centrale du calcul de retard et de pénalité.
 * Volontairement séparée du contrôleur/service d'attendance pour rester
 * testable unitairement sans base de données (voir test/lateness.spec.ts).
 *
 * Règle (README §9 "Règle de retard"):
 *   - retard brut = max(0, arrivée - heure prévue) en minutes
 *   - si retard brut <= tolérance   -> à l'heure, retard retenu = 0
 *   - sinon                         -> en retard, retard retenu = retard brut - tolérance
 *
 * Règle (README §10 "Système de pénalités"):
 *   - le retard retenu est comparé aux paliers configurés (PenaltyRule) pour
 *     déterminer le montant. Aucune valeur n'est codée en dur ici.
 */
@Injectable()
export class PenaltyCalculatorService {
  constructor(private readonly penaltyRulesService: PenaltyRulesService) {}

  computeLateness(scheduledTime: Date, checkInTime: Date, toleranceMinutes: number): LatenessComputation {
    const diffMs = checkInTime.getTime() - scheduledTime.getTime();
    const rawLatenessMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (rawLatenessMinutes <= toleranceMinutes) {
      return { rawLatenessMinutes, retainedLatenessMinutes: 0, isLate: false };
    }

    return {
      rawLatenessMinutes,
      retainedLatenessMinutes: rawLatenessMinutes - toleranceMinutes,
      isLate: true,
    };
  }

  async computePenaltyAmount(retainedLatenessMinutes: number): Promise<number> {
    if (retainedLatenessMinutes <= 0) return 0;

    const tiers = await this.penaltyRulesService.findAllActive();
    const matchingTier = tiers.find(
      (tier: { fromMinutes: number; toMinutes: number | null; amount: number }) =>
        retainedLatenessMinutes >= tier.fromMinutes &&
        (tier.toMinutes === null || tier.toMinutes === undefined || retainedLatenessMinutes <= tier.toMinutes),
    );

    // Si aucun palier ne correspond (trou dans la configuration), on retombe
    // sur le palier le plus élevé disponible plutôt que de ne rien facturer.
    if (matchingTier) return matchingTier.amount;

    const highestTier = [...tiers].sort((a, b) => b.fromMinutes - a.fromMinutes)[0];
    return highestTier?.amount ?? 0;
  }
}
