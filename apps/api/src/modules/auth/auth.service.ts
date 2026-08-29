import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { AuthRepository } from "./auth.repository";
import { AuditService } from "../audit/audit.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.repository.findUserByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const tokens = await this.issueTokens(user.id, user.email, user.role);

    await this.auditService.log({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
    });

    return {
      ...tokens,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async issueTokens(userId: string, email: string, role: string) {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
    });

    const refreshTokenRaw = crypto.randomBytes(48).toString("hex");
    const refreshTokenHash = crypto.createHash("sha256").update(refreshTokenRaw).digest("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.repository.createRefreshToken({
      tokenHash: refreshTokenHash,
      userId,
      expiresAt,
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }

  async refresh(refreshTokenRaw: string) {
    const tokenHash = crypto.createHash("sha256").update(refreshTokenRaw).digest("hex");
    const stored = await this.repository.findRefreshToken(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expirée, veuillez vous reconnecter.");
    }

    // Rotation: revoke the used refresh token and issue a new pair.
    await this.repository.revokeRefreshToken(stored.id);

    return this.issueTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(refreshTokenRaw: string) {
    const tokenHash = crypto.createHash("sha256").update(refreshTokenRaw).digest("hex");
    await this.repository.revokeRefreshTokensByHash(tokenHash);
    return { success: true };
  }

  async hashPassword(plain: string) {
    return argon2.hash(plain);
  }

  async registerWorkerAccount(email: string, plainPassword: string) {
    const existing = await this.repository.findUserByEmail(email);
    if (existing) {
      throw new ConflictException("Un compte existe déjà avec cet email.");
    }
    const passwordHash = await this.hashPassword(plainPassword);
    return this.repository.createUser({
      email,
      passwordHash,
      role: "WORKER",
    });
  }
}
