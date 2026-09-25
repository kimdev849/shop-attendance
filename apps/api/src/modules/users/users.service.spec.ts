import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { UsersService, Actor } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";

describe("UsersService — protection SUPER_ADMIN", () => {
  let service: UsersService;
  let repository: any;
  const superAdminUser = { id: "sa1", email: "support@x.com", role: "SUPER_ADMIN", isActive: true };
  const adminUser = { id: "a1", email: "admin@x.com", role: "ADMIN", isActive: true };

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((d: any) => ({ id: "new", ...d })),
      update: jest.fn().mockImplementation((_id: string, d: any) => ({ id: "a1", ...d })),
    };
    service = new UsersService(repository);
  });

  describe("create", () => {
    it("refuse la création d'un SUPER_ADMIN par un ADMIN", async () => {
      const dto = { email: "x@x.com", password: "password123", role: "SUPER_ADMIN" } as unknown as CreateUserDto;
      const actor: Actor = { userId: "a1", role: "ADMIN" };
      await expect(service.create(dto, actor)).rejects.toThrow(ForbiddenException);
    });

    it("autorise la création d'un SUPER_ADMIN par un SUPER_ADMIN", async () => {
      const dto = { email: "x@x.com", password: "password123", role: "SUPER_ADMIN" } as unknown as CreateUserDto;
      const actor: Actor = { userId: "sa1", role: "SUPER_ADMIN" };
      await expect(service.create(dto, actor)).resolves.toBeDefined();
    });
  });

  describe("findAll", () => {
    it("exclut les SUPER_ADMIN de la liste", async () => {
      await service.findAll({});
      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: { not: "SUPER_ADMIN" } }),
        }),
      );
    });
  });

  describe("findOne / update / activate / deactivate", () => {
    it("masque un SUPER_ADMIN à un ADMIN (404)", async () => {
      repository.findById.mockResolvedValue(superAdminUser);
      const actor: Actor = { userId: "a1", role: "ADMIN" };
      await expect(service.findOne("sa1", actor)).rejects.toThrow(NotFoundException);
      await expect(service.update("sa1", { role: "WORKER" } as any, actor)).rejects.toThrow(NotFoundException);
      await expect(service.deactivate("sa1", actor)).rejects.toThrow(NotFoundException);
      await expect(service.activate("sa1", actor)).rejects.toThrow(NotFoundException);
    });

    it("laisse un SUPER_ADMIN gérer un autre SUPER_ADMIN", async () => {
      repository.findById.mockResolvedValue(superAdminUser);
      const actor: Actor = { userId: "sa1", role: "SUPER_ADMIN" };
      await expect(service.findOne("sa1", actor)).resolves.toBeDefined();
      await expect(service.update("sa1", { role: "SUPER_ADMIN" } as any, actor)).resolves.toBeDefined();
    });

    it("refuse la promotion en SUPER_ADMIN par un ADMIN", async () => {
      repository.findById.mockResolvedValue(adminUser);
      const actor: Actor = { userId: "a1", role: "ADMIN" };
      await expect(service.update("a1", { role: "SUPER_ADMIN" } as any, actor)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("refuse de renvoyer un utilisateur inexistant (404 standard)", async () => {
      repository.findById.mockResolvedValue(null);
      const actor: Actor = { userId: "a1", role: "ADMIN" };
      await expect(service.findOne("nope", actor)).rejects.toThrow(NotFoundException);
    });
  });
});
