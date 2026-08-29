import { ConflictException, NotFoundException } from "@nestjs/common";
import { WorkersService } from "./workers.service";

describe("WorkersService", () => {
  let service: WorkersService;
  let prisma: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      worker: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      schedule: { upsert: jest.fn() },
    };
    auditService = { log: jest.fn() };
    service = new WorkersService(prisma, auditService);
  });

  describe("create", () => {
    it("crée un travailleur quand le matricule est disponible", async () => {
      prisma.worker.findUnique.mockResolvedValue(null);
      prisma.worker.create.mockResolvedValue({ id: "w1", employeeNumber: "EMP-1000" });

      const result = await service.create(
        { employeeNumber: "EMP-1000", firstName: "Jean", lastName: "Dupont" } as any,
        "admin-1",
      );

      expect(result).toEqual({ id: "w1", employeeNumber: "EMP-1000" });
      expect(prisma.worker.create).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "WORKER_CREATED" }),
      );
    });

    it("rejette la création si le matricule existe déjà", async () => {
      prisma.worker.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.create({ employeeNumber: "EMP-1000", firstName: "Jean", lastName: "Dupont" } as any),
      ).rejects.toThrow(ConflictException);
      expect(prisma.worker.create).not.toHaveBeenCalled();
    });
  });

  describe("assignSchedule", () => {
    it("refuse d'assigner un horaire à un travailleur sans shop", async () => {
      prisma.worker.findUnique.mockResolvedValue({ id: "w1", shopId: null });

      await expect(
        service.assignSchedule("w1", {
          dayOfWeek: "MONDAY",
          startTime: "08:00",
          endTime: "17:00",
          toleranceMinutes: 10,
        } as any),
      ).rejects.toThrow();
    });

    it("lève NotFoundException si le travailleur n'existe pas", async () => {
      prisma.worker.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });
  });
});
