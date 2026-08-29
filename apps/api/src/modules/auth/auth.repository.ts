import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Auth.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: { email: string; passwordHash: string; role: string }) {
    return this.prisma.user.create({
      data: {
        ...data,
        role: data.role as any,
      },
    });
  }

  async createRefreshToken(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  async findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
  }

  async revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeRefreshTokensByHash(tokenHash: string) {
    return this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
