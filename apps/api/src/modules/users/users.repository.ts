import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Repository responsible for all database operations related to Users.
 * Service → Repository → Prisma → Database
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findMany(params: { where?: any; orderBy?: any; skip?: number; take?: number }) {
    return this.prisma.user.findMany({
      where: params.where,
      orderBy: params.orderBy ?? { email: "asc" },
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async count(where?: any) {
    return this.prisma.user.count({ where });
  }

  async create(data: { email: string; passwordHash: string; role: string }) {
    return this.prisma.user.create({
      data: {
        ...data,
        role: data.role as any,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
