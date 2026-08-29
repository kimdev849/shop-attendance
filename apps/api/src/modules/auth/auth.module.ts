import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "15m" },
    }),
    UsersModule,
    AuditModule,
  ],
  providers: [AuthService, AuthRepository, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
