import * as dotenv from 'dotenv';
dotenv.config();

const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'mysql://root@127.0.0.1:3306/budgetflow_test';
process.env.DATABASE_URL = testDbUrl;

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BudgetRequestStatus,
  BudgetRequestType,
  BudgetStatus,
  PrismaClient,
  ProjectStatus,
  Role,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Budgets & Budget Requests Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const TEST_PASSWORD = 'PasswordBudgetsE2E123!';
  const PREFIX = 'e2e-bdg-';

  let deptAId: string;
  let deptBId: string;
  let ccDeptAId: string;
  let catMaterialId: string;
  let catJasaId: string;

  let penggunaUser: any;
  let adminAUser: any;
  let adminBUser: any;
  let financeUser: any;
  let superAdminUser: any;

  let penggunaToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let financeToken: string;
  let superAdminToken: string;

  let projectAId: string;

  const cleanTestData = async () => {
    const currentDbUrl = process.env.DATABASE_URL || '';
    if (!currentDbUrl.includes('budgetflow_test')) {
      throw new Error(
        `Operasi pembersihan dibatalkan: DATABASE_URL bukan 'budgetflow_test'!`,
      );
    }

    const projectIds = (
      await prisma.project.findMany({
        where: { name: { startsWith: 'E2E-PROJ-BDG-' } },
        select: { id: true },
      })
    ).map((p) => p.id);

    if (projectIds.length > 0) {
      await prisma.budgetItem.deleteMany({
        where: { budget: { projectId: { in: projectIds } } },
      });
      await prisma.budget.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.budgetRequestItem.deleteMany({
        where: { request: { projectId: { in: projectIds } } },
      });
      await prisma.approval.deleteMany({
        where: {
          documentType: 'budget_request',
        },
      });
      await prisma.budgetRequest.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.projectMember.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.task.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.project.deleteMany({
        where: { id: { in: projectIds } },
      });
    }

    await prisma.expenseCategory.deleteMany({
      where: { name: { startsWith: 'E2E-CAT-BDG-' } },
    });
    await prisma.costCenter.deleteMany({
      where: { code: { startsWith: 'E2E-CC-BDG-' } },
    });
    await prisma.department.deleteMany({
      where: { name: { startsWith: 'E2E-DEPT-BDG-' } },
    });

    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE `activity_logs`');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    await prisma.user.deleteMany({
      where: { email: { startsWith: PREFIX } },
    });
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });
    await prisma.$connect();

    await cleanTestData();

    // 1. Departemen & Cost Center & Kategori Biaya
    const deptA = await prisma.department.create({
      data: { name: 'E2E-DEPT-BDG-A', isActive: true },
    });
    deptAId = deptA.id;

    const deptB = await prisma.department.create({
      data: { name: 'E2E-DEPT-BDG-B', isActive: true },
    });
    deptBId = deptB.id;

    const ccA = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-BDG-A',
        name: 'CC BDG A',
        departmentId: deptAId,
        isActive: true,
      },
    });
    ccDeptAId = ccA.id;

    const catMat = await prisma.expenseCategory.create({
      data: {
        name: 'E2E-CAT-BDG-MATERIAL',
        code: 'CAT-MAT-BDG',
        isActive: true,
      },
    });
    catMaterialId = catMat.id;

    const catJasa = await prisma.expenseCategory.create({
      data: {
        name: 'E2E-CAT-BDG-JASA',
        code: 'CAT-JASA-BDG',
        isActive: true,
      },
    });
    catJasaId = catJasa.id;

    // 2. Akun Pengguna
    const passwordHash = await argon2.hash(TEST_PASSWORD);

    penggunaUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna BDG',
        email: `${PREFIX}pengguna@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminAUser = await prisma.user.create({
      data: {
        name: 'E2E Admin BDG A',
        email: `${PREFIX}admin-a@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminBUser = await prisma.user.create({
      data: {
        name: 'E2E Admin BDG B',
        email: `${PREFIX}admin-b@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptBId,
        isActive: true,
      },
    });

    financeUser = await prisma.user.create({
      data: {
        name: 'E2E Finance BDG',
        email: `${PREFIX}finance@damaco.test`,
        passwordHash,
        role: Role.finance,
        departmentId: deptAId,
        isActive: true,
      },
    });

    superAdminUser = await prisma.user.create({
      data: {
        name: 'E2E Super Admin BDG',
        email: `${PREFIX}superadmin@damaco.test`,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });

    // 3. Proyek
    const projA = await prisma.project.create({
      data: {
        name: 'E2E-PROJ-BDG-A',
        departmentId: deptAId,
        costCenterId: ccDeptAId,
        createdById: adminAUser.id,
        status: ProjectStatus.berjalan,
      },
    });
    projectAId = projA.id;

    await prisma.projectMember.createMany({
      data: [
        { projectId: projectAId, userId: adminAUser.id },
        { projectId: projectAId, userId: penggunaUser.id },
      ],
    });

    // 4. Inisialisasi NestJS Testing Module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    const jwtSecret = process.env.JWT_ACCESS_SECRET;

    penggunaToken = await jwtService.signAsync(
      {
        sub: penggunaUser.id,
        email: penggunaUser.email,
        role: Role.pengguna,
        departmentId: penggunaUser.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    adminAToken = await jwtService.signAsync(
      {
        sub: adminAUser.id,
        email: adminAUser.email,
        role: Role.admin,
        departmentId: adminAUser.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    adminBToken = await jwtService.signAsync(
      {
        sub: adminBUser.id,
        email: adminBUser.email,
        role: Role.admin,
        departmentId: adminBUser.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    financeToken = await jwtService.signAsync(
      {
        sub: financeUser.id,
        email: financeUser.email,
        role: Role.finance,
        departmentId: financeUser.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    superAdminToken = await jwtService.signAsync(
      {
        sub: superAdminUser.id,
        email: superAdminUser.email,
        role: Role.super_admin,
        departmentId: null,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );
  }, 45000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (prisma) {
      await cleanTestData();
      await prisma.$disconnect();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 1. PENGAJUAN ANGGARAN AWAL (ADMIN -> FINANCE -> SUPER ADMIN)
  // ─────────────────────────────────────────────────────────────
  describe('Pengajuan Anggaran Awal (Admin -> Finance -> Super Admin -> Disetujui/Aktif)', () => {
    let budgetRequestId: string;

    it('POST /budget-requests - Pengguna biasa DITOLAK (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          type: BudgetRequestType.awal,
          items: [{ categoryId: catMaterialId, newAmount: 10000000 }],
        })
        .expect(403);
    });

    it('POST /budget-requests - Admin departemen lain (Admin B) DITOLAK (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({
          projectId: projectAId,
          type: BudgetRequestType.awal,
          items: [{ categoryId: catMaterialId, newAmount: 10000000 }],
        })
        .expect(403);
    });

    it('POST /budget-requests - Admin A berhasil mengajukan anggaran awal', async () => {
      const res = await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectAId,
          type: BudgetRequestType.awal,
          reason: 'Anggaran awal operasional proyek A',
          submitNow: true,
          items: [
            { categoryId: catMaterialId, newAmount: 20000000 },
            { categoryId: catJasaId, newAmount: 10000000 },
          ],
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      budgetRequestId = res.body.id;
      expect(Number(res.body.totalAmount)).toBe(30000000);
      expect(res.body.status).toBe(BudgetRequestStatus.menunggu_finance);
    });

    it('POST /budget-requests/:id/approve - Admin DITOLAK menyetujui langkah Finance (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/budget-requests/${budgetRequestId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ reason: 'Admin coba approve sendiri' })
        .expect(403);
    });

    it('POST /budget-requests/:id/approve - Finance memverifikasi kelayakan -> status menunggu_super_admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/budget-requests/${budgetRequestId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ reason: 'Kelayakan dana telah diverifikasi oleh tim Finance' })
        .expect(200);

      expect(res.body.status).toBe(BudgetRequestStatus.menunggu_super_admin);
    });

    it('POST /budget-requests/:id/approve - Finance DITOLAK memutuskan langkah akhir Super Admin (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/budget-requests/${budgetRequestId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(403);
    });

    it('POST /budget-requests/:id/approve - Super Admin menyetujui keputusan final -> status disetujui & Budget aktif terbentuk', async () => {
      const res = await request(app.getHttpServer())
        .post(`/budget-requests/${budgetRequestId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Disetujui untuk dieksekusi' })
        .expect(200);

      expect(res.body.status).toBe(BudgetRequestStatus.disetujui);

      // Verifikasi Budget aktif terbentuk di database
      const activeRes = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/active`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(activeRes.body).toBeDefined();
      expect(activeRes.body.version).toBe(1);
      expect(activeRes.body.status).toBe(BudgetStatus.aktif);
      expect(Number(activeRes.body.totalAmount)).toBe(30000000);
      expect(activeRes.body.isBaseline).toBe(true);
      expect(activeRes.body.lockedAt).toBeDefined();
    });

    it('POST /budget-requests - Tipe awal kedua kali DITOLAK jika anggaran aktif sudah ada (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectAId,
          type: BudgetRequestType.awal,
          items: [{ categoryId: catMaterialId, newAmount: 15000000 }],
        })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PERUBAHAN ANGGARAN (BUDGET CHANGE REQUEST)
  // ─────────────────────────────────────────────────────────────
  describe('Pengajuan Perubahan Anggaran (Tipe: perubahan)', () => {
    let changeRequestId: string;

    it('Admin mengajukan perubahan anggaran (tipe: perubahan)', async () => {
      const res = await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectAId,
          type: BudgetRequestType.perubahan,
          reason: 'Penambahan alokasi jasa konsultasi ahli',
          submitNow: true,
          items: [
            {
              categoryId: catMaterialId,
              oldAmount: 20000000,
              newAmount: 20000000,
            },
            {
              categoryId: catJasaId,
              oldAmount: 10000000,
              newAmount: 25000000,
            },
          ],
        })
        .expect(201);

      changeRequestId = res.body.id;
      expect(Number(res.body.totalAmount)).toBe(45000000);
      expect(Number(res.body.extraAmount)).toBe(15000000);
      expect(res.body.status).toBe(BudgetRequestStatus.menunggu_finance);
    });

    it('Persetujuan bertahap perubahan anggaran hingga aktif (Version 2)', async () => {
      // 1. Finance approve
      await request(app.getHttpServer())
        .post(`/budget-requests/${changeRequestId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(200);

      // 2. Super Admin approve
      await request(app.getHttpServer())
        .post(`/budget-requests/${changeRequestId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Verifikasi anggaran aktif sekarang adalah versi 2 sebesar 45.000.000
      const activeRes = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/active`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(activeRes.body.version).toBe(2);
      expect(activeRes.body.status).toBe(BudgetStatus.aktif);
      expect(Number(activeRes.body.totalAmount)).toBe(45000000);

      // Verifikasi anggaran versi 1 statusnya digantikan
      const v1Budget = await prisma.budget.findFirst({
        where: { projectId: projectAId, version: 1 },
      });
      expect(v1Budget?.status).toBe(BudgetStatus.digantikan);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. PENOLAKAN ANGGARAN (REJECT FLOW)
  // ─────────────────────────────────────────────────────────────
  describe('Penolakan Anggaran (Reject Flow)', () => {
    let rejectReqId: string;

    it('Admin mengajukan permohonan perubahan lain', async () => {
      const res = await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectAId,
          type: BudgetRequestType.perubahan,
          reason: 'Pengajuan tambahan yang tidak rasional',
          submitNow: true,
          items: [{ categoryId: catMaterialId, newAmount: 100000000 }],
        })
        .expect(201);

      rejectReqId = res.body.id;
    });

    it('Penolakan tanpa alasan DITOLAK (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post(`/budget-requests/${rejectReqId}/reject`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ reason: '' })
        .expect(400);
    });

    it('Finance menolak pengajuan anggaran dengan alasan valid', async () => {
      const res = await request(app.getHttpServer())
        .post(`/budget-requests/${rejectReqId}/reject`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          reason: 'Kenaikan 100jt tidak didukung bukti analisis kelayakan',
        })
        .expect(200);

      expect(res.body.status).toBe(BudgetRequestStatus.ditolak);

      // Anggaran aktif tetap versi 2 (45.000.000)
      const activeRes = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/active`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(activeRes.body.version).toBe(2);
      expect(Number(activeRes.body.totalAmount)).toBe(45000000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. RINGKASAN ANGGARAN (BUDGET SUMMARY & PERINGATAN DINI)
  // ─────────────────────────────────────────────────────────────
  describe('Ringkasan Anggaran (Budget vs Actual) & Peringatan Dini', () => {
    it('GET /projects/:projectId/budget/summary - mengembalikan ringkasan anggaran vs aktual', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/summary`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('projectId', projectAId);
      expect(Number(res.body.totalBudgeted)).toBe(45000000);
      expect(res.body).toHaveProperty('totalActual');
      expect(res.body).toHaveProperty('absorptionPct');
      expect(res.body).toHaveProperty('progressPct');
      expect(res.body).toHaveProperty('isEarlyWarning');
      expect(res.body).toHaveProperty('isOverBudget');
      expect(Array.isArray(res.body.categories)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. TRANSISI PROYEK KE BERJALAN (LANGKAH 5)
  // ─────────────────────────────────────────────────────────────
  describe('Transisi Proyek ke Berjalan Saat Anggaran Awal Disetujui (Langkah 5)', () => {
    let projectTransitionId: string;
    let budgetReqId: string;

    beforeAll(async () => {
      // Buat proyek baru dengan status 'diajukan' untuk pengujian transisi
      const proj = await prisma.project.create({
        data: {
          name: 'E2E-PROJ-BDG-TRANSITION',
          departmentId: deptAId,
          costCenterId: ccDeptAId,
          createdById: adminAUser.id,
          status: ProjectStatus.diajukan,
        },
      });
      projectTransitionId = proj.id;

      await prisma.projectMember.create({
        data: { projectId: projectTransitionId, userId: adminAUser.id },
      });
    });

    it('Proyek awalnya berstatus diajukan', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectTransitionId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.body.status).toBe(ProjectStatus.diajukan);
    });

    it('Admin mengajukan anggaran awal untuk proyek diajukan', async () => {
      const res = await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectTransitionId,
          type: BudgetRequestType.awal,
          reason: 'Anggaran awal proyek transisi e2e',
          submitNow: true,
          items: [{ categoryId: catMaterialId, newAmount: 15000000 }],
        })
        .expect(201);

      budgetReqId = res.body.id;
      expect(res.body.status).toBe(BudgetRequestStatus.menunggu_finance);
    });

    it('Finance menyetujui anggaran awal', async () => {
      await request(app.getHttpServer())
        .post(`/budget-requests/${budgetReqId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(200);
    });

    it('Super Admin menyetujui anggaran awal -> proyek berstatus berjalan dan baseline terkunci', async () => {
      const res = await request(app.getHttpServer())
        .post(`/budget-requests/${budgetReqId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.status).toBe(BudgetRequestStatus.disetujui);

      // Verifikasi proyek sekarang berstatus 'berjalan'
      const projRes = await request(app.getHttpServer())
        .get(`/projects/${projectTransitionId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(projRes.body.status).toBe(ProjectStatus.berjalan);

      // Verifikasi budget aktif dengan isBaseline=true dan lockedAt tidak null
      const budgetRes = await request(app.getHttpServer())
        .get(`/projects/${projectTransitionId}/budget/active`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(budgetRes.body.isBaseline).toBe(true);
      expect(budgetRes.body.lockedAt).toBeDefined();
      expect(budgetRes.body.lockedAt).not.toBeNull();
    });

    it('Anggaran perubahan TIDAK mengubah status proyek (tetap berjalan)', async () => {
      // Ajukan anggaran perubahan
      const changeRes = await request(app.getHttpServer())
        .post('/budget-requests')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectTransitionId,
          type: BudgetRequestType.perubahan,
          reason: 'Penambahan alokasi tes transisi',
          submitNow: true,
          items: [{ categoryId: catMaterialId, oldAmount: 15000000, newAmount: 20000000 }],
        })
        .expect(201);

      const changeReqId = changeRes.body.id;

      // Finance approve
      await request(app.getHttpServer())
        .post(`/budget-requests/${changeReqId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(200);

      // Super Admin approve
      await request(app.getHttpServer())
        .post(`/budget-requests/${changeReqId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Proyek tetap 'berjalan' (tidak berubah ke 'diajukan' atau status lain)
      const projRes = await request(app.getHttpServer())
        .get(`/projects/${projectTransitionId}`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(projRes.body.status).toBe(ProjectStatus.berjalan);
    });
  });
});
