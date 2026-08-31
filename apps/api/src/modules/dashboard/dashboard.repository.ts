import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Dashboard stats.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countShops() {
    return this.prisma.shop.count({ where: { status: "ACTIVE" } });
  }

  async countWorkers() {
    return this.prisma.worker.count({ where: { status: "ACTIVE" } });
  }

  async countTodayAttendance(status?: string) {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    return this.prisma.attendance.count({
      where: {
        attendanceDate: { gte: startOfDay, lt: endOfDay },
        status: status as any,
      },
    });
  }

  async sumPendingPenalties() {
    const result = await this.prisma.penalty.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async sumApprovedPenalties() {
    const result = await this.prisma.penalty.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async countDevices() {
    try {
      return await this.prisma.device.count();
    } catch {
      return 0;
    }
  }
}
