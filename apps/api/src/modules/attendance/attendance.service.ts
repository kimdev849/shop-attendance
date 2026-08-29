import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AttendanceStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { DevicesService } from "../devices/devices.service";
import { SchedulesService } from "../schedules/schedules.service";
import { PenaltyCalculatorService } from "../penalties/penalty-calculator.service";
import { AttendanceRepository } from "./attendance.repository";
import { CheckInDto } from "./dto/check-in.dto";
import { QueryAttendanceDto } from "./dto/query-attendance.dto";
import { CheckInResult, LatenessResult } from "./types/attendance.types";

/**
 * Cœur métier du pointage. Implémente les 10 étapes décrites dans le cahier
 * des charges (README §8):
 *   1. vérifier le travailleur
 *   2. vérifier le shop
 *   3. vérifier le device
 *   4. récupérer l'horaire applicable
 *   5. déterminer l'heure prévue
 *   6. calculer le retard
 *   7. déterminer le statut
 *   8. calculer éventuellement la pénalité
 *   9. enregistrer le pointage
 *   10. retourner le résultat
 *
 * L'idempotence (clientRequestId unique) permet à ce même service d'être
 * appelé indifféremment par POST /attendance/check-in (tablette en ligne) ou
 * par POST /sync/attendance (rattrapage après une période hors ligne).
 */
@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly repository: AttendanceRepository,
    private readonly auditService: AuditService,
    private readonly devicesService: DevicesService,
    private readonly schedulesService: SchedulesService,
    private readonly penaltyCalculator: PenaltyCalculatorService,
  ) {}

  async checkIn(dto: CheckInDto): Promise<CheckInResult> {
    // Idempotence: si ce clientRequestId a déjà été traité (pointage en ligne
    // rejoué, ou resynchronisation d'un pointage déjà envoyé), on retourne le
    // résultat existant au lieu de créer un doublon.
    const existingByRequestId = await this.repository.findByClientRequestId(dto.clientRequestId);
    if (existingByRequestId) {
      return this.toResult(existingByRequestId, existingByRequestId.penalty);
    }

    // 1. Vérifier le travailleur
    const worker = await this.repository.findWorkerById(dto.workerId);
    if (!worker) throw new NotFoundException("Travailleur introuvable.");
    if (worker.status !== "ACTIVE") {
      throw new BadRequestException("Ce travailleur n'est pas actif.");
    }

    // 2. Vérifier le shop
    const shop = await this.repository.findShopById(dto.shopId);
    if (!shop) throw new NotFoundException("Shop introuvable.");
    if (shop.status !== "ACTIVE") {
      throw new BadRequestException("Ce shop n'est pas actif.");
    }
    if (worker.shopId !== shop.id) {
      throw new BadRequestException("Ce travailleur n'est pas affecté à ce shop.");
    }

    // 3. Vérifier le device
    const device = await this.repository.findDeviceById(dto.deviceId);
    if (!device) throw new NotFoundException("Tablette introuvable.");
    if (device.shopId !== shop.id) {
      throw new BadRequestException("Cette tablette n'est pas rattachée à ce shop.");
    }

    if (!dto.biometricConfirmed) {
      throw new BadRequestException(
        "La vérification biométrique locale est requise avant de pouvoir pointer.",
      );
    }

    const checkInTime = new Date(dto.clientTimestamp);
    const attendanceDate = this.dateOnly(checkInTime);

    // Protection anti-doublon supplémentaire: un seul pointage par travailleur
    // et par jour calendaire (contrainte unique en base, vérifiée ici aussi
    // pour renvoyer un message clair plutôt qu'une erreur SQL brute).
    const existingForDay = await this.repository.findByWorkerAndDate(worker.id, attendanceDate);
    if (existingForDay) {
      return this.toResult(existingForDay, existingForDay.penalty);
    }

    // 4. Récupérer l'horaire applicable
    const schedule = await this.schedulesService.findApplicableSchedule(worker.id, checkInTime);

    // 5. Déterminer l'heure prévue + 6. calculer le retard + 7. déterminer le statut
    let scheduledDateTime: Date | null = null;
    let latenessMinutes = 0;
    let status: AttendanceStatus = AttendanceStatus.ON_TIME;

    if (schedule) {
      scheduledDateTime = this.combineDateAndTime(attendanceDate, schedule.startTime);
      const lateness: LatenessResult = this.penaltyCalculator.computeLateness(
        scheduledDateTime,
        checkInTime,
        schedule.toleranceMinutes,
      );
      latenessMinutes = lateness.retainedLatenessMinutes;
      status = lateness.isLate ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME;
    } else {
      // Aucun horaire configuré pour ce jour: on enregistre quand même le
      // pointage (présence actée) mais sans pouvoir calculer de retard.
      this.logger.warn(
        `No schedule found for worker ${worker.id} on ${attendanceDate.toISOString()}; recording as ON_TIME without lateness calculation.`,
      );
    }

    // 8. Calculer éventuellement la pénalité
    const penaltyAmount =
      status === AttendanceStatus.LATE
        ? await this.penaltyCalculator.computePenaltyAmount(latenessMinutes)
        : 0;

    // 9. Enregistrer le pointage (+ pénalité PENDING si applicable)
    let attendance;
    try {
      attendance = await this.repository.create({
        workerId: worker.id,
        shopId: shop.id,
        deviceId: device.id,
        attendanceDate,
        scheduledTime: scheduledDateTime,
        checkInTime,
        latenessMinutes,
        status,
        syncStatus: "SYNCED",
        clientRequestId: dto.clientRequestId,
      });
    } catch (error: any) {
      // Race condition: un autre appel concurrent (ex: double-tap ou retry
      // réseau) a créé l'enregistrement entre-temps. On récupère l'existant
      // plutôt que d'échouer, pour garantir l'idempotence bout-en-bout.
      if (error?.code === "P2002") {
        const race = await this.repository.findByWorkerAndDate(worker.id, attendanceDate);
        if (race) return this.toResult(race, race.penalty);
      }
      throw error;
    }

    let penalty: any = null;
    if (status === AttendanceStatus.LATE && penaltyAmount > 0) {
      penalty = await this.repository.createPenalty({
        workerId: worker.id,
        attendanceId: attendance.id,
        amount: penaltyAmount,
        reason: `Retard de ${latenessMinutes} minute(s) retenue(s) (tolérance déjà déduite).`,
        status: "PENDING",
      });
    }

    await this.devicesService.touch(device.id);

    await this.auditService.log({
      action: "ATTENDANCE_CHECK_IN",
      entity: "Attendance",
      entityId: attendance.id,
      metadata: {
        employeeNumber: worker.employeeNumber,
        firstName: worker.firstName,
        lastName: worker.lastName,
        name: shop.name,
        code: shop.code,
        status,
        latenessMinutes,
      },
    });

    // 10. Retourner le résultat
    return this.toResult(attendance, penalty);
  }

  async findAll(query: QueryAttendanceDto) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const sortOrder = query.sortOrder ?? 'desc';

    const where: any = {
      shopId: query.shopId ?? undefined,
      workerId: query.workerId ?? undefined,
      status: query.status ?? undefined,
      attendanceDate: {
        gte: query.from ? this.dateOnly(new Date(query.from)) : undefined,
        lte: query.to ? this.dateOnly(new Date(query.to)) : undefined,
      },
    };

    if (query.search) {
      where.worker = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { employeeNumber: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const allowedSortFields: Record<string, any> = {
      attendanceDate: { attendanceDate: sortOrder },
      checkInTime: { checkInTime: sortOrder },
      latenessMinutes: { latenessMinutes: sortOrder },
      status: { status: sortOrder },
    };

    const orderBy = allowedSortFields[query.sortBy ?? ''] ?? { checkInTime: 'desc' };

    const [data, total] = await Promise.all([
      this.repository.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.repository.count(where),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const attendance = await this.repository.findById(id);
    if (!attendance) throw new NotFoundException("Pointage introuvable.");
    return attendance;
  }

  private dateOnly(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private combineDateAndTime(attendanceDate: Date, time: string): Date {
    const [hours, minutes] = time.split(":").map(Number);
    const combined = new Date(attendanceDate);
    combined.setUTCHours(hours, minutes, 0, 0);
    return combined;
  }

  private toResult(attendance: any, penalty: any): CheckInResult {
    return {
      attendanceId: attendance.id,
      workerFullName: `${attendance.worker.firstName} ${attendance.worker.lastName}`,
      checkInTime: attendance.checkInTime,
      scheduledTime: attendance.scheduledTime,
      latenessMinutes: attendance.latenessMinutes,
      status: attendance.status,
      penaltyAmount: penalty?.amount ?? null,
      penaltyStatus: penalty?.status ?? null,
    };
  }
}
