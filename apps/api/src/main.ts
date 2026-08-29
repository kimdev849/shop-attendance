import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] });

  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "*",
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ShopAttendance API")
    .setDescription(
      "API de gestion de présence, ponctualité et pénalités pour des travailleurs répartis dans plusieurs shops.",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`ShopAttendance API running on http://0.0.0.0:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs available on http://localhost:${port}/docs`);
}

bootstrap();