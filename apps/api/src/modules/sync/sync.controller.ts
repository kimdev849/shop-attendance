import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { SyncAttendanceDto } from "./dto/sync-attendance.dto";
import { SyncService } from "./sync.service";

@ApiTags("sync")
@Controller({ path: "sync", version: "1" })
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Public()
  @Post("attendance")
  syncAttendance(@Body() dto: SyncAttendanceDto) {
    return this.syncService.syncAttendance(dto);
  }
}
