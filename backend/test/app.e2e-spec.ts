import * as dotenv from 'dotenv';
dotenv.config();

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import helmet from 'helmet';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BudgetFlow API (e2e)', () => {
  let app: INestApplication;

  const allowedOrigins = [
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Terapkan middleware keamanan helmet & CORS sesuai main.ts
    app.use(helmet());
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS diblokir untuk origin: ${origin}`));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    });

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  describe('Health Endpoint (/health)', () => {
    it('GET /health - harus mengembalikan 200 OK dengan database connected', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.database).toHaveProperty('status', 'connected');
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('GET /health - harus memiliki header keamanan helmet', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('CORS Restrictions', () => {
    it('harus mengizinkan request dari origin yang sah (misal: http://localhost:5173)', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:5173',
      );
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('harus memblokir request dari origin yang tidak diizinkan dan tidak menyertakan Access-Control-Allow-Origin', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .set('Origin', 'http://unauthorized-domain.com');

      expect(response.status).toBe(500);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('GET /unknown-route - harus mengembalikan 404 Not Found', async () => {
      await request(app.getHttpServer()).get('/unknown-route').expect(404);
    });
  });
});
