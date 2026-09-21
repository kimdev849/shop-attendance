import { Injectable } from "@nestjs/common";
import { AttendanceStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Attendance.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByClientRequestId(clientRequestId: string) {
    return this.prisma.attendance.findUnique({
      where: { clientRequestId },
      include: { worker: true, penalty: true },
    });
  }

  async findByWorkerAndDate(workerId: string, attendanceDate: Date) {
    return this.prisma.attendance.findUnique({
      where: { workerId_attendanceDate: { workerId, attendanceDate } },
      include: { worker: true, penalty: true },
    });
  }

  async create(data: {
    workerId: string;
    shopId: string;
    deviceId: string;
    attendanceDate: Date;
    scheduledTime: Date | null;
    checkInTime: Date;
    latenessMinutes: number;
    status: AttendanceStatus;
    syncStatus: string;
    clientRequestId: string;
    checkInPhotoUrl?: string | null;
    checkInPhotoExpiresAt?: Date | null;
  }) {
    return this.prisma.attendance.create({
      data: {
        ...data,
        status: data.status as any,
        syncStatus: data.syncStatus as any,
      },
      include: { worker: true },
    });
  }

  async findMany(params: {
    where: any;
    include?: any;
    orderBy: any;
    skip: number;
    take: number;
  }) {
    return this.prisma.attendance.findMany({
      where: params.where,
      include: params.include ?? {
        worker: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
        shop: { select: { id: true, name: true, code: true } },
        device: { select: { id: true, name: true } },
        penalty: true,
      },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
    });
  }

  async updateCheckOut(id: string, checkOutTime: Date) {
    return this.prisma.attendance.update({
      where: { id },
      data: { checkOutTime },
      include: { worker: true, penalty: true },
    });
  }

  async updateCheckInPhoto(id: string, checkInPhotoUrl: string, checkInPhotoExpiresAt: Date) {
    return this.prisma.attendance.update({
      where: { id },
      data: { checkInPhotoUrl, checkInPhotoExpiresAt },
      include: { worker: true, penalty: true },
    });
  }

  async count(where: any) {
    return this.prisma.attendance.count({ where });
  }

  async findById(id: string) {
    return this.prisma.attendance.findUnique({
      where: { id },
      include: { worker: true, shop: true, device: true, penalty: true },
    });
  }

  async findWorkerById(id: string) {
    return this.prisma.worker.findUnique({ where: { id } });
  }

  async findShopById(id: string) {
    return this.prisma.shop.findUnique({ where: { id } });
  }

  async findDeviceById(id: string) {
    return this.prisma.device.findUnique({ where: { id } });
  }

  /**
   * Résout une tablette par son UUID (clé primaire) OU son identifiant matériel
   * (deviceIdentifier, ex: "TAB-XYZ"). Compatibilité avec les tablettes déjà
   * appairées qui stockent deviceIdentifier comme deviceId dans leur config
   * locale — sans ce fallback, chaque pointage rejoué échouait en
   * "Tablette introuvable" et restait bloqué dans la file de sync.
   */
  async findDeviceByIdOrIdentifier(idOrIdentifier: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrIdentifier);
    if (isUuid) {
      const byId = await this.prisma.device.findUnique({ where: { id: idOrIdentifier } });
      if (byId) return byId;
    }
    return this.prisma.device.findUnique({ where: { deviceIdentifier: idOrIdentifier } });
  }

  async createPenalty(data: {
    workerId: string;
    attendanceId: string;
    amount: number;
    reason: string;
    status: string;
  }) {
    return this.prisma.penalty.create({
      data: {
        ...data,
        status: data.status as any,
      },
    });
  }
}
