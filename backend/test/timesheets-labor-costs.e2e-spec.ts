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
  PrismaClient,
  ProjectStatus,
  Role,
  TimesheetStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Timesheets & Labor Costs Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const TEST_PASSWORD = 'PasswordTimesheetE2E123!';
  const PREFIX = 'e2e-ts-';

  let deptAId: string;
  let deptBId: string;
  let ccDeptAId: string;
  let ccDeptBId: string;

  let penggunaAUser: any;
  let penggunaA2User: any;
  let penggunaBUser: any;
  let adminAUser: any;
  let adminBUser: any;
  let financeUser: any;
  let superAdminUser: any;

  let penggunaAToken: string;
  let penggunaA2Token: string;
  let penggunaBToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let financeToken: string;
  let superAdminToken: string;

  let projectAId: string;
  let projectBId: string;
  let taskA1Id: string;
  let taskA2Id: string;
  let taskB1Id: string;

  const cleanTestData = async () => {
    const currentDbUrl = process.env.DATABASE_URL || '';
    if (!currentDbUrl.includes('budgetflow_test')) {
      throw new Error(
        `Operasi pembersihan dibatalkan: DATABASE_URL bukan 'budgetflow_test'!`,
      );
    }

    // 1. Hapus timesheet_entries & timesheets
    const userIds = (
      await prisma.user.findMany({
        where: { email: { startsWith: PREFIX } },
        select: { id: true },
      })
    ).map((u) => u.id);

    if (userIds.length > 0) {
      await prisma.timesheetEntry.deleteMany({
        where: { timesheet: { userId: { in: userIds } } },
      });
      await prisma.timesheet.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.hourlyCost.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.approval.deleteMany({
        where: { approverId: { in: userIds } },
      });
    }

    // Hapus task, phase, member, project
    const projectIds = (
      await prisma.project.findMany({
        where: { name: { startsWith: 'E2E-PROJ-TS-' } },
        select: { id: true },
      })
    ).map((p) => p.id);

    if (projectIds.length > 0) {
      const taskIds = (
        await prisma.task.findMany({
          where: { projectId: { in: projectIds } },
          select: { id: true },
        })
      ).map((t) => t.id);

      if (taskIds.length > 0) {
        await prisma.timesheetEntry.deleteMany({
          where: { taskId: { in: taskIds } },
        });
        await prisma.taskChecklist.deleteMany({
          where: { taskId: { in: taskIds } },
        });
        await prisma.taskComment.deleteMany({
          where: { taskId: { in: taskIds } },
        });
        await prisma.task.deleteMany({
          where: { id: { in: taskIds } },
        });
      }

      await prisma.projectMember.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.phase.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.project.deleteMany({
        where: { id: { in: projectIds } },
      });
    }

    // Hapus cost center & department
    await prisma.costCenter.deleteMany({
      where: { code: { startsWith: 'E2E-CC-TS-' } },
    });
    await prisma.department.deleteMany({
      where: { name: { startsWith: 'E2E-DEPT-TS-' } },
    });

    // Reset activity logs
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE `activity_logs`');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    // Hapus user
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

    // 1. Departemen & Cost Center
    const deptA = await prisma.department.create({
      data: { name: 'E2E-DEPT-TS-A', isActive: true },
    });
    deptAId = deptA.id;

    const deptB = await prisma.department.create({
      data: { name: 'E2E-DEPT-TS-B', isActive: true },
    });
    deptBId = deptB.id;

    const ccA = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-TS-A',
        name: 'CC TS A',
        departmentId: deptAId,
        isActive: true,
      },
    });
    ccDeptAId = ccA.id;

    const ccB = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-TS-B',
        name: 'CC TS B',
        departmentId: deptBId,
        isActive: true,
      },
    });
    ccDeptBId = ccB.id;

    // 2. Pengguna
    const passwordHash = await argon2.hash(TEST_PASSWORD);

    penggunaAUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna TS A',
        email: `${PREFIX}pengguna-a@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: true,
      },
    });

    penggunaA2User = await prisma.user.create({
      data: {
        name: 'E2E Pengguna TS A2',
        email: `${PREFIX}pengguna-a2@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: true,
      },
    });

    penggunaBUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna TS B',
        email: `${PREFIX}pengguna-b@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptBId,
        isActive: true,
      },
    });

    adminAUser = await prisma.user.create({
      data: {
        name: 'E2E Admin TS A',
        email: `${PREFIX}admin-a@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminBUser = await prisma.user.create({
      data: {
        name: 'E2E Admin TS B',
        email: `${PREFIX}admin-b@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptBId,
        isActive: true,
      },
    });

    financeUser = await prisma.user.create({
      data: {
        name: 'E2E Finance TS',
        email: `${PREFIX}finance@damaco.test`,
        passwordHash,
        role: Role.finance,
        departmentId: deptAId,
        isActive: true,
      },
    });

    superAdminUser = await prisma.user.create({
      data: {
        name: 'E2E Super Admin TS',
        email: `${PREFIX}superadmin@damaco.test`,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });

    // 3. Proyek & Task
    const projA = await prisma.project.create({
      data: {
        name: 'E2E-PROJ-TS-A',
        departmentId: deptAId,
        costCenterId: ccDeptAId,
        createdById: adminAUser.id,
        status: ProjectStatus.berjalan,
      },
    });
    projectAId = projA.id;

    const projB = await prisma.project.create({
      data: {
        name: 'E2E-PROJ-TS-B',
        departmentId: deptBId,
        costCenterId: ccDeptBId,
        createdById: adminBUser.id,
        status: ProjectStatus.berjalan,
      },
    });
    projectBId = projB.id;

    // Tambah anggota: penggunaAUser & penggunaA2User di Proyek A
    await prisma.projectMember.createMany({
      data: [
        { projectId: projectAId, userId: penggunaAUser.id },
        { projectId: projectAId, userId: penggunaA2User.id },
        { projectId: projectAId, userId: adminAUser.id },
        { projectId: projectBId, userId: penggunaBUser.id },
      ],
    });

    // Buat tasks
    const taskA1 = await prisma.task.create({
      data: {
        projectId: projectAId,
        title: 'Task A1 Fitur Login',
        assigneeId: penggunaAUser.id,
      },
    });
    taskA1Id = taskA1.id;

    const taskA2 = await prisma.task.create({
      data: {
        projectId: projectAId,
        title: 'Task A2 Fitur Register',
        assigneeId: penggunaA2User.id,
      },
    });
    taskA2Id = taskA2.id;

    const taskB1 = await prisma.task.create({
      data: {
        projectId: projectBId,
        title: 'Task B1 Fitur Pembayaran',
        assigneeId: penggunaBUser.id,
      },
    });
    taskB1Id = taskB1.id;

    // 4. Inisialisasi NestJS Application
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

    penggunaAToken = await jwtService.signAsync(
      {
        sub: penggunaAUser.id,
        email: penggunaAUser.email,
        role: Role.pengguna,
        departmentId: penggunaAUser.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    penggunaA2Token = await jwtService.signAsync(
      {
        sub: penggunaA2User.id,
        email: penggunaA2User.email,
        role: Role.pengguna,
        departmentId: penggunaA2User.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    penggunaBToken = await jwtService.signAsync(
      {
        sub: penggunaBUser.id,
        email: penggunaBUser.email,
        role: Role.pengguna,
        departmentId: penggunaBUser.departmentId,
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
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // PENGUJIAN 1 s/d 17 SESUAI SPESIFIKASI PERSYARATAN
  // ─────────────────────────────────────────────────────────────

  describe('1. Validasi Kepemilikan & Pengisian Timesheet', () => {
    it('pengguna tidak bisa mengisi timesheet orang lain (403)', async () => {
      const res = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${penggunaAToken}`)
        .send({
          weekStart: '2026-10-19', // Hari Senin
          userId: penggunaBUser.id, // Mencoba mengisi atas nama user B
          entries: [{ taskId: taskA1Id, workDate: '2026-10-19', hours: 8 }],
        });

      expect(res.status).toBe(403);
    });

    it('weekStart bukan Senin ditolak (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${penggunaAToken}`)
        .send({
          weekStart: '2026-10-20', // Hari Selasa
          entries: [{ taskId: taskA1Id, workDate: '2026-10-20', hours: 8 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Senin');
    });

    it('total jam harian lebih dari 24 ditolak (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${penggunaAToken}`)
        .send({
          weekStart: '2026-10-19',
          entries: [
            { taskId: taskA1Id, workDate: '2026-10-19', hours: 14 },
            { taskId: taskA1Id, workDate: '2026-10-19', hours: 12 }, // Total 26 jam
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('24');
    });

    it('entry di task proyek yang bukan miliknya ditolak (400)', async () => {
      // Pengguna A bukan anggota Proyek B (taskB1Id)
      const res = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${penggunaAToken}`)
        .send({
          weekStart: '2026-10-19',
          entries: [{ taskId: taskB1Id, workDate: '2026-10-19', hours: 8 }],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('anggota');
    });

    it('timesheet kosong tidak bisa diajukan (400)', async () => {
      // Buat timesheet draft tanpa entry
      const createRes = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${penggunaAToken}`)
        .send({
          weekStart: '2026-10-19',
          entries: [],
        });
      expect(createRes.status).toBe(201);
      const timesheetId = createRes.body.id;

      // Coba submit timesheet kosong
      const submitRes = await request(app.getHttpServer())
        .post(`/timesheets/${timesheetId}/submit`)
        .set('Authorization', `Bearer ${penggunaAToken}`);

      expect(submitRes.status).toBe(400);
      expect(submitRes.body.message).toContain('kosong');
    });
  });

  describe('2. Alur Persetujuan & Batasan Admin', () => {
    let timesheetDeptAId: string;
    let timesheetAdminAId: string;

    beforeAll(async () => {
      // Isi entry valid untuk timesheet pengguna A minggu 2026-10-19
      const existing = await prisma.timesheet.findUnique({
        where: {
          userId_weekStart: {
            userId: penggunaAUser.id,
            weekStart: new Date('2026-10-19T00:00:00.000Z'),
          },
        },
      });

      if (existing) {
        await request(app.getHttpServer())
          .put(`/timesheets/${existing.id}`)
          .set('Authorization', `Bearer ${penggunaAToken}`)
          .send({
            entries: [{ taskId: taskA1Id, workDate: '2026-10-19', hours: 8 }],
          });
        timesheetDeptAId = existing.id;
      } else {
        const createRes = await request(app.getHttpServer())
          .post('/timesheets')
          .set('Authorization', `Bearer ${penggunaAToken}`)
          .send({
            weekStart: '2026-10-19',
            entries: [{ taskId: taskA1Id, workDate: '2026-10-19', hours: 8 }],
          });
        timesheetDeptAId = createRes.body.id;
      }

      // Ajukan timesheet pengguna A
      await request(app.getHttpServer())
        .post(`/timesheets/${timesheetDeptAId}/submit`)
        .set('Authorization', `Bearer ${penggunaAToken}`);

      // Buat & ajukan timesheet untuk Admin A sendiri (minggu 2026-10-19)
      const adminTsRes = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          weekStart: '2026-10-19',
          entries: [{ taskId: taskA1Id, workDate: '2026-10-19', hours: 8 }],
        });
      timesheetAdminAId = adminTsRes.body.id;

      await request(app.getHttpServer())
        .post(`/timesheets/${timesheetAdminAId}/submit`)
        .set('Authorization', `Bearer ${adminAToken}`);
    });

    it('admin dept B tidak bisa menyetujui timesheet dept A (404)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/timesheets/${timesheetDeptAId}/approve`)
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(404);
    });

    it('admin tidak bisa menyetujui miliknya sendiri (400)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/timesheets/${timesheetAdminAId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('sendiri');
    });

    it('persetujuan tanpa tarif ditolak dan tidak mengubah apa pun (400)', async () => {
      // Pastikan pengguna A belum punya tarif di hourly_costs
      await prisma.hourlyCost.deleteMany({
        where: { userId: penggunaAUser.id },
      });

      const res = await request(app.getHttpServer())
        .post(`/timesheets/${timesheetDeptAId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('tarif per jam belum diatur');

      // Verifikasi status timesheet tetap menunggu_admin dan costAmount tetap null
      const check = await prisma.timesheet.findUnique({
        where: { id: timesheetDeptAId },
        include: { entries: true },
      });
      expect(check?.status).toBe(TimesheetStatus.menunggu_admin);
      expect(check?.entries[0].costAmount).toBeNull();
    });

    it('costAmount tersimpan sebagai snapshot dan tidak berubah saat tarif baru ditambahkan', async () => {
      // 1. Super Admin mengatur tarif awal Rp100.000 per jam berlaku sejak 2026-01-01
      const rateRes = await request(app.getHttpServer())
        .post('/hourly-costs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          userId: penggunaAUser.id,
          ratePerHour: 100000,
          effectiveFrom: '2026-01-01',
        });
      expect(rateRes.status).toBe(201);

      // 2. Admin A menyetujui timesheet pengguna A (8 jam x Rp100.000 = Rp800.000)
      const approveRes = await request(app.getHttpServer())
        .post(`/timesheets/${timesheetDeptAId}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`);
      expect(approveRes.status).toBe(200);

      // 3. Verifikasi snapshot costAmount di database = 800000.00
      const entryBefore = await prisma.timesheetEntry.findFirst({
        where: { timesheetId: timesheetDeptAId },
      });
      expect(Number(entryBefore?.costAmount)).toBe(800000);

      // 4. Tambah tarif baru yang lebih tinggi (Rp250.000) berlaku sejak 2026-10-20
      await request(app.getHttpServer())
        .post('/hourly-costs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          userId: penggunaAUser.id,
          ratePerHour: 250000,
          effectiveFrom: '2026-10-20',
        });

      // 5. Verifikasi snapshot costAmount pada entry lama TIDAK berubah
      const entryAfter = await prisma.timesheetEntry.findFirst({
        where: { timesheetId: timesheetDeptAId },
      });
      expect(Number(entryAfter?.costAmount)).toBe(800000);
    });

    it('timesheet disetujui tidak bisa diubah (400)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/timesheets/${timesheetDeptAId}`)
        .set('Authorization', `Bearer ${penggunaAToken}`)
        .send({
          entries: [{ taskId: taskA1Id, workDate: '2026-10-19', hours: 5 }],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('3. Keamanan Informasi: Pencegahan Kebocoran Biaya Per Orang', () => {
    let timesheetId: string;

    beforeAll(async () => {
      const ts = await prisma.timesheet.findFirst({
        where: { userId: penggunaAUser.id, status: TimesheetStatus.disetujui },
      });
      timesheetId = ts!.id;
    });

    it('RESPONS admin dan pengguna tidak memuat costAmount, tarif, atau biaya per orang di endpoint mana pun', async () => {
      // 1. Pengguna memanggil GET /timesheets/:id
      const userDetail = await request(app.getHttpServer())
        .get(`/timesheets/${timesheetId}`)
        .set('Authorization', `Bearer ${penggunaAToken}`);
      expect(userDetail.status).toBe(200);
      expect(userDetail.body.entries[0].costAmount).toBeUndefined();

      // 2. Pengguna memanggil GET /timesheets/my
      const userMy = await request(app.getHttpServer())
        .get('/timesheets/my')
        .set('Authorization', `Bearer ${penggunaAToken}`);
      expect(userMy.status).toBe(200);
      expect(userMy.body.data[0].entries[0].costAmount).toBeUndefined();

      // 3. Admin memanggil GET /timesheets/:id
      const adminDetail = await request(app.getHttpServer())
        .get(`/timesheets/${timesheetId}`)
        .set('Authorization', `Bearer ${adminAToken}`);
      expect(adminDetail.status).toBe(200);
      expect(adminDetail.body.entries[0].costAmount).toBeUndefined();

      // 4. Admin memanggil GET /timesheets/team
      const adminTeam = await request(app.getHttpServer())
        .get('/timesheets/team')
        .set('Authorization', `Bearer ${adminAToken}`);
      expect(adminTeam.status).toBe(200);
      expect(adminTeam.body.data[0].entries[0].costAmount).toBeUndefined();
    });

    it('finance, admin, pengguna mendapat 403 di seluruh endpoint hourly_costs', async () => {
      // Pengguna
      const pGet = await request(app.getHttpServer())
        .get('/hourly-costs')
        .set('Authorization', `Bearer ${penggunaAToken}`);
      expect(pGet.status).toBe(403);

      const pPost = await request(app.getHttpServer())
        .post('/hourly-costs')
        .set('Authorization', `Bearer ${penggunaAToken}`)
        .send({
          userId: penggunaAUser.id,
          ratePerHour: 50000,
          effectiveFrom: '2026-05-01',
        });
      expect(pPost.status).toBe(403);

      // Admin
      const aGet = await request(app.getHttpServer())
        .get('/hourly-costs')
        .set('Authorization', `Bearer ${adminAToken}`);
      expect(aGet.status).toBe(403);

      // Finance
      const fGet = await request(app.getHttpServer())
        .get('/hourly-costs')
        .set('Authorization', `Bearer ${financeToken}`);
      expect(fGet.status).toBe(403);
    });

    it('akses super_admin ke biaya per orang tercatat di log', async () => {
      // Bersihkan log sebelumnya
      await prisma.activityLog.deleteMany({
        where: { action: 'akses_biaya_per_orang' },
      });

      // Super Admin melihat detail timesheet yang memuat costAmount
      const res = await request(app.getHttpServer())
        .get(`/timesheets/${timesheetId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.entries[0].costAmount).toBeDefined();

      // Cek pencatatan di activity_logs
      const log = await prisma.activityLog.findFirst({
        where: {
          action: 'akses_biaya_per_orang',
          module: 'timesheets',
          entityId: timesheetId,
          userId: superAdminUser.id,
        },
      });

      expect(log).not.toBeNull();
    });
  });

  describe('4. Agregat Biaya Tenaga Kerja & Aturan Minimum Pekerja', () => {
    let timesheetA2Id: string;

    beforeAll(async () => {
      // Saat ini di Proyek A baru ada 1 pekerja yang disetujui (Pengguna A).
      // Pengguna A2 (pekerja kedua) mengisi timesheet untuk minggu 2026-10-19 pada tanggal 2026-10-21
      const a2TsRes = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${penggunaA2Token}`)
        .send({
          weekStart: '2026-10-19',
          entries: [{ taskId: taskA2Id, workDate: '2026-10-21', hours: 5 }],
        });
      timesheetA2Id = a2TsRes.body.id;

      // Berikan tarif untuk Pengguna A2
      await request(app.getHttpServer())
        .post('/hourly-costs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          userId: penggunaA2User.id,
          ratePerHour: 120000,
          effectiveFrom: '2026-01-01',
        });
    });

    it('agregat finance per proyek dengan satu pekerja disembunyikan, dengan dua pekerja ditampilkan', async () => {
      // 1. Skenario 1 pekerja: Proyek A hanya memiliki Pengguna A (disetujui), Pengguna A2 masih draft
      const singleWorkerRes = await request(app.getHttpServer())
        .get(`/labor-costs/projects/${projectAId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(singleWorkerRes.status).toBe(200);
      expect(singleWorkerRes.body.totalHours).toBe(8);
      expect(singleWorkerRes.body.costAmount).toBeNull();
      expect(singleWorkerRes.body.isCostHidden).toBe(true);
      expect(singleWorkerRes.body.hiddenReason).toContain('terlalu sedikit');

      // 2. Sekarang ajukan dan setujui timesheet Pengguna A2
      await request(app.getHttpServer())
        .post(`/timesheets/${timesheetA2Id}/submit`)
        .set('Authorization', `Bearer ${penggunaA2Token}`);

      await request(app.getHttpServer())
        .post(`/timesheets/${timesheetA2Id}/approve`)
        .set('Authorization', `Bearer ${adminAToken}`);

      // 3. Skenario 2 pekerja: Proyek A memiliki Pengguna A (8 jam x 100rb = 800rb) dan Pengguna A2 (5 jam x 120rb = 600rb)
      const twoWorkersRes = await request(app.getHttpServer())
        .get(`/labor-costs/projects/${projectAId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(twoWorkersRes.status).toBe(200);
      expect(twoWorkersRes.body.totalHours).toBe(13); // 8 + 5
      expect(twoWorkersRes.body.isCostHidden).toBe(false);
      expect(twoWorkersRes.body.costAmount).not.toBeNull();
      expect(Number(twoWorkersRes.body.costAmount)).toBe(1400000); // 800.000 + 600.000
    });

    it('agregat tidak memuat userId atau nama pekerja', async () => {
      const res = await request(app.getHttpServer())
        .get(`/labor-costs/projects/${projectAId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(res.status).toBe(200);
      const str = JSON.stringify(res.body);

      expect(str).not.toContain(penggunaAUser.id);
      expect(str).not.toContain(penggunaA2User.id);
      expect(str).not.toContain(penggunaAUser.name);
      expect(str).not.toContain(penggunaA2User.name);
      expect(res.body.users).toBeUndefined();
      expect(res.body.members).toBeUndefined();
      expect(res.body.workers).toBeUndefined();
    });

    it('filter tanggal sempit tidak bisa membocorkan satu orang', async () => {
      // Pengguna A bekerja pada 2026-10-19, Pengguna A2 bekerja pada 2026-10-21.
      // Jika finance memfilter hanya 2026-10-19 (rentang sempit di mana hanya 1 pekerja yang bekerja):
      const filteredRes = await request(app.getHttpServer())
        .get(
          `/labor-costs/projects/${projectAId}?startDate=2026-10-19&endDate=2026-10-19`,
        )
        .set('Authorization', `Bearer ${financeToken}`);

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.totalHours).toBe(8);
      // Biaya harus disembunyikan karena pekerja yang difilter < 2 orang
      expect(filteredRes.body.isCostHidden).toBe(true);
      expect(filteredRes.body.costAmount).toBeNull();
      expect(filteredRes.body.hiddenReason).toContain('terlalu sedikit');
    });

    it('agregat departemen dengan kurang dari 2 pekerja disembunyikan', async () => {
      // Buat & setujui timesheet pengguna B di Departemen B (hanya 1 pekerja)
      const bTsRes = await request(app.getHttpServer())
        .post('/timesheets')
        .set('Authorization', `Bearer ${penggunaBToken}`)
        .send({
          weekStart: '2026-10-19',
          entries: [{ taskId: taskB1Id, workDate: '2026-10-19', hours: 7 }],
        });

      await request(app.getHttpServer())
        .post('/hourly-costs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          userId: penggunaBUser.id,
          ratePerHour: 90000,
          effectiveFrom: '2026-01-01',
        });

      await request(app.getHttpServer())
        .post(`/timesheets/${bTsRes.body.id}/submit`)
        .set('Authorization', `Bearer ${penggunaBToken}`);

      await request(app.getHttpServer())
        .post(`/timesheets/${bTsRes.body.id}/approve`)
        .set('Authorization', `Bearer ${adminBToken}`);

      // Finance melihat agregat Departemen B yang hanya punya 1 pekerja
      const deptBRes = await request(app.getHttpServer())
        .get(`/labor-costs/departments/${deptBId}`)
        .set('Authorization', `Bearer ${financeToken}`);

      expect(deptBRes.status).toBe(200);
      expect(deptBRes.body.totalHours).toBe(7);
      expect(deptBRes.body.isCostHidden).toBe(true);
      expect(deptBRes.body.costAmount).toBeNull();
      expect(deptBRes.body.hiddenReason).toContain('terlalu sedikit');
    });
  });
});
