import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AttendanceService } from "./attendance.service";
import { AttendanceRepository } from "./attendance.repository";

describe("AttendanceService", () => {
  let service: AttendanceService;
  let repository: any;
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
    repository = {
      findByClientRequestId: jest.fn().mockResolvedValue(null),
      findByWorkerAndDate: jest.fn().mockResolvedValue(null),
      findWorkerById: jest.fn(),
      findShopById: jest.fn(),
      findDeviceByIdOrIdentifier: jest.fn(),
      create: jest.fn(),
      createPenalty: jest.fn(),
      updateCheckOut: jest.fn(),
      updateCheckInPhoto: jest.fn(),
    };
    auditService = { log: jest.fn() };
    devicesService = { touch: jest.fn().mockResolvedValue({}) };
    schedulesService = { findApplicableSchedule: jest.fn() };
    penaltyCalculator = { computeLateness: jest.fn(), computePenaltyAmount: jest.fn() };

    service = new AttendanceService(
      repository,
      auditService,
      devicesService,
      schedulesService,
      penaltyCalculator,
      { uploadCheckInPhoto: jest.fn().mockResolvedValue(null) } as any,
    );
  });

  it("rejette le pointage sans confirmation biométrique", async () => {
    repository.findWorkerById.mockResolvedValue(worker);
    repository.findShopById.mockResolvedValue(shop);
    repository.findDeviceByIdOrIdentifier.mockResolvedValue(device);

    await expect(
      service.checkIn({ ...baseDto, biometricConfirmed: false }),
    ).rejects.toThrow(BadRequestException);
  });

  it("rejette le pointage pour un travailleur introuvable", async () => {
    repository.findWorkerById.mockResolvedValue(null);

    await expect(service.checkIn(baseDto)).rejects.toThrow(NotFoundException);
  });

  it("rejette le pointage pour une tablette introuvable (deviceId inconnu)", async () => {
    repository.findWorkerById.mockResolvedValue(worker);
    repository.findShopById.mockResolvedValue(shop);
    repository.findDeviceByIdOrIdentifier.mockResolvedValue(null);

    await expect(service.checkIn(baseDto)).rejects.toThrow(NotFoundException);
  });

  it("résout la tablette via deviceIdentifier (fallback compat tablettes déjà appairées)", async () => {
    repository.findWorkerById.mockResolvedValue(worker);
    repository.findShopById.mockResolvedValue(shop);
    // La config locale des anciennes tablettes stocke deviceIdentifier, pas l'UUID
    repository.findDeviceByIdOrIdentifier.mockResolvedValue(device);
    // biometricConfirmed:false → échoue juste APRÈS la résolution du device
    const legacyDto = { ...baseDto, deviceId: "TAB-LEGACY", biometricConfirmed: false };

    await expect(service.checkIn(legacyDto)).rejects.toThrow(BadRequestException);
    expect(repository.findDeviceByIdOrIdentifier).toHaveBeenCalledWith("TAB-LEGACY");
  });

  it("enregistre un pointage À L'HEURE sans pénalité (arrivée dans la tolérance)", async () => {
    repository.findWorkerById.mockResolvedValue(worker);
    repository.findShopById.mockResolvedValue(shop);
    repository.findDeviceByIdOrIdentifier.mockResolvedValue(device);
    schedulesService.findApplicableSchedule.mockResolvedValue(schedule);
    penaltyCalculator.computeLateness.mockReturnValue({
      rawLatenessMinutes: 7,
      retainedLatenessMinutes: 0,
      isLate: false,
    });
    repository.create.mockResolvedValue({
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
    expect(repository.createPenalty).not.toHaveBeenCalled();
    expect(devicesService.touch).toHaveBeenCalledWith("d1");
  });

  it("enregistre un pointage EN RETARD et crée une pénalité PENDING", async () => {
    const lateDto = { ...baseDto, clientTimestamp: "2026-08-25T08:25:00.000Z" };
    repository.findWorkerById.mockResolvedValue(worker);
    repository.findShopById.mockResolvedValue(shop);
    repository.findDeviceByIdOrIdentifier.mockResolvedValue(device);
    schedulesService.findApplicableSchedule.mockResolvedValue(schedule);
    penaltyCalculator.computeLateness.mockReturnValue({
      rawLatenessMinutes: 25,
      retainedLatenessMinutes: 15,
      isLate: true,
    });
    penaltyCalculator.computePenaltyAmount.mockResolvedValue(1000);
    repository.create.mockResolvedValue({
      id: "a2",
      worker: { firstName: "Jean", lastName: "Dupont" },
      checkInTime: new Date(lateDto.clientTimestamp),
      scheduledTime: new Date("2026-08-25T08:00:00.000Z"),
      latenessMinutes: 15,
      status: "LATE",
    });
    repository.createPenalty.mockResolvedValue({ amount: 1000, status: "PENDING" });

    const result = await service.checkIn(lateDto);

    expect(result.status).toBe("LATE");
    expect(result.latenessMinutes).toBe(15);
    expect(result.penaltyAmount).toBe(1000);
    expect(result.penaltyStatus).toBe("PENDING");
    expect(repository.createPenalty).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        status: "PENDING",
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
    repository.findByClientRequestId.mockResolvedValueOnce(existing);

    const result = await service.checkIn(baseDto);

    expect(result.attendanceId).toBe("a1");
    expect(repository.findWorkerById).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
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
    repository.findByWorkerAndDate.mockResolvedValueOnce(existingForDay);
    repository.findWorkerById.mockResolvedValue(worker);
    repository.findShopById.mockResolvedValue(shop);
    repository.findDeviceByIdOrIdentifier.mockResolvedValue(device);

    const result = await service.checkIn({ ...baseDto, clientRequestId: "req-2", type: "CHECK_IN" });

    expect(result.attendanceId).toBe("a1");
    expect(repository.create).not.toHaveBeenCalled();
  });
});
