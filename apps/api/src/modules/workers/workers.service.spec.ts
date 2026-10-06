import { ConflictException, NotFoundException } from "@nestjs/common";
import { WorkersService } from "./workers.service";
import { WorkersRepository } from "./workers.repository";

describe("WorkersService", () => {
  let service: WorkersService;
  let repository: Record<string, jest.Mock>;
  let auditService: any;

  beforeEach(() => {
    repository = {
      findByEmployeeNumber: jest.fn(),
      findById: jest.fn(),
      findByIdWithRelations: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      assignSchedule: jest.fn(),
    };
    auditService = { log: jest.fn() };
    service = new WorkersService(
      repository as unknown as WorkersRepository,
      auditService,
      { uploadCheckInPhoto: jest.fn().mockResolvedValue(null) } as any,
    );
  });

  describe("create", () => {
    it("crée un travailleur quand le matricule est disponible", async () => {
      repository.findByEmployeeNumber.mockResolvedValue(null);
      repository.create.mockResolvedValue({ id: "w1", employeeNumber: "EMP-1000" });

      const result = await service.create(
        { employeeNumber: "EMP-1000", firstName: "Jean", lastName: "Dupont" } as any,
        "admin-1",
      );

      expect(result).toEqual({ id: "w1", employeeNumber: "EMP-1000" });
      expect(repository.create).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "WORKER_CREATED" }),
      );
    });

    it("rejette la création si le matricule existe déjà", async () => {
      repository.findByEmployeeNumber.mockResolvedValue({ id: "existing" });

      await expect(
        service.create({ employeeNumber: "EMP-1000", firstName: "Jean", lastName: "Dupont" } as any),
      ).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("retourne le travailleur avec ses relations", async () => {
      const worker = { id: "w1", firstName: "Jean", lastName: "Dupont" };
      repository.findByIdWithRelations.mockResolvedValue(worker);

      await expect(service.findOne("w1")).resolves.toBe(worker);
    });

    it("lève NotFoundException si le travailleur n'existe pas", async () => {
      repository.findByIdWithRelations.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("assignSchedule", () => {
    it("refuse d'assigner un horaire à un travailleur sans shop", async () => {
      repository.findById.mockResolvedValue({ id: "w1", shopId: null });

      await expect(
        service.assignSchedule("w1", {
          dayOfWeek: "MONDAY",
          startTime: "08:00",
          endTime: "17:00",
          toleranceMinutes: 10,
        } as any),
      ).rejects.toThrow(ConflictException);
      expect(repository.assignSchedule).not.toHaveBeenCalled();
    });

    it("assigne un horaire à un travailleur avec shop", async () => {
      const worker = { id: "w1", shopId: "shop-1", employeeNumber: "EMP-1000", firstName: "Jean", lastName: "Dupont" };
      repository.findById.mockResolvedValue(worker);
      repository.assignSchedule.mockResolvedValue({ id: "sched-1" });

      const result = await service.assignSchedule("w1", {
        dayOfWeek: "MONDAY",
        startTime: "08:00",
        endTime: "17:00",
        toleranceMinutes: 10,
      } as any);

      expect(result).toEqual({ id: "sched-1" });
      expect(repository.assignSchedule).toHaveBeenCalledWith("w1", expect.anything(), "shop-1");
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: "WORKER_SCHEDULE_ASSIGNED" }),
      );
    });
  });
});
