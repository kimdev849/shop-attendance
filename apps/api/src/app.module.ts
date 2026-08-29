import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { PrismaModule } from "./prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkersModule } from "./modules/workers/workers.module";
import { ShopsModule } from "./modules/shops/shops.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { SchedulesModule } from "./modules/schedules/schedules.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { AbsencesModule } from "./modules/absences/absences.module";
import { PenaltiesModule } from "./modules/penalties/penalties.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";
import { SyncModule } from "./modules/sync/sync.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,

    AuthModule,
    UsersModule,
    WorkersModule,
    ShopsModule,
    DevicesModule,
    SchedulesModule,
    AttendanceModule,
    AbsencesModule,
    PenaltiesModule,
    ReportsModule,
    NotificationsModule,
    AuditModule,
    SyncModule,
    DashboardModule,
  ],
  providers: [
    // JwtAuthGuard global: toute route est protégée par défaut, sauf celles
    // marquées @Public() (login, check-in tablette, sync offline...).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
