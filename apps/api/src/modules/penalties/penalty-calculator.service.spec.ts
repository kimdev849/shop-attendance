import { PenaltyCalculatorService } from "./penalty-calculator.service";
import { PenaltyRulesService } from "./penalty-rules.service";

describe("PenaltyCalculatorService", () => {
  let calculator: PenaltyCalculatorService;
  let penaltyRulesService: { findAllActive: jest.Mock };

  beforeEach(() => {
    penaltyRulesService = {
      findAllActive: jest.fn().mockResolvedValue([
        { fromMinutes: 0, toMinutes: 10, amount: 0 },
        { fromMinutes: 11, toMinutes: 20, amount: 1000 },
        { fromMinutes: 21, toMinutes: 30, amount: 2000 },
        { fromMinutes: 31, toMinutes: 60, amount: 5000 },
        { fromMinutes: 61, toMinutes: null, amount: 10000 },
      ]),
    };
    calculator = new PenaltyCalculatorService(penaltyRulesService as unknown as PenaltyRulesService);
  });

  describe("computeLateness", () => {
    it("considère à l'heure une arrivée dans la tolérance (08:00 + 10min, arrivée 08:07)", () => {
      const scheduled = new Date("2026-08-25T08:00:00.000Z");
      const checkIn = new Date("2026-08-25T08:07:00.000Z");

      const result = calculator.computeLateness(scheduled, checkIn, 10);

      expect(result.isLate).toBe(false);
      expect(result.rawLatenessMinutes).toBe(7);
      expect(result.retainedLatenessMinutes).toBe(0);
    });

    it("calcule le retard retenu en retirant la tolérance (08:00 + 10min, arrivée 08:25)", () => {
      const scheduled = new Date("2026-08-25T08:00:00.000Z");
      const checkIn = new Date("2026-08-25T08:25:00.000Z");

      const result = calculator.computeLateness(scheduled, checkIn, 10);

      expect(result.isLate).toBe(true);
      expect(result.rawLatenessMinutes).toBe(25);
      expect(result.retainedLatenessMinutes).toBe(15);
    });

    it("ne renvoie jamais de retard négatif pour une arrivée en avance", () => {
      const scheduled = new Date("2026-08-25T08:00:00.000Z");
      const checkIn = new Date("2026-08-25T07:50:00.000Z");

      const result = calculator.computeLateness(scheduled, checkIn, 10);

      expect(result.rawLatenessMinutes).toBe(0);
      expect(result.isLate).toBe(false);
    });

    it("est exactement à la limite de tolérance (pas de retard)", () => {
      const scheduled = new Date("2026-08-25T08:00:00.000Z");
      const checkIn = new Date("2026-08-25T08:10:00.000Z");

      const result = calculator.computeLateness(scheduled, checkIn, 10);

      expect(result.isLate).toBe(false);
      expect(result.retainedLatenessMinutes).toBe(0);
    });
  });

  describe("computePenaltyAmount", () => {
    it("retourne 0 pour un retard retenu de 0 minute", async () => {
      await expect(calculator.computePenaltyAmount(0)).resolves.toBe(0);
    });

    it("applique le palier 11-20 minutes (1000 FCFA) pour 15 minutes retenues", async () => {
      await expect(calculator.computePenaltyAmount(15)).resolves.toBe(1000);
    });

    it("applique le palier 21-30 minutes (2000 FCFA) pour 30 minutes retenues", async () => {
      await expect(calculator.computePenaltyAmount(30)).resolves.toBe(2000);
    });

    it("applique le palier le plus élevé au-delà de 60 minutes retenues", async () => {
      await expect(calculator.computePenaltyAmount(90)).resolves.toBe(10000);
    });
  });
});
