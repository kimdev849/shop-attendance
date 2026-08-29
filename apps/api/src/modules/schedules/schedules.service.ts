import { Injectable, NotFoundException } from "@nestjs/common";
import { DayOfWeek } from "@prisma/client";
import { SchedulesRepository } from "./schedules.repository";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";

@Injectable()
export class SchedulesService {
  constructor(private readonly repository: SchedulesRepository) {}

  findAll(params: { workerId?: string; shopId?: string; dayOfWeek?: DayOfWeek }) {
    return this.repository.findMany(params);
  }

  async findOne(id: string) {
    const schedule = await this.repository.findById(id);
    if (!schedule) throw new NotFoundException("Horaire introuvable.");
    return schedule;
  }

  async findApplicableSchedule(workerId: string, date: Date) {
    const dayOfWeek = this.getDayOfWeek(date);
    return this.repository.findApplicable(workerId, dayOfWeek);
  }

  async upsert(workerId: string, shopId: string, dayOfWeek: DayOfWeek, dto: UpdateScheduleDto) {
    return this.repository.upsert({
      workerId,
      shopId,
      dayOfWeek,
      startTime: dto.startTime ?? "08:00",
      endTime: dto.endTime ?? "17:00",
      toleranceMinutes: dto.toleranceMinutes ?? 10,
    });
  }

  async update(id: string, dto: any) {
    const existing = await this.findOne(id) as any;
    // Update only the fields that are provided
    return this.repository.upsert({
      workerId: existing.workerId,
      shopId: existing.shopId,
      dayOfWeek: existing.dayOfWeek,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
      toleranceMinutes: dto.toleranceMinutes ?? existing.toleranceMinutes,
    });
  }

  async remove(id: string) {
    // Soft delete or actual delete depending on business rules
    return this.repository.delete(id);
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[date.getUTCDay()];
  }
}
