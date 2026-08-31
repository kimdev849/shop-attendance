import { Injectable, Logger } from "@nestjs/common";
import { DashboardRepository } from "./dashboard.repository";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly repository: DashboardRepository) {}

  async getStats() {
    try {
      const [totalShops, totalWorkers, totalDevices, presentToday, lateToday, absentToday, totalPenaltiesAmountPending, totalPenaltiesAmountApproved] =
        await Promise.all([
          this.repository.countShops(),
          this.repository.countWorkers(),
          this.repository.countDevices(),
          this.repository.countTodayAttendance("ON_TIME"),
          this.repository.countTodayAttendance("LATE"),
          this.repository.countTodayAttendance("ABSENT"),
          this.repository.sumPendingPenalties(),
          this.repository.sumApprovedPenalties(),
        ]);

      return {
        totalShops,
        totalWorkers,
        totalDevices,
        presentToday,
        lateToday,
        absentToday,
        totalPenaltiesAmountPending,
        totalPenaltiesAmountApproved,
      };
    } catch (err: any) {
      this.logger.error(`getStats failed: ${err?.message}`);
      return {
        totalShops: 0,
        totalWorkers: 0,
        totalDevices: 0,
        presentToday: 0,
        lateToday: 0,
        absentToday: 0,
        totalPenaltiesAmountPending: 0,
        totalPenaltiesAmountApproved: 0,
      };
    }
  }

  async getAttendanceByShop() {
    // TODO: Implement attendance aggregation by shop
    return [];
  }

  async getDailyTrend(days: number = 7) {
    // TODO: Implement daily trend data
    return [];
  }
}
