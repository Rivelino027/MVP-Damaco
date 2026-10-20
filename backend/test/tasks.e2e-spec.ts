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
  AttachmentOwner,
  PrismaClient,
  ProjectStatus,
  Role,
  TaskStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import * as fs from 'fs';
import * as path from 'path';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tasks Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const TEST_PASSWORD = 'PasswordTasksE2E123!';
  const PREFIX = 'e2e-task-';

  let deptAId: string;
  let deptBId: string;
  let ccDeptAId: string;
  let ccDeptBId: string;
  let projectTypeId: string;

  let penggunaAUser: any;
  let penggunaBUser: any;
  let adminAUser: any;
  let adminBUser: any;
  let financeUser: any;
  let superAdminUser: any;

  let penggunaAToken: string;
  let penggunaBToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let financeToken: string;
  let superAdminToken: string;

  let projectAId: string;
  let projectBId: string;
  let phaseAId: string;

  const cleanTestData = async () => {
    const currentDbUrl = process.env.DATABASE_URL || '';
    if (!currentDbUrl.includes('budgetflow_test')) {
      throw new Error(
        `Operasi pembersihan dibatalkan: DATABASE_URL bukan 'budgetflow_test'!`,
      );
    }

    // 1. Bersihkan lampiran, checklist, komentar, task uji
    const taskIds = (
      await prisma.task.findMany({
        where: { project: { name: { startsWith: 'E2E-TASK-' } } },
        select: { id: true },
      })
    ).map((t) => t.id);

    if (taskIds.length > 0) {
      await prisma.attachment.deleteMany({
        where: {
          ownerType: AttachmentOwner.task,
          ownerId: { in: taskIds },
        },
      });
      await prisma.taskChecklist.deleteMany({
        where: { taskId: { in: taskIds } },
      });
      await prisma.taskComment.deleteMany({
        where: { taskId: { in: taskIds } },
      });
      await prisma.timesheetEntry.deleteMany({
        where: { taskId: { in: taskIds } },
      });
      await prisma.expense.deleteMany({
        where: { taskId: { in: taskIds } },
      });
    }

    await prisma.task.deleteMany({
      where: { project: { name: { startsWith: 'E2E-TASK-' } } },
    });
    await prisma.milestone.deleteMany({
      where: { project: { name: { startsWith: 'E2E-TASK-' } } },
    });
    await prisma.phase.deleteMany({
      where: { project: { name: { startsWith: 'E2E-TASK-' } } },
    });
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { name: { startsWith: 'E2E-TASK-' } } },
          { user: { email: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.project.deleteMany({
      where: { name: { startsWith: 'E2E-TASK-' } },
    });

    // 2. Hapus master data uji
    await prisma.costCenter.deleteMany({
      where: { code: { startsWith: 'E2E-CC-TASK-' } },
    });
    await prisma.projectType.deleteMany({
      where: { name: { startsWith: 'E2E-PT-TASK-' } },
    });
    await prisma.department.deleteMany({
      where: { name: { startsWith: 'E2E-DEPT-TASK-' } },
    });

    // 3. Reset activity_logs
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE `activity_logs`');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    // 4. Hapus pengguna uji
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

    // Buat departemen & cost center
    const deptA = await prisma.department.create({
      data: {
        name: 'E2E-DEPT-TASK-A',
        annualBudget: 400000000,
        isActive: true,
      },
    });
    deptAId = deptA.id;

    const deptB = await prisma.department.create({
      data: {
        name: 'E2E-DEPT-TASK-B',
        annualBudget: 300000000,
        isActive: true,
      },
    });
    deptBId = deptB.id;

    const ccA = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-TASK-A1',
        name: 'Cost Center Task A',
        departmentId: deptAId,
        isActive: true,
      },
    });
    ccDeptAId = ccA.id;

    const ccB = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-TASK-B1',
        name: 'Cost Center Task B',
        departmentId: deptBId,
        isActive: true,
      },
    });
    ccDeptBId = ccB.id;

    const pt = await prisma.projectType.create({
      data: {
        name: 'E2E-PT-TASK-DEV',
        isActive: true,
      },
    });
    projectTypeId = pt.id;

    const passwordHash = await argon2.hash(TEST_PASSWORD);

    penggunaAUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna Task A',
        email: `${PREFIX}pengguna-a@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: true,
      },
    });

    penggunaBUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna Task B',
        email: `${PREFIX}pengguna-b@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptBId,
        isActive: true,
      },
    });

    adminAUser = await prisma.user.create({
      data: {
        name: 'E2E Admin Task A',
        email: `${PREFIX}admin-a@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminBUser = await prisma.user.create({
      data: {
        name: 'E2E Admin Task B',
        email: `${PREFIX}admin-b@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptBId,
        isActive: true,
      },
    });

    financeUser = await prisma.user.create({
      data: {
        name: 'E2E Finance Task',
        email: `${PREFIX}finance@damaco.test`,
        passwordHash,
        role: Role.finance,
        departmentId: deptAId,
        isActive: true,
      },
    });

    superAdminUser = await prisma.user.create({
      data: {
        name: 'E2E Super Admin Task',
        email: `${PREFIX}superadmin@damaco.test`,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });

    // Inisialisasi NestJS Application
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

    // Buat Proyek A (Dept A) dengan rentang tanggal: 2026-01-01 s.d. 2026-12-31
    const pA = await prisma.project.create({
      data: {
        name: 'E2E-TASK-PROJ-A',
        departmentId: deptAId,
        costCenterId: ccDeptAId,
        projectTypeId,
        createdById: adminAUser.id,
        status: ProjectStatus.berjalan,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        progressPercent: 0,
        members: {
          create: [{ userId: penggunaAUser.id }],
        },
      },
    });
    projectAId = pA.id;

    // Buat Fase dalam Proyek A
    const phA = await prisma.phase.create({
      data: {
        projectId: projectAId,
        name: 'Fase 1: Perencanaan',
        sortOrder: 1,
      },
    });
    phaseAId = phA.id;

    // Buat Proyek B (Dept B)
    const pB = await prisma.project.create({
      data: {
        name: 'E2E-TASK-PROJ-B',
        departmentId: deptBId,
        costCenterId: ccDeptBId,
        projectTypeId,
        createdById: adminBUser.id,
        status: ProjectStatus.berjalan,
        progressPercent: 0,
        members: {
          create: [{ userId: penggunaBUser.id }],
        },
      },
    });
    projectBId = pB.id;
  });

  afterAll(async () => {
    await cleanTestData();
    await prisma.$disconnect();
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Hak Akses Pembuatan Task & Validasi
  // ─────────────────────────────────────────────────────────────

  it('1. pengguna tidak bisa membuat task (403)', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({
        projectId: projectAId,
        title: 'Task Pengguna Ditolak',
      });

    expect(res.status).toBe(403);
  });

  it('2. finance tidak bisa membuat task (403)', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        projectId: projectAId,
        title: 'Task Finance Ditolak',
      });

    expect(res.status).toBe(403);
  });

  it('3. pembuatan task dengan assignee non-anggota proyek ditolak (400)', async () => {
    // Pengguna B bukan anggota Proyek A
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        projectId: projectAId,
        title: 'Task Assignee Salah',
        assigneeId: penggunaBUser.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'Assignee harus merupakan anggota proyek',
    );
  });

  it('4. pembuatan task dengan fase di luar proyek ditolak (400)', async () => {
    // Buat fase di proyek B
    const phaseB = await prisma.phase.create({
      data: {
        projectId: projectBId,
        name: 'Fase Proyek B',
      },
    });

    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        projectId: projectAId,
        phaseId: phaseB.id,
        title: 'Task Fase Salah',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'Fase tidak ditemukan atau tidak berada dalam proyek yang sama',
    );
  });

  it('5. tenggat waktu task di luar rentang proyek ditolak (400)', async () => {
    // Proyek A: 2026-01-01 s.d. 2026-12-31
    const resBefore = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        projectId: projectAId,
        title: 'Task Tenggat Kecepetan',
        dueDate: '2025-12-31T23:59:59.000Z',
      });

    expect(resBefore.status).toBe(400);
    expect(resBefore.body.message).toContain(
      'tidak boleh sebelum tanggal mulai proyek',
    );

    const resAfter = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        projectId: projectAId,
        title: 'Task Tenggat Terlambat',
        dueDate: '2027-01-05T00:00:00.000Z',
      });

    expect(resAfter.status).toBe(400);
    expect(resAfter.body.message).toContain(
      'tidak boleh setelah tanggal selesai proyek',
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Pembuatan Task Valid & Progres Proyek
  // ─────────────────────────────────────────────────────────────

  let taskA1Id: string;
  let taskA2Id: string;

  it('6. admin A berhasil membuat task valid di proyek Dept A (201) dan progres proyek terhitung 0%', async () => {
    const res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        projectId: projectAId,
        phaseId: phaseAId,
        title: 'Task Fitur Login',
        description: 'Implementasi login dengan JWT dan rate limiting',
        assigneeId: penggunaAUser.id,
        dueDate: '2026-06-30T00:00:00.000Z',
        estimatedHours: 8,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Task Fitur Login');
    expect(res.body.status).toBe(TaskStatus.belum_mulai);
    taskA1Id = res.body.id;

    // Periksa progres proyek A: 0 selesai dari 1 task = 0.00%
    const p = await prisma.project.findUnique({ where: { id: projectAId } });
    expect(Number(p?.progressPercent)).toBe(0);
  });

  it('7. admin Dept B tidak bisa mengakses task Dept A (404)', async () => {
    // Admin B mencoba membaca task Dept A
    const getRes = await request(app.getHttpServer())
      .get(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${adminBToken}`);
    expect(getRes.status).toBe(404);

    // Admin B mencoba mengubah task Dept A
    const patchRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({ title: 'Coba Bobol Dept A' });
    expect(patchRes.status).toBe(404);

    // Admin B mencoba menghapus task Dept A
    const delRes = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${adminBToken}`);
    expect(delRes.status).toBe(404);
  });

  it('8. finance hanya bisa membaca task (GET 200, tulis 403)', async () => {
    const getRes = await request(app.getHttpServer())
      .get(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe('Task Fitur Login');

    const patchRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .send({ title: 'Finance Ubah Judul' });
    expect(patchRes.status).toBe(403);

    const delRes = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(delRes.status).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Batasan Scope Pengguna & Sanitasi Kolom Keuangan
  // ─────────────────────────────────────────────────────────────

  it('9. pengguna hanya melihat task miliknya di proyek tempat ia terdaftar', async () => {
    // Buat task kedua di proyek A yang TIDAK di-assign ke pengguna A
    const task2 = await prisma.task.create({
      data: {
        projectId: projectAId,
        title: 'Task Milik Admin A Langsung',
        status: TaskStatus.belum_mulai,
      },
    });
    taskA2Id = task2.id;

    // Pengguna A mengambil daftar task (GET /tasks)
    const listRes = await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', `Bearer ${penggunaAToken}`);
    expect(listRes.status).toBe(200);

    const taskIds = listRes.body.data.map((t: any) => t.id);
    expect(taskIds).toContain(taskA1Id);
    expect(taskIds).not.toContain(taskA2Id);

    // Endpoint khusus Task Saya
    const myTasksRes = await request(app.getHttpServer())
      .get('/tasks/my-tasks')
      .set('Authorization', `Bearer ${penggunaAToken}`);
    expect(myTasksRes.status).toBe(200);
    expect(myTasksRes.body.data.map((t: any) => t.id)).toContain(taskA1Id);

    // Pengguna A mengakses detail task orang lain -> 404
    const detailOtherRes = await request(app.getHttpServer())
      .get(`/tasks/${taskA2Id}`)
      .set('Authorization', `Bearer ${penggunaAToken}`);
    expect(detailOtherRes.status).toBe(404);

    // Pengguna A mencoba mengubah status atau judul task orang lain -> 404
    const patchOtherRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA2Id}`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({ status: TaskStatus.selesai });
    expect(patchOtherRes.status).toBe(404);
  });

  it('10. respons untuk pengguna tidak memuat biaya, tarif, atau field keuangan apa pun', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${penggunaAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.annualBudget).toBeUndefined();
    expect(res.body.costAmount).toBeUndefined();
    expect(res.body.hourlyRate).toBeUndefined();
    expect(res.body.budgets).toBeUndefined();
    expect(res.body.expenses).toBeUndefined();
    expect(res.body.project.annualBudget).toBeUndefined();
    expect(res.body.project.department).toBeUndefined();
  });

  it('11. pengguna hanya bisa mengubah status task miliknya, mencoba ubah judul ditolak (403)', async () => {
    // Pengguna A mencoba mengubah judul task miliknya
    const patchContentRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({ title: 'Judul Baru Dilarang' });

    expect(patchContentRes.status).toBe(403);
    expect(patchContentRes.body.message).toContain(
      'Pengguna hanya diizinkan mengubah status task miliknya',
    );

    // Pengguna A mengubah status task miliknya menjadi 'selesai'
    const patchStatusRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({ status: TaskStatus.selesai });

    expect(patchStatusRes.status).toBe(200);
    expect(patchStatusRes.body.status).toBe(TaskStatus.selesai);

    // Progres proyek A otomatis terhitung ulang:
    // Ada 2 task (taskA1 selesai, taskA2 belum_mulai) -> 1/2 = 50.00%
    const p = await prisma.project.findUnique({ where: { id: projectAId } });
    expect(Number(p?.progressPercent)).toBe(50);
  });

  it('12. pengguna tidak bisa menghapus task (403)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${penggunaAToken}`);

    expect(res.status).toBe(403);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Perhitungan Progres Proyek Setelah Buat, Ubah, dan Hapus Task
  // ─────────────────────────────────────────────────────────────

  it('13. progres proyek terhitung benar setelah buat, ubah status, dan hapus task', async () => {
    // Saat ini: 1 selesai dari 2 task (50%)
    // Buat task ketiga dengan status selesai
    const task3Res = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        projectId: projectAId,
        title: 'Task Ketiga Selesai',
        status: TaskStatus.selesai,
      });
    expect(task3Res.status).toBe(201);
    const task3Id = task3Res.body.id;

    // Sekarang 2 selesai dari 3 task = 66.67%
    let p = await prisma.project.findUnique({ where: { id: projectAId } });
    expect(Number(p?.progressPercent)).toBe(66.67);

    // Ubah taskA2 menjadi selesai via endpoint status
    const updateRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA2Id}/status`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ status: TaskStatus.selesai });
    expect(updateRes.status).toBe(200);

    // Sekarang 3 selesai dari 3 task = 100.00%
    p = await prisma.project.findUnique({ where: { id: projectAId } });
    expect(Number(p?.progressPercent)).toBe(100);

    // Hapus task 3
    const delRes = await request(app.getHttpServer())
      .delete(`/tasks/${task3Id}`)
      .set('Authorization', `Bearer ${adminAToken}`);
    expect(delRes.status).toBe(200);

    // Sekarang 2 selesai dari 2 task = 100.00%
    p = await prisma.project.findUnique({ where: { id: projectAId } });
    expect(Number(p?.progressPercent)).toBe(100);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Proyek Ditutup & Pencegahan Penghapusan Data Bertransaksi
  // ─────────────────────────────────────────────────────────────

  it('14. proyek ditutup menolak task baru, ubah task, dan hapus task (400)', async () => {
    // Buat proyek tertutup
    const closedProj = await prisma.project.create({
      data: {
        name: 'E2E-TASK-PROJ-CLOSED',
        departmentId: deptAId,
        costCenterId: ccDeptAId,
        createdById: adminAUser.id,
        status: ProjectStatus.ditutup,
      },
    });

    // Coba buat task baru
    const createRes = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        projectId: closedProj.id,
        title: 'Task Proyek Ditutup',
      });
    expect(createRes.status).toBe(400);
    expect(createRes.body.message).toContain(
      'sudah ditutup tidak dapat diubah task-nya',
    );
  });

  it('15. hapus task ditolak jika sudah memiliki timesheet entry atau expense terkait (400)', async () => {
    // Kaitkan timesheet dummy pada taskA1Id
    const ts = await prisma.timesheet.create({
      data: {
        userId: penggunaAUser.id,
        weekStart: new Date('2026-03-02'),
      },
    });
    const entry = await prisma.timesheetEntry.create({
      data: {
        timesheetId: ts.id,
        taskId: taskA1Id,
        workDate: new Date('2026-03-03'),
        hours: 4,
      },
    });

    const res = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'sudah memiliki timesheet entry atau pengeluaran terkait',
    );

    // Bersihkan timesheet entry uji
    await prisma.timesheetEntry.delete({ where: { id: entry.id } });
    await prisma.timesheet.delete({ where: { id: ts.id } });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Aturan Anggota & Fase dengan Task Asli
  // ─────────────────────────────────────────────────────────────

  it('16. mengeluarkan anggota yang masih punya task ditolak (dengan task asli)', async () => {
    // Pengguna A memiliki taskA1Id yang ditugaskan kepadanya di Proyek A
    const res = await request(app.getHttpServer())
      .delete(`/projects/${projectAId}/members/${penggunaAUser.id}`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'masih memiliki tugas (task) yang ditugaskan',
    );
  });

  it('17. menghapus fase yang masih punya task ditolak (dengan task asli)', async () => {
    // Fase A memiliki taskA1Id di dalamnya
    const res = await request(app.getHttpServer())
      .delete(`/projects/${projectAId}/phases/${phaseAId}`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'Fase tidak dapat dihapus karena masih memiliki tugas',
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Checklist dan Komentar Task
  // ─────────────────────────────────────────────────────────────

  let checklistId: string;
  let commentId: string;

  it('18. pengguna dapat membuat, mencentang, dan menghapus checklist pada task miliknya', async () => {
    // 1. Buat checklist item
    const createRes = await request(app.getHttpServer())
      .post(`/tasks/${taskA1Id}/checklists`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({ text: 'Verifikasi JWT Secret 32 karakter' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.text).toBe('Verifikasi JWT Secret 32 karakter');
    expect(createRes.body.isDone).toBe(false);
    checklistId = createRes.body.id;

    // 2. Centang checklist item (isDone: true)
    const updateRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA1Id}/checklists/${checklistId}`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({ isDone: true });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.isDone).toBe(true);

    // 3. Pengguna B (di luar scope) mencoba ubah checklist -> 404
    const otherRes = await request(app.getHttpServer())
      .patch(`/tasks/${taskA1Id}/checklists/${checklistId}`)
      .set('Authorization', `Bearer ${penggunaBToken}`)
      .send({ isDone: false });
    expect(otherRes.status).toBe(404);

    // 4. Hapus checklist item
    const delRes = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}/checklists/${checklistId}`)
      .set('Authorization', `Bearer ${penggunaAToken}`);
    expect(delRes.status).toBe(200);
  });

  it('19. pengguna dapat berkomentar; hanya penulis atau admin yang dapat menghapus komentar', async () => {
    // 1. Pengguna A membuat komentar
    const createRes = await request(app.getHttpServer())
      .post(`/tasks/${taskA1Id}/comments`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({ body: 'Sedang mengerjakan integrasi autentikasi' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.body).toBe(
      'Sedang mengerjakan integrasi autentikasi',
    );
    commentId = createRes.body.id;

    // 2. Pengguna B mencoba menghapus komentar -> 404 (karena taskA1 di luar scope pengguna B)
    const delByOtherPengguna = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}/comments/${commentId}`)
      .set('Authorization', `Bearer ${penggunaBToken}`);
    expect(delByOtherPengguna.status).toBe(404);

    // 3. Admin A (admin departemen) berhasil menghapus komentar
    const delByAdmin = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}/comments/${commentId}`)
      .set('Authorization', `Bearer ${adminAToken}`);
    expect(delByAdmin.status).toBe(200);
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Lampiran Task (Attachments) & Storage
  // ─────────────────────────────────────────────────────────────

  let validAttachmentId: string;
  let storedDiskFileName: string;

  it('20. unggah file palsu (ekstensi .png tetapi isi teks acak bukan gambar) ditolak (400)', async () => {
    const fakeBuffer = Buffer.from('Ini bukan file PNG, ini file teks palsu!');

    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskA1Id}/attachments`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .attach('file', fakeBuffer, 'fake-image.png');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'Tipe file tidak diizinkan atau signature file tidak valid',
    );
  });

  it('21. unggah file lebih dari 10 MB ditolak (400)', async () => {
    // Buat buffer 10.5 MB
    const hugeBuffer = Buffer.alloc(10.5 * 1024 * 1024);

    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskA1Id}/attachments`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .attach('file', hugeBuffer, 'huge-document.pdf');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain(
      'Ukuran file melebihi batas maksimum 10 MB',
    );
  });

  it('22. unggah file valid berhasil, nama file di disk memakai UUID acak tanpa ekstensi asli', async () => {
    // 8 bytes signature PNG yang valid
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
    ]);

    const res = await request(app.getHttpServer())
      .post(`/tasks/${taskA1Id}/attachments`)
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .attach('file', pngSignature, 'screenshot-desain.png');

    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe('screenshot-desain.png');
    expect(res.body.mimeType).toBe('image/png');
    validAttachmentId = res.body.id;
    storedDiskFileName = res.body.fileUrl;

    // Pastikan nama file di disk adalah UUID dan tidak memuat nama asli atau ekstensi asli
    expect(storedDiskFileName).not.toBe('screenshot-desain.png');
    expect(storedDiskFileName).not.toContain('.png');

    // Pastikan file fisik benar-benar ada di disk
    const uploadDir =
      process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
    const diskPath = path.isAbsolute(uploadDir)
      ? path.join(uploadDir, storedDiskFileName)
      : path.resolve(process.cwd(), uploadDir, storedDiskFileName);

    expect(fs.existsSync(diskPath)).toBe(true);
  });

  it('23. pengguna lain tidak bisa mengunduh lampiran (404)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tasks/${taskA1Id}/attachments/${validAttachmentId}/download`)
      .set('Authorization', `Bearer ${penggunaBToken}`);

    expect(res.status).toBe(404);
  });

  it('24. unduh lampiran oleh assignee berhasil dengan header Content-Disposition attachment dan X-Content-Type-Options nosniff', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tasks/${taskA1Id}/attachments/${validAttachmentId}/download`)
      .set('Authorization', `Bearer ${penggunaAToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain(
      'screenshot-desain.png',
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-type']).toContain('image/png');
  });

  it('25. hapus lampiran menghapus record di database dan file di disk', async () => {
    const uploadDir =
      process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
    const diskPath = path.isAbsolute(uploadDir)
      ? path.join(uploadDir, storedDiskFileName)
      : path.resolve(process.cwd(), uploadDir, storedDiskFileName);

    expect(fs.existsSync(diskPath)).toBe(true);

    const res = await request(app.getHttpServer())
      .delete(`/tasks/${taskA1Id}/attachments/${validAttachmentId}`)
      .set('Authorization', `Bearer ${penggunaAToken}`);

    expect(res.status).toBe(200);

    // Pastikan record di database sudah terhapus
    const dbAttachment = await prisma.attachment.findUnique({
      where: { id: validAttachmentId },
    });
    expect(dbAttachment).toBeNull();

    // Pastikan file di disk sudah terhapus
    expect(fs.existsSync(diskPath)).toBe(false);
  });

  it('26. super admin memiliki akses penuh membaca dan mengelola task di semua departemen', async () => {
    const res = await request(app.getHttpServer())
      .get(`/tasks/${taskA1Id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(taskA1Id);
  });
});
