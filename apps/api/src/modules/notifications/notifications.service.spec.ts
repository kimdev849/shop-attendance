import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      findAdminUsers: jest.fn().mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]),
    };
    service = new NotificationsService(repository);
  });

  describe("findAll", () => {
    it("liste les notifications de l'utilisateur avec pagination", async () => {
      repository.findMany.mockResolvedValue([{ id: "n1" }]);
      repository.count.mockResolvedValue(21);

      const result = await service.findAll({ userId: "u1", page: 2, limit: 20 });

      expect(result.total).toBe(21);
      expect(result.totalPages).toBe(2);
      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1" }, skip: 20, take: 20 }),
      );
    });

    it("filtre par statut lu / non lu", async () => {
      await service.findAll({ userId: "u1", read: false });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "u1", readAt: null } }),
      );
    });
  });

  describe("countUnread", () => {
    it("compte les notifications non lues de l'utilisateur", async () => {
      repository.count.mockResolvedValue(7);

      const result = await service.countUnread("u1");

      expect(result).toBe(7);
      expect(repository.count).toHaveBeenCalledWith({ userId: "u1", readAt: null });
    });
  });

  describe("markAsRead", () => {
    it("marque une notification de l'utilisateur comme lue", async () => {
      repository.findMany.mockResolvedValue([{ id: "n1", userId: "u1" }]);

      await service.markAsRead("n1", "u1");

      expect(repository.markAsRead).toHaveBeenCalledWith("n1");
    });

    it("refuse une notification qui n'appartient pas à l'utilisateur", async () => {
      repository.findMany.mockResolvedValue([]);

      await expect(service.markAsRead("n2", "u1")).rejects.toThrow(NotFoundException);
      expect(repository.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    it("marque toutes les notifications de l'utilisateur comme lues", async () => {
      await service.markAllAsRead("u1");

      expect(repository.markAllAsRead).toHaveBeenCalledWith("u1");
    });
  });

  describe("notifyAdmins", () => {
    it("émet une notification pour chaque admin actif", async () => {
      await service.notifyAdmins({
        type: "LATE_CHECK_IN" as any,
        title: "Retard au pointage",
        message: "Jean est en retard.",
        entity: "Attendance",
        entityId: "a1",
      });

      expect(repository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ userId: "admin-1", title: "Retard au pointage" }),
        expect.objectContaining({ userId: "admin-2", title: "Retard au pointage" }),
      ]);
    });

    it("n'émet rien si aucun admin actif", async () => {
      repository.findAdminUsers.mockResolvedValue([]);

      await service.notifyAdmins({ type: "SYSTEM" as any, title: "T", message: "M" });

      expect(repository.createMany).not.toHaveBeenCalled();
    });

    it("avale les erreurs pour ne jamais bloquer l'opération métier", async () => {
      repository.findAdminUsers.mockRejectedValue(new Error("db down"));

      await expect(
        service.notifyAdmins({ type: "SYSTEM" as any, title: "T", message: "M" }),
      ).resolves.toBeUndefined();
    });
  });
});
