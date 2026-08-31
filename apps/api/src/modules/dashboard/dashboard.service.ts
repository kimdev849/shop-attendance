import { Injectable } from "@nestjs/common";
import { DashboardRepository } from "./dashboard.repository";

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getStats() {
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
