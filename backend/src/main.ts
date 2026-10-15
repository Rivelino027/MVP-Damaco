import * as dotenv from 'dotenv';
dotenv.config();

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  const env = validateEnv(process.env);
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  // Keamanan: Aktifkan helmet
  app.use(helmet());

  // Validasi input global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Keamanan: CORS terbatas (daftar origin dari env CORS_ORIGINS, dipisah koma)
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (mobile apps, curl, Postman) atau origin yang terdaftar
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS diblokir untuk origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client', 'Accept'],
    credentials: true,
  });

  // Dokumentasi Swagger di /docs-api
  const config = new DocumentBuilder()
    .setTitle('BudgetFlow API')
    .setDescription(
      'Dokumentasi API BudgetFlow - Manajemen Proyek & Budgeting PT. Dunia Maya Communica',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs-api', app, document);

  await app.listen(env.PORT, '0.0.0.0');

  logger.log(`🚀 Aplikasi BudgetFlow backend berjalan di port ${env.PORT}`);
  logger.log(
    `📚 Swagger API Docs tersedia di http://127.0.0.1:${env.PORT}/docs-api`,
  );
  logger.log(`🩺 Health check tersedia di http://127.0.0.1:${env.PORT}/health`);
}

bootstrap().catch((error) => {
  console.error('\n' + error.message + '\n');
  process.exit(1);
});
