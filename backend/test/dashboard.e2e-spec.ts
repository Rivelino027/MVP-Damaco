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
  BudgetStatus,
  ExpenseStatus,
  PrismaClient,
  ProjectStatus,
  Role,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Dashboard Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;   

  const TEST_PASSWORD = 'PasswordDashboardE2E123!';
  const PREFIX = 'e2e-dsh-';

  let deptAId: string;
  let ccDeptAId: string;
  let categoryId: string;

  let penggunaUser: any;
  let adminAUser: any;
  let financeUser: any;
  let superAdminUser: any;

  let penggunaToken: string;
  let adminAToken: string;
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
        where: { name: { startsWith: 'E2E-PROJ-DSH-' } },
        select: { id: true },
      })
    ).map((p) => p.id);

    if (projectIds.length > 0) {
      await prisma.timesheetEntry.deleteMany({
        where: { task: { projectId: { in: projectIds } } },
      });
      await prisma.budgetItem.deleteMany({
        where: { budget: { projectId: { in: projectIds } } },
      });
      await prisma.budget.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.expense.deleteMany({
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

    await prisma.timesheet.deleteMany({
      where: { user: { email: { startsWith: PREFIX } } },
    });
    await prisma.hourlyCost.deleteMany({
      where: { user: { email: { startsWith: PREFIX } } },
    });

    await prisma.expenseCategory.deleteMany({
      where: { name: { startsWith: 'E2E-CAT-DSH-' } },
    });
    await prisma.costCenter.deleteMany({
      where: { code: { startsWith: 'E2E-CC-DSH-' } },
    });
    await prisma.department.deleteMany({
      where: { name: { startsWith: 'E2E-DEPT-DSH-' } },
    });

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

    // 1. Departemen
    const deptA = await prisma.department.create({
      data: {
        name: 'E2E-DEPT-DSH-A',
        annualBudget: 100000000, // 100 Juta
        isActive: true,
      },
    });
    deptAId = deptA.id;

    await prisma.department.create({
      data: {
        name: 'E2E-DEPT-DSH-B',
        annualBudget: 50000000, // 50 Juta
        isActive: true,
      },
    });

    const ccA = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-DSH-A',
        name: 'CC DSH A',
        departmentId: deptAId,
        isActive: true,
      },
    });
    ccDeptAId = ccA.id;

    const cat = await prisma.expenseCategory.create({
      data: {
        name: 'E2E-CAT-DSH-OPERASIONAL',
        code: 'CAT-OP-DSH',
        isActive: true,
      },
    });
    categoryId = cat.id;

    // 2. Akun Pengguna
    const passwordHash = await argon2.hash(TEST_PASSWORD);

    penggunaUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna DSH',
        email: `${PREFIX}pengguna@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminAUser = await prisma.user.create({
      data: {
        name: 'E2E Admin DSH A',
        email: `${PREFIX}admin-a@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptAId,
        isActive: true,
      },
    });

    financeUser = await prisma.user.create({
      data: {
        name: 'E2E Finance DSH',
        email: `${PREFIX}finance@damaco.test`,
        passwordHash,
        role: Role.finance,
        departmentId: deptAId,
        isActive: true,
      },
    });

    superAdminUser = await prisma.user.create({
      data: {
        name: 'E2E Super Admin DSH',
        email: `${PREFIX}superadmin@damaco.test`,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });

    // 3. Proyek & Anggaran Aktif
    const projA = await prisma.project.create({
      data: {
        name: 'E2E-PROJ-DSH-A',
        departmentId: deptAId,
        costCenterId: ccDeptAId,
        createdById: adminAUser.id,
        status: ProjectStatus.berjalan,
      },
    });
    projectAId = projA.id;

    await prisma.budget.create({
      data: {
        projectId: projectAId,
        version: 1,
        status: BudgetStatus.aktif,
        totalAmount: 25000000,
        isBaseline: true,
        lockedAt: new Date(),
        approvedBy: superAdminUser.id,
      },
    });

    // Buat pengeluaran siap dibayar & dibayar
    await prisma.expense.create({
      data: {
        requesterId: penggunaUser.id,
        projectId: projectAId,
        costCenterId: ccDeptAId,
        categoryId: categoryId,
        amount: 5000000,
        expenseDate: new Date(),
        status: ExpenseStatus.siap_dibayar,
        isLargeAmount: false,
      },
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
  // 1. HAK AKSES PERAN PADA DASBOR
  // ─────────────────────────────────────────────────────────────
  describe('Hak Akses & Guard Role Pada Dasbor', () => {
    it('Pengguna biasa DITOLAK mengakses /dashboard/admin (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/admin')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(403);
    });

    it('Pengguna biasa DITOLAK mengakses /dashboard/finance (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/finance')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(403);
    });

    it('Pengguna biasa DITOLAK mengakses /dashboard/super-admin (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/super-admin')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(403);
    });

    it('Admin DITOLAK mengakses /dashboard/super-admin (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/super-admin')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(403);
    });

    it('Finance DITOLAK mengakses /dashboard/super-admin (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/dashboard/super-admin')
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(403);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DASBOR ADMIN
  // ─────────────────────────────────────────────────────────────
  describe('GET /dashboard/admin - Dasbor Admin Departemen', () => {
    it('Admin berhasil mengambil metrik dasbor departemennya', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/admin')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('activeProjects');
      expect(res.body.activeProjects).toBeGreaterThanOrEqual(1);
      expect(Number(res.body.departmentBudget)).toBe(100000000);
      expect(Number(res.body.usedBudget)).toBeGreaterThanOrEqual(5000000);
      expect(res.body).toHaveProperty('remainingBudget');
      expect(res.body).toHaveProperty('absorptionPct');
      expect(res.body).toHaveProperty('pendingApprovals');
      expect(Array.isArray(res.body.projectHealth)).toBe(true);
      expect(res.body).toHaveProperty('currentLimit');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. DASBOR FINANCE
  // ─────────────────────────────────────────────────────────────
  describe('GET /dashboard/finance - Dasbor Finance Perusahaan', () => {
    it('Finance berhasil mengambil metrik keuangan perusahaan', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/finance')
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalBudgetCompany');
      expect(Number(res.body.totalBudgetCompany)).toBeGreaterThanOrEqual(
        150000000,
      );
      expect(res.body).toHaveProperty('totalUsedCompany');
      expect(res.body).toHaveProperty('absorptionPctCompany');
      expect(res.body).toHaveProperty('pendingVerification');
      expect(res.body).toHaveProperty('largeAmountPending');
      expect(res.body).toHaveProperty('readyToPay');
      expect(res.body).toHaveProperty('readyToPayCount');
      expect(Array.isArray(res.body.departmentAbsorption)).toBe(true);
      expect(Array.isArray(res.body.monthlyCashflow)).toBe(true);
      expect(Array.isArray(res.body.laborCostByDept)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. DASBOR SUPER ADMIN
  // ─────────────────────────────────────────────────────────────
  describe('GET /dashboard/super-admin - Dasbor Super Admin', () => {
    it('Super Admin berhasil mengambil metrik seluruh sistem dan aktivitas', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/super-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalBudgetCompany');
      expect(res.body).toHaveProperty('totalUsedCompany');
      expect(res.body).toHaveProperty('activeProjects');
      expect(res.body).toHaveProperty('totalUsers');
      expect(res.body.totalUsers).toBeGreaterThanOrEqual(4);
      expect(res.body).toHaveProperty('pendingBudgetDecisions');
      expect(Array.isArray(res.body.departmentAbsorption)).toBe(true);
      expect(Array.isArray(res.body.projectHealth)).toBe(true);
      expect(Array.isArray(res.body.recentActivities)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. PRIVASI BIAYA TENAGA KERJA PADA DASBOR & RINGKASAN ANGGARAN
  // ─────────────────────────────────────────────────────────────
  describe('Privasi Biaya Tenaga Kerja Pada Dasbor & Ringkasan Anggaran (Langkah 1)', () => {
    let task1Id: string;
    let task2Id: string;
    let task3Id: string;
    let worker2User: any;
    let worker3User: any;

    it('Skenario 1 Pekerja: Admin dan Finance pada proyek/departemen dengan 1 pekerja menerima nilai null / isCostHidden: true', async () => {
      // 1. Buat task pada projectAId
      const task1 = await prisma.task.create({
        data: {
          title: 'Task 1 E2E Dashboard',
          projectId: projectAId,
        },
      });
      task1Id = task1.id;

      // 2. Pasang tarif per jam untuk penggunaUser (Pekerja 1)
      await prisma.hourlyCost.create({
        data: {
          userId: penggunaUser.id,
          ratePerHour: 100000,
          effectiveFrom: new Date('2026-01-01'),
          setBy: superAdminUser.id,
        },
      });

      // 3. Buat timesheet disetujui untuk Pekerja 1 (8 jam = 800.000)
      const ts1 = await prisma.timesheet.create({
        data: {
          userId: penggunaUser.id,
          weekStart: new Date('2026-10-19'),
          status: 'disetujui',
          approvedBy: adminAUser.id,
          approvedAt: new Date(),
        },
      });

      await prisma.timesheetEntry.create({
        data: {
          timesheetId: ts1.id,
          taskId: task1Id,
          workDate: new Date('2026-10-19'),
          hours: 8,
          costAmount: 800000,
        },
      });

      // Uji Admin Dasbor: 1 pekerja < default threshold 3 => isCostHidden: true, laborCost: null
      const adminRes = await request(app.getHttpServer())
        .get('/dashboard/admin')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const projInAdmin = adminRes.body.projectHealth.find(
        (p: any) => p.id === projectAId,
      );
      expect(projInAdmin).toBeDefined();
      expect(projInAdmin.isCostHidden).toBe(true);
      expect(projInAdmin.laborCost).toBeNull();
      expect(projInAdmin.totalActual).toBeNull(); // Disembunyikan agar tidak bisa dikurangkan

      // Departemen juga hanya punya 1 pekerja => disembunyikan
      expect(adminRes.body.isCostHidden).toBe(true);
      expect(adminRes.body.usedBudget).toBeNull();

      // Verifikasi respons tidak membocorkan userId atau costAmount per orang
      const adminResStr = JSON.stringify(adminRes.body);
      expect(adminResStr).not.toContain(penggunaUser.id);
      expect(adminResStr).not.toContain('800000');

      // Uji Finance Dasbor: 1 pekerja => isCostHidden: true
      const financeRes = await request(app.getHttpServer())
        .get('/dashboard/finance')
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(200);

      const deptAInLabor = financeRes.body.laborCostByDept.find(
        (d: any) => d.departmentId === deptAId,
      );
      expect(deptAInLabor).toBeDefined();
      expect(deptAInLabor.isCostHidden).toBe(true);
      expect(deptAInLabor.totalCost).toBeNull();

      const deptAInAbs = financeRes.body.departmentAbsorption.find(
        (d: any) => d.departmentId === deptAId,
      );
      expect(deptAInAbs).toBeDefined();
      expect(deptAInAbs.isCostHidden).toBe(true);
      expect(deptAInAbs.actual).toBeNull();

      // Verifikasi respons Finance tidak membocorkan userId atau costAmount per orang
      const financeResStr = JSON.stringify(financeRes.body);
      expect(financeResStr).not.toContain(penggunaUser.id);
      expect(financeResStr).not.toContain('800000');

      // Uji Ringkasan Anggaran Proyek (GET /projects/:projectId/budget/summary) untuk Admin
      const summaryAdminRes = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/summary`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(summaryAdminRes.body.isCostHidden).toBe(true);
      expect(summaryAdminRes.body.laborActual).toBeNull();
      expect(summaryAdminRes.body.totalActual).toBeNull();
      expect(JSON.stringify(summaryAdminRes.body)).not.toContain(penggunaUser.id);

      // Super Admin menerima nilai eksak tanpa disembunyikan
      const saSummaryRes = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/summary`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(saSummaryRes.body.isCostHidden).toBe(false);
      expect(Number(saSummaryRes.body.laborActual)).toBe(800000);
      expect(Number(saSummaryRes.body.totalActual)).toBe(5800000); // 5.000.000 expense + 800.000 labor

      const saDashRes = await request(app.getHttpServer())
        .get('/dashboard/super-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const projInSA = saDashRes.body.projectHealth.find(
        (p: any) => p.id === projectAId,
      );
      expect(projInSA).toBeDefined();
      expect(projInSA.isCostHidden).toBe(false);
      expect(Number(projInSA.laborCost)).toBe(800000);
      expect(Number(projInSA.totalActual)).toBe(5800000);
    });

    it('Skenario 3 Pekerja: dengan 3 pekerja disetujui, Admin dan Finance menerima nilai terbulatkan kelipatan Rp 100.000, Super Admin menerima nilai tepat', async () => {
      // Buat pekerja 2 & 3
      const passwordHash = await argon2.hash(TEST_PASSWORD);
      worker2User = await prisma.user.create({
        data: {
          name: 'E2E Worker 2 DSH',
          email: `${PREFIX}worker2@damaco.test`,
          passwordHash,
          role: Role.pengguna,
          departmentId: deptAId,
          isActive: true,
        },
      });

      worker3User = await prisma.user.create({
        data: {
          name: 'E2E Worker 3 DSH',
          email: `${PREFIX}worker3@damaco.test`,
          passwordHash,
          role: Role.pengguna,
          departmentId: deptAId,
          isActive: true,
        },
      });

      // Pasang tarif per jam:
      // Pekerja 2: 120.000, 5 jam = 600.000
      // Pekerja 3: 150.000, 4 jam = 600.000
      // Total biaya tenaga kerja 3 pekerja = 800.000 + 600.000 + 600.000 = 2.000.000
      await prisma.hourlyCost.createMany({
        data: [
          {
            userId: worker2User.id,
            ratePerHour: 120000,
            effectiveFrom: new Date('2026-01-01'),
            setBy: superAdminUser.id,
          },
          {
            userId: worker3User.id,
            ratePerHour: 150000,
            effectiveFrom: new Date('2026-01-01'),
            setBy: superAdminUser.id,
          },
        ],
      });

      const task2 = await prisma.task.create({
        data: { title: 'Task 2 E2E Dashboard', projectId: projectAId },
      });
      task2Id = task2.id;

      const task3 = await prisma.task.create({
        data: { title: 'Task 3 E2E Dashboard', projectId: projectAId },
      });
      task3Id = task3.id;

      const ts2 = await prisma.timesheet.create({
        data: {
          userId: worker2User.id,
          weekStart: new Date('2026-10-19'),
          status: 'disetujui',
          approvedBy: adminAUser.id,
          approvedAt: new Date(),
        },
      });
      await prisma.timesheetEntry.create({
        data: {
          timesheetId: ts2.id,
          taskId: task2Id,
          workDate: new Date('2026-10-20'),
          hours: 5,
          costAmount: 600000,
        },
      });

      const ts3 = await prisma.timesheet.create({
        data: {
          userId: worker3User.id,
          weekStart: new Date('2026-10-19'),
          status: 'disetujui',
          approvedBy: adminAUser.id,
          approvedAt: new Date(),
        },
      });
      await prisma.timesheetEntry.create({
        data: {
          timesheetId: ts3.id,
          taskId: task3Id,
          workDate: new Date('2026-10-21'),
          hours: 4,
          costAmount: 600000,
        },
      });

      // Uji Admin Dasbor: 3 pekerja >= threshold 3 => isCostHidden: false, terbulatkan 100k
      const adminRes = await request(app.getHttpServer())
        .get('/dashboard/admin')
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      const projInAdmin = adminRes.body.projectHealth.find(
        (p: any) => p.id === projectAId,
      );
      expect(projInAdmin).toBeDefined();
      expect(projInAdmin.isCostHidden).toBe(false);
      expect(Number(projInAdmin.laborCost)).toBe(2000000);
      expect(Number(projInAdmin.laborCost) % 100000).toBe(0);
      expect(Number(projInAdmin.totalActual)).toBe(7000000); // 5jt + 2jt

      // Respons tidak membocorkan userId atau costAmount per orang
      const adminResStr = JSON.stringify(adminRes.body);
      expect(adminResStr).not.toContain(penggunaUser.id);
      expect(adminResStr).not.toContain(worker2User.id);
      expect(adminResStr).not.toContain(worker3User.id);

      // Uji Finance Dasbor: 3 pekerja => isCostHidden: false, terbulatkan 100k
      const financeRes = await request(app.getHttpServer())
        .get('/dashboard/finance')
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(200);

      const deptAInLabor = financeRes.body.laborCostByDept.find(
        (d: any) => d.departmentId === deptAId,
      );
      expect(deptAInLabor).toBeDefined();
      expect(deptAInLabor.isCostHidden).toBe(false);
      expect(Number(deptAInLabor.totalCost)).toBe(2000000);
      expect(Number(deptAInLabor.totalCost) % 100000).toBe(0);

      // Respons Finance tidak memuat userId pekerja
      const financeResStr = JSON.stringify(financeRes.body);
      expect(financeResStr).not.toContain(penggunaUser.id);
      expect(financeResStr).not.toContain(worker2User.id);
      expect(financeResStr).not.toContain(worker3User.id);

      // Uji Ringkasan Anggaran Proyek untuk Admin
      const summaryAdminRes = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/summary`)
        .set('Authorization', `Bearer ${adminAToken}`)
        .expect(200);

      expect(summaryAdminRes.body.isCostHidden).toBe(false);
      expect(Number(summaryAdminRes.body.laborActual)).toBe(2000000);
      expect(Number(summaryAdminRes.body.laborActual) % 100000).toBe(0);
      expect(Number(summaryAdminRes.body.totalActual)).toBe(7000000);

      // Super Admin menerima nilai tepat
      const saSummaryRes = await request(app.getHttpServer())
        .get(`/projects/${projectAId}/budget/summary`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(saSummaryRes.body.isCostHidden).toBe(false);
      expect(Number(saSummaryRes.body.laborActual)).toBe(2000000);
      expect(Number(saSummaryRes.body.totalActual)).toBe(7000000);
    });
  });
});
