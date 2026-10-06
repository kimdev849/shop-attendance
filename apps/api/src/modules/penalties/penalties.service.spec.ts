import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PenaltiesService } from "./penalties.service";

describe("PenaltiesService", () => {
  let service: PenaltiesService;
  let repository: any;
  let auditService: any;
  let notificationsService: any;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    auditService = { log: jest.fn() };
    notificationsService = { notifyAdmins: jest.fn().mockResolvedValue(undefined) };
    service = new PenaltiesService(repository, auditService, notificationsService);
  });

  describe("approve", () => {
    it("approuve une pénalité EN ATTENTE", async () => {
      repository.findById.mockResolvedValue({ id: "p1", status: "PENDING", amount: 1000 });
      repository.update.mockResolvedValue({ id: "p1", status: "APPROVED" });

      const result = await service.approve("p1", "admin-1");

      expect(result.status).toBe("APPROVED");
      expect(repository.update).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ status: "APPROVED", approvedBy: "admin-1" }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "PENALTY_APPROVED" }),
      );
      expect(notificationsService.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({ type: "PENALTY", title: "Pénalité approuvée" }),
      );
    });

    it("refuse d'approuver une pénalité déjà traitée", async () => {
      repository.findById.mockResolvedValue({ id: "p1", status: "APPROVED" });

      await expect(service.approve("p1", "admin-1")).rejects.toThrow(BadRequestException);
    });

    it("lève NotFoundException pour une pénalité inexistante", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.approve("missing", "admin-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("reject", () => {
    it("rejette une pénalité EN ATTENTE", async () => {
      repository.findById.mockResolvedValue({ id: "p1", status: "PENDING" });
      repository.update.mockResolvedValue({ id: "p1", status: "REJECTED" });

      const result = await service.reject("p1", "admin-1");
      expect(result.status).toBe("REJECTED");
    });
  });

  describe("cancel", () => {
    it("refuse d'annuler une pénalité déjà annulée", async () => {
      repository.findById.mockResolvedValue({ id: "p1", status: "CANCELLED" });
      await expect(service.cancel("p1", "admin-1")).rejects.toThrow(BadRequestException);
    });
  });
});
