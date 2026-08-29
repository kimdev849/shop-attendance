import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";

describe("AttendanceService", () => {
  let service: AttendanceService;
  let prisma: any;
  let auditService: any;
  let devicesService: any;
  let schedulesService: any;
  let penaltyCalculator: any;

  const worker = { id: "w1", shopId: "s1", status: "ACTIVE" };
  const shop = { id: "s1", status: "ACTIVE" };
  const device = { id: "d1", shopId: "s1" };
  const schedule = { startTime: "08:00", endTime: "17:00", toleranceMinutes: 10 };

  const baseDto = {
    workerId: "w1",
    shopId: "s1",
    deviceId: "d1",
    clientTimestamp: "2026-08-25T08:07:00.000Z",
    clientRequestId: "req-1",
    biometricConfirmed: true,
  };

  beforeEach(() => {
    prisma = {
      attendance: { findUnique: jest.fn(), create: jest.fn() },
      worker: { findUnique: jest.fn() },
      shop: { findUnique: jest.fn() },
      device: { findUnique: jest.fn() },
      penalty: { create: jest.fn() },
    };
    auditService = { log: jest.fn() };
    devicesService = { touch: jest.fn().mockResolvedValue({}) };
    schedulesService = { findApplicableSchedule: jest.fn() };
    penaltyCalculator = { computeLateness: jest.fn(), computePenaltyAmount: jest.fn() };

    service = new AttendanceService(
      prisma,
      auditService,
      devicesService,
      schedulesService,
      penaltyCalculator,
    );
  });

  it("rejette le pointage sans confirmation biométrique", async () => {
    prisma.attendance.findUnique.mockResolvedValue(null);
    prisma.worker.findUnique.mockResolvedValue(worker);
    prisma.shop.findUnique.mockResolvedValue(shop);
    prisma.device.findUnique.mockResolvedValue(device);

    await expect(
      service.checkIn({ ...baseDto, biometricConfirmed: false }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette le pointage pour un travailleur introuvable", async () => {
    prisma.attendance.findUnique.mockResolvedValue(null);
    prisma.worker.findUnique.mockResolvedValue(null);

    await expect(service.checkIn(baseDto)).rejects.toThrow(NotFoundException);
  });

  it("enregistre un pointage À L'HEURE sans pénalité (arrivée dans la tolérance)", async () => {
    prisma.attendance.findUnique.mockResolvedValueOnce(null); // idempotency check
    prisma.worker.findUnique.mockResolvedValue(worker);
    prisma.shop.findUnique.mockResolvedValue(shop);
    prisma.device.findUnique.mockResolvedValue(device);
    prisma.attendance.findUnique.mockResolvedValueOnce(null); // duplicate-for-day check
    schedulesService.findApplicableSchedule.mockResolvedValue(schedule);
    penaltyCalculator.computeLateness.mockReturnValue({
      rawLatenessMinutes: 7,
      retainedLatenessMinutes: 0,
      isLate: false,
    });
    prisma.attendance.create.mockResolvedValue({
      id: "a1",
      worker: { firstName: "Jean", lastName: "Dupont" },
      checkInTime: new Date(baseDto.clientTimestamp),
      scheduledTime: new Date("2026-08-25T08:00:00.000Z"),
      latenessMinutes: 0,
      status: "ON_TIME",
    });

    const result = await service.checkIn(baseDto);

    expect(result.status).toBe("ON_TIME");
    expect(result.latenessMinutes).toBe(0);
    expect(result.penaltyAmount).toBeNull();
    expect(prisma.penalty.create).not.toHaveBeenCalled();
    expect(devicesService.touch).toHaveBeenCalledWith("d1");
  });

  it("enregistre un pointage EN RETARD et crée une pénalité PENDING", async () => {
    const lateDto = { ...baseDto, clientTimestamp: "2026-08-25T08:25:00.000Z" };
    prisma.attendance.findUnique.mockResolvedValueOnce(null);
    prisma.worker.findUnique.mockResolvedValue(worker);
    prisma.shop.findUnique.mockResolvedValue(shop);
    prisma.device.findUnique.mockResolvedValue(device);
    prisma.attendance.findUnique.mockResolvedValueOnce(null);
    schedulesService.findApplicableSchedule.mockResolvedValue(schedule);
    penaltyCalculator.computeLateness.mockReturnValue({
      rawLatenessMinutes: 25,
      retainedLatenessMinutes: 15,
      isLate: true,
    });
    penaltyCalculator.computePenaltyAmount.mockResolvedValue(1000);
    prisma.attendance.create.mockResolvedValue({
      id: "a2",
      worker: { firstName: "Jean", lastName: "Dupont" },
      checkInTime: new Date(lateDto.clientTimestamp),
      scheduledTime: new Date("2026-08-25T08:00:00.000Z"),
      latenessMinutes: 15,
      status: "LATE",
    });
    prisma.penalty.create.mockResolvedValue({ amount: 1000, status: "PENDING" });

    const result = await service.checkIn(lateDto);

    expect(result.status).toBe("LATE");
    expect(result.latenessMinutes).toBe(15);
    expect(result.penaltyAmount).toBe(1000);
    expect(result.penaltyStatus).toBe("PENDING");
    expect(prisma.penalty.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 1000, status: "PENDING" }),
      }),
    );
  });

  it("protection contre les doublons: rejoue le même clientRequestId sans créer de second pointage", async () => {
    const existing = {
      id: "a1",
      worker: { firstName: "Jean", lastName: "Dupont" },
      checkInTime: new Date(),
      scheduledTime: null,
      latenessMinutes: 0,
      status: "ON_TIME",
      penalty: null,
    };
    prisma.attendance.findUnique.mockResolvedValueOnce(existing);

    const result = await service.checkIn(baseDto);

    expect(result.attendanceId).toBe("a1");
    expect(prisma.worker.findUnique).not.toHaveBeenCalled();
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it("protection contre les doublons: un second pointage le même jour renvoie le pointage existant", async () => {
    const existingForDay = {
      id: "a1",
      worker: { firstName: "Jean", lastName: "Dupont" },
      checkInTime: new Date(),
      scheduledTime: null,
      latenessMinutes: 0,
      status: "ON_TIME",
      penalty: null,
    };
    prisma.attendance.findUnique
      .mockResolvedValueOnce(null) // idempotency check (new clientRequestId)
      .mockResolvedValueOnce(existingForDay); // same-day check finds an existing record
    prisma.worker.findUnique.mockResolvedValue(worker);
    prisma.shop.findUnique.mockResolvedValue(shop);
    prisma.device.findUnique.mockResolvedValue(device);

    const result = await service.checkIn({ ...baseDto, clientRequestId: "req-2" });

    expect(result.attendanceId).toBe("a1");
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });
});
