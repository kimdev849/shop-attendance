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
