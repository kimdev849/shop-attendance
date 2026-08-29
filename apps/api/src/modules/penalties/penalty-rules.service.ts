import { Injectable, NotFoundException } from "@nestjs/common";
import { DEFAULT_PENALTY_TIERS } from "@shop-attendance/config";
import { PenaltiesRepository } from "./penalties.repository";
import { CreatePenaltyRuleDto } from "./dto/create-penalty-rule.dto";
import { UpdatePenaltyRuleDto } from "./dto/update-penalty-rule.dto";

/**
 * Gère les paliers de pénalité configurables (voir README §10 "Système de
 * pénalités"). Les valeurs ne sont JAMAIS codées en dur dans la logique de
 * calcul: PenaltyCalculatorService lit toujours cette table.
 */
@Injectable()
export class PenaltyRulesService {
  constructor(private readonly repository: PenaltiesRepository) {}

  async findAllActive() {
    const rules = await this.repository.findPendingRules();
    if (rules.length === 0) {
      // Filet de sécurité seulement si l'admin n'a encore rien configuré
      // (normalement peuplé par le seed).
      return DEFAULT_PENALTY_TIERS.map((tier, index) => ({
        id: `default-${index}`,
        ...tier,
        isActive: true,
      }));
    }
    return rules;
  }

  findAll() {
    return this.repository.findPendingRules();
  }

  create(dto: CreatePenaltyRuleDto) {
    return this.repository.createPenaltyRule({
      fromMinutes: dto.fromMinutes,
      toMinutes: dto.toMinutes ?? null,
      amount: dto.amount,
      label: (dto as any).label,
    });
  }

  async update(id: string, dto: UpdatePenaltyRuleDto) {
    const existing = await this.repository.findPenaltyRuleById(id);
    if (!existing) throw new NotFoundException("Palier de pénalité introuvable.");
    return this.repository.updatePenaltyRule(id, dto);
  }

  async remove(id: string) {
    const existing = await this.repository.findPenaltyRuleById(id);
    if (!existing) throw new NotFoundException("Palier de pénalité introuvable.");
    return this.repository.updatePenaltyRule(id, { isActive: false });
  }
}
