import { Injectable, Logger } from "@nestjs/common";
import { AttendanceService } from "../attendance/attendance.service";
import { DevicesService } from "../devices/devices.service";
import { SyncRepository } from "./sync.repository";
import { SyncAttendanceDto } from "./dto/sync-attendance.dto";

/**
 * Rejoue côté serveur la file d'attente de pointages accumulée hors ligne
 * par la tablette (README §11 "Mode offline"). Chaque élément est traité
 * indépendamment et de façon IDEMPOTENTE via AttendanceService.checkIn, qui
 * déduplique déjà sur `clientRequestId`. Un item en échec n'interrompt pas
 * le traitement des suivants: le client reçoit un résultat par item et ne
 * retire de sa file locale que les items marqués CREATED ou DUPLICATE.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly repository: SyncRepository,
    private readonly attendanceService: AttendanceService,
    private readonly devicesService: DevicesService,
  ) {}

  async syncAttendance(dto: SyncAttendanceDto) {
    const items = dto.items;
    const results: any[] = [];

    for (const item of items) {
      try {
        const result = await this.attendanceService.checkIn({
          workerId: item.workerId,
          shopId: item.shopId,
          deviceId: item.deviceId,
          clientTimestamp: item.clientTimestamp,
          clientRequestId: item.clientRequestId,
          biometricConfirmed: item.biometricConfirmed,
        });

        results.push({
          clientRequestId: item.clientRequestId,
          status: "CREATED",
          attendanceId: result.attendanceId,
        });
      } catch (error: any) {
        // Check if it's a duplicate (idempotent)
        if (error?.message?.includes("déjà") || error?.status === 409) {
          results.push({
            clientRequestId: item.clientRequestId,
            status: "DUPLICATE",
          });
        } else {
          this.logger.error(`Sync failed for ${item.clientRequestId}: ${error.message}`);
          results.push({
            clientRequestId: item.clientRequestId,
            status: "ERROR",
            error: error.message,
          });
        }
      }
    }

    return results;
  }
}
