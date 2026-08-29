import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Sync.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class SyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByClientRequestId(clientRequestId: string) {
    return this.prisma.attendance.findUnique({
      where: { clientRequestId },
    });
  }
}
