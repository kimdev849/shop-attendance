import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PenaltiesService } from "./penalties.service";

describe("PenaltiesService", () => {
  let service: PenaltiesService;
  let prisma: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      penalty: { findUnique: jest.fn(), update: jest.fn() },
    };
    auditService = { log: jest.fn() };
    service = new PenaltiesService(prisma, auditService);
  });

  describe("approve", () => {
    it("approuve une pénalité EN ATTENTE", async () => {
      prisma.penalty.findUnique.mockResolvedValue({ id: "p1", status: "PENDING", amount: 1000 });
      prisma.penalty.update.mockResolvedValue({ id: "p1", status: "APPROVED" });

      const result = await service.approve("p1", "admin-1");

      expect(result.status).toBe("APPROVED");
      expect(prisma.penalty.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: expect.objectContaining({ status: "APPROVED", approvedBy: "admin-1" }),
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "PENALTY_APPROVED" }),
      );
    });

    it("refuse d'approuver une pénalité déjà traitée", async () => {
      prisma.penalty.findUnique.mockResolvedValue({ id: "p1", status: "APPROVED" });

      await expect(service.approve("p1", "admin-1")).rejects.toThrow(BadRequestException);
    });

    it("lève NotFoundException pour une pénalité inexistante", async () => {
      prisma.penalty.findUnique.mockResolvedValue(null);

      await expect(service.approve("missing", "admin-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("reject", () => {
    it("rejette une pénalité EN ATTENTE", async () => {
      prisma.penalty.findUnique.mockResolvedValue({ id: "p1", status: "PENDING" });
      prisma.penalty.update.mockResolvedValue({ id: "p1", status: "REJECTED" });

      const result = await service.reject("p1", "admin-1");
      expect(result.status).toBe("REJECTED");
    });
  });

  describe("cancel", () => {
    it("refuse d'annuler une pénalité déjà annulée", async () => {
      prisma.penalty.findUnique.mockResolvedValue({ id: "p1", status: "CANCELLED" });
      await expect(service.cancel("p1", "admin-1")).rejects.toThrow(BadRequestException);
    });
  });
});
