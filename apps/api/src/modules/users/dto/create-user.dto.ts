import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import { UserRole } from "@prisma/client";

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
