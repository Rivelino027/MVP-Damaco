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
  ApprovalStatus,
  ExpenseStatus,
  LimitChangeStatus,
  LimitStatus,
  PaymentMethod,
  PrismaClient,
  ProjectStatus,
  Role,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Expenses & Limits Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const TEST_PASSWORD = 'PasswordExpensesE2E123!';
  const PREFIX = 'e2e-exp-';

  let deptAId: string;
  let deptBId: string;
  let ccDeptAId: string;
  let ccDeptBId: string;
  let categoryId: string;

  let penggunaUser: any;
  let adminAUser: any;
  let adminA2User: any;
  let adminBUser: any;
  let finance1User: any;
  let finance2User: any;
  let superAdminUser: any;

  let penggunaToken: string;
  let adminAToken: string;
  let adminA2Token: string;
  let adminBToken: string;
  let finance1Token: string;
  let finance2Token: string;
  let superAdminToken: string;

  let projectAId: string;
  let projectBId: string;
  let taskAId: string;

  const cleanTestData = async () => {
    const currentDbUrl = process.env.DATABASE_URL || '';
    if (!currentDbUrl.includes('budgetflow_test')) {
      throw new Error(
        `Operasi pembersihan dibatalkan: DATABASE_URL bukan 'budgetflow_test'!`,
      );
    }

    const userIds = (
      await prisma.user.findMany({
        where: { email: { startsWith: PREFIX } },
        select: { id: true },
      })
    ).map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { paidBy: { in: userIds } },
      });
      await prisma.expenseFlag.deleteMany({});
      await prisma.attachment.deleteMany({
        where: { uploadedBy: { in: userIds } },
      });
      await prisma.expense.deleteMany({
        where: { requesterId: { in: userIds } },
      });
      await prisma.approval.deleteMany({
        where: { approverId: { in: userIds } },
      });
      await prisma.limitChangeRequest.deleteMany({
        where: { proposedBy: { in: userIds } },
      });
    }

    const projectIds = (
      await prisma.project.findMany({
        where: { name: { startsWith: 'E2E-PROJ-EXP-' } },
        select: { id: true },
      })
    ).map((p) => p.id);

    if (projectIds.length > 0) {
      await prisma.expense.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.task.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.projectMember.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.project.deleteMany({
        where: { id: { in: projectIds } },
      });
    }

    await prisma.expenseCategory.deleteMany({
      where: { name: { startsWith: 'E2E-CAT-EXP-' } },
    });
    await prisma.costCenter.deleteMany({
      where: { code: { startsWith: 'E2E-CC-EXP-' } },
    });
    await prisma.department.deleteMany({
      where: { name: { startsWith: 'E2E-DEPT-EXP-' } },
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

    // Pastikan ada limit default 5.000.000
    await prisma.approvalLimit.deleteMany({});
    await prisma.approvalLimit.create({
      data: {
        amount: 5000000,
        status: LimitStatus.berlaku,
        effectiveFrom: new Date(),
        confirmedAt: new Date(),
      },
    });

    // 1. Departemen & Cost Center & Kategori
    const deptA = await prisma.department.create({
      data: { name: 'E2E-DEPT-EXP-A', isActive: true },
    });
    deptAId = deptA.id;

    const deptB = await prisma.department.create({
      data: { name: 'E2E-DEPT-EXP-B', isActive: true },
    });
    deptBId = deptB.id;

    const ccA = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-EXP-A',
        name: 'CC EXP A',
        departmentId: deptAId,
        isActive: true,
      },
    });
    ccDeptAId = ccA.id;

    const ccB = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-EXP-B',
        name: 'CC EXP B',
        departmentId: deptBId,
        isActive: true,
      },
    });
    ccDeptBId = ccB.id;

    const cat = await prisma.expenseCategory.create({
      data: {
        name: 'E2E-CAT-EXP-OPERASIONAL',
        code: 'CAT-OP-EXP',
        isActive: true,
      },
    });
    categoryId = cat.id;

    // 2. Akun Pengguna
    const passwordHash = await argon2.hash(TEST_PASSWORD);

    penggunaUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna EXP',
        email: `${PREFIX}pengguna@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminAUser = await prisma.user.create({
      data: {
        name: 'E2E Admin EXP A',
        email: `${PREFIX}admin-a@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminA2User = await prisma.user.create({
      data: {
        name: 'E2E Admin EXP A2',
        email: `${PREFIX}admin-a2@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminBUser = await prisma.user.create({
      data: {
        name: 'E2E Admin EXP B',
        email: `${PREFIX}admin-b@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptBId,
        isActive: true,
      },
    });

    finance1User = await prisma.user.create({
      data: {
        name: 'E2E Finance 1 EXP',
        email: `${PREFIX}finance-1@damaco.test`,
        passwordHash,
        role: Role.finance,
        departmentId: deptAId,
        isActive: true,
      },
    });

    finance2User = await prisma.user.create({
      data: {
        name: 'E2E Finance 2 EXP',
        email: `${PREFIX}finance-2@damaco.test`,
        passwordHash,
        role: Role.finance,
        departmentId: deptBId,
        isActive: true,
      },
    });

    superAdminUser = await prisma.user.create({
      data: {
        name: 'E2E Super Admin EXP',
        email: `${PREFIX}superadmin@damaco.test`,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });

    // 3. Proyek & Anggota
    const projA = await prisma.project.create({
      data: {
        name: 'E2E-PROJ-EXP-A',
        departmentId: deptAId,
        costCenterId: ccDeptAId,
        createdById: adminAUser.id,
        status: ProjectStatus.berjalan,
      },
    });
    projectAId = projA.id;

    const projB = await prisma.project.create({
      data: {
        name: 'E2E-PROJ-EXP-B',
        departmentId: deptBId,
        costCenterId: ccDeptBId,
        createdById: adminBUser.id,
        status: ProjectStatus.berjalan,
      },
    });
    projectBId = projB.id;

    // Anggota Proyek A: pengguna, adminA, finance1
    await prisma.projectMember.createMany({
      data: [
        { projectId: projectAId, userId: penggunaUser.id },
        { projectId: projectAId, userId: adminAUser.id },
        { projectId: projectAId, userId: finance1User.id },
        { projectId: projectBId, userId: adminBUser.id },
      ],
    });

    const taskA = await prisma.task.create({
      data: {
        projectId: projectAId,
        title: 'Task Pengadaan Operasional',
        assigneeId: penggunaUser.id,
      },
    });
    taskAId = taskA.id;

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

    adminA2Token = await jwtService.signAsync(
      {
        sub: adminA2User.id,
        email: adminA2User.email,
        role: Role.admin,
        departmentId: adminA2User.departmentId,
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

    finance1Token = await jwtService.signAsync(
      {
        sub: finance1User.id,
        email: finance1User.email,
        role: Role.finance,
        departmentId: finance1User.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    finance2Token = await jwtService.signAsync(
      {
        sub: finance2User.id,
        email: finance2User.email,
        role: Role.finance,
        departmentId: finance2User.departmentId,
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
  // 1. BATAS NOMINAL BESAR (TWO-PARTY APPROVAL RULE)
  // ─────────────────────────────────────────────────────────────
  describe('Batas Nominal Besar (Aturan Dua Pihak: Admin & Finance)', () => {
    let changeRequestId: string;

    it('GET /expenses/limit/current - mengembalikan batas aktif saat ini (5.000.000)', async () => {
      const res = await request(app.getHttpServer())
        .get('/expenses/limit/current')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(200);

      expect(Number(res.body.amount)).toBe(5000000);
      expect(res.body.status).toBe('berlaku');
    });

    it('POST /expenses/limit/propose - Super Admin DITOLAK (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/expenses/limit/propose')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ newAmount: 7500000, reason: 'Kenaikan inflasi' })
        .expect(403);
    });

    it('POST /expenses/limit/propose - Pengguna biasa DITOLAK (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/expenses/limit/propose')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({ newAmount: 7500000 })
        .expect(403);
    });

    it('POST /expenses/limit/propose - Admin berhasil mengusulkan batas baru', async () => {
      const res = await request(app.getHttpServer())
        .post('/expenses/limit/propose')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ newAmount: 8000000, reason: 'Penyesuaian kebutuhan tim' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      changeRequestId = res.body.id;
      expect(Number(res.body.newAmount)).toBe(8000000);
      expect(res.body.status).toBe(LimitChangeStatus.menunggu_konfirmasi);
      expect(res.body.proposerRole).toBe(Role.admin);
    });

    it('POST /expenses/limit/:id/confirm - Pengusul sendiri DITOLAK mengonfirmasi (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/limit/${changeRequestId}/confirm`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ decision: 'berlaku' })
        .expect(400);
    });

    it('POST /expenses/limit/:id/confirm - Admin lain (peran sama) DITOLAK mengonfirmasi (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/limit/${changeRequestId}/confirm`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({ decision: 'berlaku' })
        .expect(400);
    });

    it('POST /expenses/limit/:id/confirm - Super Admin DITOLAK mengonfirmasi (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/limit/${changeRequestId}/confirm`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ decision: 'berlaku' })
        .expect(403);
    });

    it('POST /expenses/limit/:id/confirm - Finance (orang & peran berbeda) berhasil mengonfirmasi batas baru', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/limit/${changeRequestId}/confirm`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .send({ decision: 'berlaku', reason: 'Disetujui setelah review' })
        .expect(200);

      expect(res.body.status).toBe(LimitChangeStatus.berlaku);
      expect(res.body.confirmedBy).toBe(finance1User.id);
      expect(res.body.confirmerRole).toBe(Role.finance);

      // Verifikasi batas aktif baru adalah 8.000.000
      const currentRes = await request(app.getHttpServer())
        .get('/expenses/limit/current')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(Number(currentRes.body.amount)).toBe(8000000);
    });

    it('GET /expenses/limit/history - mencatat riwayat perubahan batas', async () => {
      const res = await request(app.getHttpServer())
        .get('/expenses/limit/history')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id).toBe(changeRequestId);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. ALUR STANDAR PENGELUARAN (PENGGUNA -> ADMIN -> FINANCE -> BAYAR)
  // ─────────────────────────────────────────────────────────────
  describe('Alur Pengeluaran Standar (Pengguna -> Admin -> Finance -> Siap Dibayar -> Dibayar)', () => {
    let expenseId: string;

    it('POST /expenses - Ditolak jika pengguna bukan anggota proyek (400 Bad Request)', async () => {
      // Pengguna bukan anggota Proyek B
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectBId,
          costCenterId: ccDeptBId,
          categoryId: categoryId,
          amount: 500000,
          expenseDate: '2026-10-23',
          vendor: 'Vendor ATK',
        })
        .expect(400);
    });

    it('POST /expenses - Pengguna anggota proyek berhasil membuat draft pengeluaran', async () => {
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          taskId: taskAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 1500000,
          expenseDate: '2026-10-23',
          vendor: 'Toko Perlengkapan Damaco',
          note: 'Beli perkakas kerja',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expenseId = res.body.id;
      expect(res.body.status).toBe(ExpenseStatus.draft);
      expect(res.body.isLargeAmount).toBe(false);
    });

    it('POST /expenses/:id/submit - Pengguna mengajukan pengeluaran -> status menunggu_admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${expenseId}/submit`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(200);

      expect(res.body.status).toBe(ExpenseStatus.menunggu_admin);
    });

    it('POST /expenses/:id/approve - Admin dari departemen lain (Admin B) DITOLAK (404 Not Found)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);
    });

    it('POST /expenses/:id/approve - Admin departemen sama (Admin A) berhasil menyetujui -> status menunggu_finance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.body.status).toBe(ExpenseStatus.menunggu_finance);
    });

    it('POST /expenses/:id/verify - Finance memverifikasi pengeluaran -> status siap_dibayar', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${expenseId}/verify`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .expect(200);

      expect(res.body.status).toBe(ExpenseStatus.siap_dibayar);
    });

    it('POST /expenses/:id/payment - Finance mencatat pembayaran -> status dibayar', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${expenseId}/payment`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .send({
          method: PaymentMethod.transfer,
          paidAt: new Date().toISOString(),
          referenceNo: 'TRF-DMC-001928',
        })
        .expect(201);

      expect(res.body.status).toBe(ExpenseStatus.dibayar);
      expect(res.body.payment).toBeDefined();
      expect(res.body.payment.method).toBe(PaymentMethod.transfer);
      expect(res.body.payment.referenceNo).toBe('TRF-DMC-001928');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. NOMINAL BESAR: VALIDASI NOTA & CATATAN ALASAN WAJIB
  // ─────────────────────────────────────────────────────────────
  describe('Nominal Besar (Nota dan Catatan Wajib)', () => {
    it('Pengajuan Nominal Besar TANPA nota ditolak (400 Bad Request)', async () => {
      // Limit saat ini adalah 8.000.000. Coba ajukan 10.000.000
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 10000000,
          expenseDate: '2026-10-23',
          vendor: 'Vendor Mesin Besar',
          note: 'Pengadaan mesin cetak',
          submitNow: true,
          // Tidak menyertakan receiptUrl / attachmentId
        })
        .expect(400);
    });

    it('Pengajuan Nominal Besar TANPA catatan alasan ditolak (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 10000000,
          expenseDate: '2026-10-23',
          vendor: 'Vendor Mesin Besar',
          receiptUrl: 'https://storage.damaco.test/nota-10jt.jpg',
          note: '', // Catatan kosong
          submitNow: true,
        })
        .expect(400);
    });

    it('Pengajuan Nominal Besar DENGAN nota dan catatan BERHASIL diajukan (isLargeAmount: true)', async () => {
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 10000000,
          expenseDate: '2026-10-23',
          vendor: 'Vendor Mesin Besar',
          receiptUrl: 'https://storage.damaco.test/nota-10jt.jpg',
          note: 'Pengadaan mesin cetak skala besar untuk proyek A',
          submitNow: true,
        })
        .expect(201);

      expect(res.body.isLargeAmount).toBe(true);
      expect(Number(res.body.limitAtSubmission)).toBe(8000000);
      expect(res.body.status).toBe(ExpenseStatus.menunggu_admin);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. ATURAN SITUASI KHUSUS & LANGKAH AKTIF (LANGKAH 3)
  // ─────────────────────────────────────────────────────────────
  describe('Aturan Situasi Khusus & Langkah Aktif (Langkah 3)', () => {
    it('(a) Pengaju berperan Admin -> status menunggu_admin, ditolak self-approve, berhasil disetujui Admin lain di dept sama', async () => {
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 2500000,
          expenseDate: '2026-10-23',
          vendor: 'Vendor Lisensi Software',
          note: 'Lisensi software cloud tim IT',
          submitNow: true,
        })
        .expect(201);

      // Status pengeluaran tetap menunggu_admin (tidak dilewati otomatis)
      expect(res.body.status).toBe(ExpenseStatus.menunggu_admin);

      // Admin A ditolak menyetujui miliknya sendiri (400 Bad Request)
      const selfApproveRes = await request(app.getHttpServer())
        .post(`/expenses/${res.body.id}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(400);

      expect(selfApproveRes.body.message).toContain('milik sendiri');

      // Admin B dari departemen lain mendapat 404
      await request(app.getHttpServer())
        .post(`/expenses/${res.body.id}/approve`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);

      // Admin A2 dari departemen yang sama BERHASIL menyetujui
      const approveRes = await request(app.getHttpServer())
        .post(`/expenses/${res.body.id}/approve`)
        .set('Authorization', `Bearer ${adminA2Token}`)
        .expect(200);

      expect(approveRes.body.status).toBe(ExpenseStatus.menunggu_finance);
    });

    it('(b) Pengaju berperan Finance -> Finance pembuat ditolak verify sendiri, Finance lain BERHASIL', async () => {
      // Finance 1 membuat pengeluaran di Proyek A
      const createRes = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${finance1Token}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 1200000,
          expenseDate: '2026-10-23',
          vendor: 'Toko Buku Finance',
          note: 'Buku referensi perpajakan proyek',
          submitNow: true,
        })
        .expect(201);

      const expId = createRes.body.id;
      expect(createRes.body.status).toBe(ExpenseStatus.menunggu_admin);

      // Admin A approve langkah 1
      await request(app.getHttpServer())
        .post(`/expenses/${expId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      // Finance 1 mencoba memverifikasi miliknya sendiri -> DITOLAK (400 Bad Request)
      const selfVerifyRes = await request(app.getHttpServer())
        .post(`/expenses/${expId}/verify`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .expect(400);

      expect(selfVerifyRes.body.message).toContain('milik sendiri');

      // Finance 2 (finance lain) memverifikasi -> BERHASIL (200 OK)
      const verifyRes = await request(app.getHttpServer())
        .post(`/expenses/${expId}/verify`)
        .set('Authorization', `Bearer ${finance2Token}`)
        .expect(200);

      expect(verifyRes.body.status).toBe(ExpenseStatus.siap_dibayar);
    });

    it('(c) Validasi Proyek berdasarkan Peran: Pengguna hanya proyeknya, Admin proyek departemennya, Finance bebas', async () => {
      // 1. Pengguna membuat pengeluaran di Proyek B (bukan anggota) -> 400 Bad Request
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectBId,
          costCenterId: ccDeptBId,
          categoryId: categoryId,
          amount: 500000,
          expenseDate: '2026-10-23',
        })
        .expect(400);

      // 2. Admin A membuat pengeluaran di Proyek B (departemen lain) -> 400 Bad Request
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          projectId: projectBId,
          costCenterId: ccDeptBId,
          categoryId: categoryId,
          amount: 500000,
          expenseDate: '2026-10-23',
        })
        .expect(400);

      // 3. Finance 1 membuat pengeluaran di Proyek B (bebas proyek mana pun) -> 201 Created
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${finance1Token}`)
        .send({
          projectId: projectBId,
          costCenterId: ccDeptBId,
          categoryId: categoryId,
          amount: 500000,
          expenseDate: '2026-10-23',
          note: 'Pengeluaran antar-departemen oleh Finance',
        })
        .expect(201);

      // 4. Super Admin dilarang membuat pengeluaran -> 403 Forbidden
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 500000,
          expenseDate: '2026-10-23',
        })
        .expect(403);
    });

    it('Langkah aktif & peran: Finance tidak bisa menyetujui langkah Admin, urutan terbalik ditolak', async () => {
      // Buat pengeluaran draft lalu submit
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 750000,
          expenseDate: '2026-10-23',
          submitNow: true,
        })
        .expect(201);

      const expId = res.body.id;

      // Status masih menunggu_admin:
      // 1. Finance mencoba memverifikasi langsung (urutan terbalik) -> 400 Bad Request
      await request(app.getHttpServer())
        .post(`/expenses/${expId}/verify`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .expect(400);

      // 2. Finance mencoba memanggil /approve (peran salah) -> 403 Forbidden
      await request(app.getHttpServer())
        .post(`/expenses/${expId}/approve`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .expect(403);

      // 3. Admin A approve langkah 1 -> sukses
      await request(app.getHttpServer())
        .post(`/expenses/${expId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      // Status sekarang menunggu_finance:
      // 4. Admin mencoba memanggil /verify (peran salah) -> 403 Forbidden
      await request(app.getHttpServer())
        .post(`/expenses/${expId}/verify`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(403);

      // 5. Admin mencoba memanggil /approve lagi (urutan salah) -> 400 Bad Request
      await request(app.getHttpServer())
        .post(`/expenses/${expId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(400);

      // 6. Finance memanggil /payment sebelum verify (urutan salah) -> 400 Bad Request
      await request(app.getHttpServer())
        .post(`/expenses/${expId}/payment`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .send({
          method: PaymentMethod.transfer,
          paidAt: new Date().toISOString(),
          referenceNo: 'TRF-TEST-SKIP',
        })
        .expect(400);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. ALUR PENOLAKAN (REJECT FLOW)
  // ─────────────────────────────────────────────────────────────
  describe('Alur Penolakan (Reject Flow)', () => {
    let rejectedExpenseId: string;

    it('Penolakan wajib menyertakan alasan (reason)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 800000,
          expenseDate: '2026-10-23',
          vendor: 'Vendor Katering',
          submitNow: true,
        })
        .expect(201);

      rejectedExpenseId = createRes.body.id;

      // Coba tolak tanpa alasan
      await request(app.getHttpServer())
        .post(`/expenses/${rejectedExpenseId}/reject`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ reason: '' })
        .expect(400);
    });

    it('Admin berhasil menolak pengeluaran dengan alasan -> status ditolak', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${rejectedExpenseId}/reject`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({ reason: 'Nota tidak terbaca dan harga tidak wajar' })
        .expect(200);

      expect(res.body.status).toBe(ExpenseStatus.ditolak);

      // Verifikasi riwayat approval mencatat penolakan
      const detailRes = await request(app.getHttpServer())
        .get(`/expenses/${rejectedExpenseId}`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(200);

      const rejectedApproval = detailRes.body.approvalHistory.find(
        (a: any) => a.status === ApprovalStatus.ditolak,
      );
      expect(rejectedApproval).toBeDefined();
      expect(rejectedApproval.reason).toContain('Nota tidak terbaca');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. PEMBATASAN PERAN: SUPER ADMIN HANYA BACA PENGELUARAN (LANGKAH 2)
  // ─────────────────────────────────────────────────────────────
  describe('Pembatasan Peran: Super Admin Hanya Baca Pengeluaran (Langkah 2)', () => {
    let saExpenseId: string;

    beforeAll(async () => {
      // Buat pengeluaran baru oleh Pengguna
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          categoryId,
          costCenterId: ccDeptAId,
          amount: 2500000,
          expenseDate: '2026-10-23',
          vendor: 'Vendor SA Test',
          note: 'Pengeluaran untuk Uji Super Admin Roles',
        })
        .expect(201);

      saExpenseId = res.body.id;

      // Submit ke status menunggu_admin
      await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/submit`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(200);
    });

    it('Super Admin BISA membaca pengeluaran (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/expenses/${saExpenseId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.id).toBe(saExpenseId);
      expect(res.body.note).toBe('Pengeluaran untuk Uji Super Admin Roles');
    });

    it('Super Admin DITOLAK menyetujui pengeluaran di langkah 1 (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(403);
    });

    it('Super Admin DITOLAK menolak pengeluaran di langkah 1 (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Ditolak oleh Super Admin' })
        .expect(403);
    });

    it('Admin A menyetujui pengeluaran -> status menunggu_finance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.body.status).toBe(ExpenseStatus.menunggu_finance);
    });

    it('Super Admin DITOLAK memverifikasi pengeluaran di langkah 2 (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/verify`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(403);
    });

    it('Super Admin DITOLAK menolak pengeluaran di langkah 2 (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Ditolak oleh Super Admin di tahap finance' })
        .expect(403);
    });

    it('Finance 1 memverifikasi pengeluaran -> status siap_dibayar', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/verify`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .expect(200);

      expect(res.body.status).toBe(ExpenseStatus.siap_dibayar);
    });

    it('Super Admin DITOLAK mencatat pembayaran pengeluaran (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/${saExpenseId}/payment`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          method: PaymentMethod.transfer,
          paidAt: new Date().toISOString(),
          referenceNo: 'TRF-SA-DENIED',
        })
        .expect(403);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. LAMPIRAN NOTA PENGELUARAN (LANGKAH 4)
  // ─────────────────────────────────────────────────────────────
  describe('Lampiran Nota Pengeluaran (Langkah 4)', () => {
    let draftExpenseId: string;
    let attachmentId: string;

    // PNG magic bytes yang valid (1×1 pixel)
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
      0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
      0x44, 0xae, 0x42, 0x60, 0x82, // IEND
    ]);

    beforeAll(async () => {
      // Buat pengeluaran draft untuk pengujian lampiran
      const res = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 300000,
          expenseDate: '2026-10-25',
          vendor: 'Toko ATK Nota Test',
          note: 'Pembelian alat tulis untuk tes lampiran',
        })
        .expect(201);

      draftExpenseId = res.body.id;
    });

    it('POST /expenses/:id/attachments - File dengan signature PALSU ditolak (400)', async () => {
      const fakeBuffer = Buffer.from('ini bukan file gambar, hanya teks biasa!');

      await request(app.getHttpServer())
        .post(`/expenses/${draftExpenseId}/attachments`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .attach('file', fakeBuffer, { filename: 'nota.png', contentType: 'image/png' })
        .expect(400);
    });

    it('POST /expenses/:id/attachments - File LEBIH DARI 10 MB ditolak (400)', async () => {
      // 11 MB buffer dengan PNG signature di depan
      const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 0);
      validPngBuffer.copy(bigBuffer, 0);

      await request(app.getHttpServer())
        .post(`/expenses/${draftExpenseId}/attachments`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .attach('file', bigBuffer, { filename: 'besar.png', contentType: 'image/png' })
        .expect(400);
    });

    it('POST /expenses/:id/attachments - Admin BUKAN pengaju DITOLAK mengunggah (403)', async () => {
      await request(app.getHttpServer())
        .post(`/expenses/${draftExpenseId}/attachments`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .attach('file', validPngBuffer, { filename: 'nota.png', contentType: 'image/png' })
        .expect(403);
    });

    it('POST /expenses/:id/attachments - Pengaju berhasil mengunggah nota valid (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/expenses/${draftExpenseId}/attachments`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .attach('file', validPngBuffer, { filename: 'nota_pembelian.png', contentType: 'image/png' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.mimeType).toBe('image/png');
      expect(res.body.fileName).toBe('nota_pembelian.png');
      attachmentId = res.body.id;
    });

    it('GET /expenses/:id/attachments - Pengaju dapat melihat daftar lampiran', async () => {
      const res = await request(app.getHttpServer())
        .get(`/expenses/${draftExpenseId}/attachments`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      // Tidak boleh expose userId/costAmount per orang
      expect(res.body[0]).not.toHaveProperty('uploadedByUser');
    });

    it('GET /expenses/:id/attachments - Admin departemen sama dapat melihat lampiran', async () => {
      await request(app.getHttpServer())
        .get(`/expenses/${draftExpenseId}/attachments`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);
    });

    it('GET /expenses/:id/attachments - Finance dapat melihat lampiran', async () => {
      await request(app.getHttpServer())
        .get(`/expenses/${draftExpenseId}/attachments`)
        .set('Authorization', `Bearer ${finance1Token}`)
        .expect(200);
    });

    it('GET /expenses/:id/attachments/:attachmentId/download - Pengguna lain (Pengguna B) TIDAK bisa mengunduh (404)', async () => {
      // Pengguna lain (adminB dari dept B) tidak punya scope ke pengeluaran dept A
      await request(app.getHttpServer())
        .get(`/expenses/${draftExpenseId}/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404);
    });

    it('GET /expenses/:id/attachments/:attachmentId/download - Pengaju berhasil mengunduh (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/expenses/${draftExpenseId}/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(200);

      // Pastikan Content-Type dikirim dengan benar
      expect(res.headers['content-type']).toContain('image/png');
    });

    it('Nominal Besar TANPA nota terunggah (hanya receiptUrl string) - masih 400 jika tidak ada note', async () => {
      // Verifikasi bahwa Nominal Besar tetap memerlukan note (catatan alasan)
      await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 10000000, // di atas limit
          expenseDate: '2026-10-25',
          vendor: 'Vendor Besar',
          receiptUrl: 'https://storage.damaco.test/nota-besar.jpg',
          note: '', // kosong
          submitNow: true,
        })
        .expect(400);
    });

    it('Nominal Besar DENGAN nota diunggah dan catatan alasan - diterima (201)', async () => {
      // Pertama, buat draft expense Nominal Besar
      const createRes = await request(app.getHttpServer())
        .post('/expenses')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .send({
          projectId: projectAId,
          costCenterId: ccDeptAId,
          categoryId: categoryId,
          amount: 10000000, // di atas limit
          expenseDate: '2026-10-25',
          vendor: 'Vendor Mesin Besar Tes Lampiran',
          note: 'Pengadaan mesin produksi skala besar untuk proyek',
          receiptUrl: 'https://storage.damaco.test/nota-mesin.jpg', // nota via URL
          submitNow: true,
        })
        .expect(201);

      expect(createRes.body.isLargeAmount).toBe(true);
      expect(createRes.body.status).toBe(ExpenseStatus.menunggu_admin);
    });

    it('DELETE /expenses/:id/attachments/:attachmentId - Pengaju berhasil menghapus nota (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/expenses/${draftExpenseId}/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(200);

      expect(res.body.message).toContain('dihapus');
      expect(res.body.id).toBe(attachmentId);
    });
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.approvalLimit.deleteMany({});
    await prisma.approvalLimit.create({
      data: {
        amount: 5000000,
        status: LimitStatus.berlaku,
        effectiveFrom: new Date(),
        confirmedAt: new Date(),
      },
    });
    await app.close();
    await prisma.$disconnect();
  });
});
