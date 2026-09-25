import { ConflictException, UnauthorizedException } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";

jest.mock("argon2", () => ({
  verify: jest.fn(),
  hash: jest.fn().mockResolvedValue("new-hash"),
}));

describe("AuthService — changePassword", () => {
  let service: AuthService;
  let repository: any;
  let auditService: any;

  beforeEach(() => {
    repository = {
      findUserById: jest.fn(),
      updateUserPassword: jest.fn().mockResolvedValue({}),
      revokeAllRefreshTokensForUser: jest.fn().mockResolvedValue({ count: 2 }),
    };
    auditService = { log: jest.fn() };
    service = new AuthService(repository, {} as any, auditService);
  });

  it("refuse si le mot de passe actuel est incorrect", async () => {
    repository.findUserById.mockResolvedValue({ id: "u1", isActive: true, passwordHash: "hash" });
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    await expect(service.changePassword("u1", "wrong", "NewPass123!")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.updateUserPassword).not.toHaveBeenCalled();
  });

  it("refuse si le nouveau mot de passe est identique à l'actuel", async () => {
    repository.findUserById.mockResolvedValue({ id: "u1", isActive: true, passwordHash: "hash" });
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    await expect(service.changePassword("u1", "same", "same")).rejects.toThrow(ConflictException);
  });

  it("refuse un utilisateur inexistant ou désactivé", async () => {
    repository.findUserById.mockResolvedValue(null);
    await expect(service.changePassword("u1", "x", "NewPass123!")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("met à jour le hash, révoque les sessions et journalise", async () => {
    repository.findUserById.mockResolvedValue({ id: "u1", isActive: true, passwordHash: "hash" });
    (argon2.verify as jest.Mock)
      .mockResolvedValueOnce(true) // mot de passe actuel valide
      .mockResolvedValueOnce(false); // nouveau différent de l'actuel

    const result = await service.changePassword("u1", "old", "NewPass123!");

    expect(result.success).toBe(true);
    expect(repository.updateUserPassword).toHaveBeenCalledWith("u1", "new-hash");
    expect(repository.revokeAllRefreshTokensForUser).toHaveBeenCalledWith("u1");
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PASSWORD_CHANGED", userId: "u1" }),
    );
  });
});
