import * as dotenv from 'dotenv';
dotenv.config();

const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'mysql://root@127.0.0.1:3306/budgetflow_test';
process.env.DATABASE_URL = testDbUrl;

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, ProjectStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ProjectsService } from '../src/projects/projects.service';

describe('Projects Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let projectsService: ProjectsService;

  const TEST_PASSWORD = 'PasswordProjectsE2E123!';
  const PREFIX = 'e2e-proj-';

  let deptAId: string;
  let deptBId: string;
  let ccDeptAId: string;
  let ccDeptBId: string;
  let projectTypeId: string;

  let penggunaAUser: any;
  let penggunaBUser: any;
  let nonActiveUser: any;
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

  const cleanTestData = async () => {
    const currentDbUrl = process.env.DATABASE_URL || '';
    if (!currentDbUrl.includes('budgetflow_test')) {
      throw new Error(
        `Operasi pembersihan dibatalkan: DATABASE_URL bukan 'budgetflow_test'! (got: ${currentDbUrl})`,
      );
    }
    const dbNameResult: any = await prisma.$queryRawUnsafe(
      'SELECT DATABASE() AS db',
    );
    const currentDbName = dbNameResult[0]?.db;
    if (currentDbName !== 'budgetflow_test') {
      throw new Error(
        `Operasi pembersihan dibatalkan: Database aktif adalah '${currentDbName}', bukan 'budgetflow_test'!`,
      );
    }

    // 1. Hapus transaksi & relasi proyek uji
    await prisma.task.deleteMany({
      where: { project: { name: { startsWith: 'E2E-PROJ-' } } },
    });
    await prisma.milestone.deleteMany({
      where: { project: { name: { startsWith: 'E2E-PROJ-' } } },
    });
    await prisma.phase.deleteMany({
      where: { project: { name: { startsWith: 'E2E-PROJ-' } } },
    });
    await prisma.projectMember.deleteMany({
      where: {
        OR: [
          { project: { name: { startsWith: 'E2E-PROJ-' } } },
          { user: { email: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.project.deleteMany({
      where: { name: { startsWith: 'E2E-PROJ-' } },
    });

    // 2. Hapus master data uji
    await prisma.costCenter.deleteMany({
      where: { code: { startsWith: 'E2E-CC-PROJ-' } },
    });
    await prisma.projectType.deleteMany({
      where: { name: { startsWith: 'E2E-PT-PROJ-' } },
    });
    await prisma.department.deleteMany({
      where: { name: { startsWith: 'E2E-DEPT-PROJ-' } },
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

    // Buat 2 departemen untuk pengujian isolasi scope
    const deptA = await prisma.department.create({
      data: {
        name: 'E2E-DEPT-PROJ-A',
        annualBudget: 500000000,
        isActive: true,
      },
    });
    deptAId = deptA.id;

    const deptB = await prisma.department.create({
      data: {
        name: 'E2E-DEPT-PROJ-B',
        annualBudget: 300000000,
        isActive: true,
      },
    });
    deptBId = deptB.id;

    // Buat cost center untuk masing-masing departemen
    const ccA = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-PROJ-A1',
        name: 'CC Dept A',
        departmentId: deptAId,
        isActive: true,
      },
    });
    ccDeptAId = ccA.id;

    const ccB = await prisma.costCenter.create({
      data: {
        code: 'E2E-CC-PROJ-B1',
        name: 'CC Dept B',
        departmentId: deptBId,
        isActive: true,
      },
    });
    ccDeptBId = ccB.id;

    // Buat Project Type
    const pt = await prisma.projectType.create({
      data: {
        name: 'E2E-PT-PROJ-DEV',
        isActive: true,
      },
    });
    projectTypeId = pt.id;

    // Buat pengguna untuk 4 peran
    const passwordHash = await argon2.hash(TEST_PASSWORD);

    penggunaAUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna Dept A',
        email: `${PREFIX}pengguna-a@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: true,
      },
    });

    penggunaBUser = await prisma.user.create({
      data: {
        name: 'E2E Pengguna Dept B',
        email: `${PREFIX}pengguna-b@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptBId,
        isActive: true,
      },
    });

    nonActiveUser = await prisma.user.create({
      data: {
        name: 'E2E Non Active User',
        email: `${PREFIX}non-active@damaco.test`,
        passwordHash,
        role: Role.pengguna,
        departmentId: deptAId,
        isActive: false,
      },
    });

    adminAUser = await prisma.user.create({
      data: {
        name: 'E2E Admin Dept A',
        email: `${PREFIX}admin-a@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptAId,
        isActive: true,
      },
    });

    adminBUser = await prisma.user.create({
      data: {
        name: 'E2E Admin Dept B',
        email: `${PREFIX}admin-b@damaco.test`,
        passwordHash,
        role: Role.admin,
        departmentId: deptBId,
        isActive: true,
      },
    });

    financeUser = await prisma.user.create({
      data: {
        name: 'E2E Finance User',
        email: `${PREFIX}finance@damaco.test`,
        passwordHash,
        role: Role.finance,
        departmentId: deptBId,
        isActive: true,
      },
    });

    superAdminUser = await prisma.user.create({
      data: {
        name: 'E2E Super Admin',
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
    projectsService = moduleFixture.get<ProjectsService>(ProjectsService);

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
  });

  afterAll(async () => {
    await cleanTestData();
    if (app) {
      await app.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  // -------------------------------------------------------------
  // Test Case 1: Hak akses dan pembuatan proyek
  // -------------------------------------------------------------
  let projectAId: string;
  let projectBId: string;

  it('1. pengguna tidak bisa membuat proyek (403)', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${penggunaAToken}`)
      .send({
        name: 'E2E-PROJ-Pengguna-Try',
        costCenterId: ccDeptAId,
      });

    expect(res.status).toBe(403);
  });

  it('2. finance bisa membaca tetapi tidak menulis (403 saat membuat proyek)', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        name: 'E2E-PROJ-Finance-Try',
        costCenterId: ccDeptAId,
      });

    expect(res.status).toBe(403);
  });

  it('3. cost center beda departemen ditolak (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'E2E-PROJ-Wrong-CC',
        costCenterId: ccDeptBId, // Cost center milik Dept B
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Cost center tidak aktif atau tidak sesuai');
  });

  it('4. admin tidak bisa membuat proyek di departemen lain (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'E2E-PROJ-Other-Dept',
        departmentId: deptBId, // Coba menyusup ke Dept B
        costCenterId: ccDeptAId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Admin hanya dapat membuat proyek di departemennya sendiri');
  });

  it('5. admin berhasil membuat proyek di departemennya (status diajukan)', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'E2E-PROJ-Dept-A-Main',
        description: 'Proyek utama Dept A',
        costCenterId: ccDeptAId,
        projectTypeId,
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe(ProjectStatus.diajukan);
    expect(res.body.departmentId).toBe(deptAId);
    expect(res.body.costCenterId).toBe(ccDeptAId);
    projectAId = res.body.id;
  });

  it('6. admin Dept B membuat proyek di departemen B', async () => {
    const res = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminBToken}`)
      .send({
        name: 'E2E-PROJ-Dept-B-Main',
        description: 'Proyek utama Dept B',
        costCenterId: ccDeptBId,
        startDate: '2026-02-01',
        endDate: '2026-08-31',
      });

    expect(res.status).toBe(201);
    projectBId = res.body.id;
  });

  // -------------------------------------------------------------
  // Test Case 2: Scope pembacaan dan modifikasi antar departemen
  // -------------------------------------------------------------
  it('7. admin departemen A tidak bisa membaca, mengubah, atau menghapus proyek departemen B (404)', async () => {
    // Membaca proyek B -> 404
    const getRes = await request(app.getHttpServer())
      .get(`/projects/${projectBId}`)
      .set('Authorization', `Bearer ${adminAToken}`);
    expect(getRes.status).toBe(404);

    // Mengubah proyek B -> 404
    const patchRes = await request(app.getHttpServer())
      .patch(`/projects/${projectBId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Hacked Name' });
    expect(patchRes.status).toBe(404);

    // Menutup proyek B -> 404
    const closeRes = await request(app.getHttpServer())
      .post(`/projects/${projectBId}/close`)
      .set('Authorization', `Bearer ${adminAToken}`);
    expect(closeRes.status).toBe(404);

    // Menghapus proyek B -> 404
    const delRes = await request(app.getHttpServer())
      .delete(`/projects/${projectBId}`)
      .set('Authorization', `Bearer ${adminAToken}`);
    expect(delRes.status).toBe(404);
  });

  it('8. pengguna non-anggota mendapat 404 pada proyek', async () => {
    const res = await request(app.getHttpServer())
      .get(`/projects/${projectAId}`)
      .set('Authorization', `Bearer ${penggunaAToken}`);

    expect(res.status).toBe(404);
  });

  it('9. finance bisa membaca proyek departemen A dan departemen B', async () => {
    const resA = await request(app.getHttpServer())
      .get(`/projects/${projectAId}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(resA.status).toBe(200);
    expect(resA.body.id).toBe(projectAId);

    const resB = await request(app.getHttpServer())
      .get(`/projects/${projectBId}`)
      .set('Authorization', `Bearer ${financeToken}`);
    expect(resB.status).toBe(200);
    expect(resB.body.id).toBe(projectBId);
  });

  it('10. status tidak bisa diubah ke berjalan lewat API (400)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/projects/${projectAId}`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ status: 'berjalan' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Status proyek tidak dapat diubah melalui endpoint ini');

    // Pastikan status di database tetap 'diajukan'
    const check = await prisma.project.findUnique({ where: { id: projectAId } });
    expect(check?.status).toBe(ProjectStatus.diajukan);
  });

  // -------------------------------------------------------------
  // Test Case 3: Anggota proyek
  // -------------------------------------------------------------
  it('11. anggota dari departemen lain ditolak untuk admin tetapi diterima untuk super_admin', async () => {
    // Admin A mencoba menambah Pengguna B (Dept B) ke Proyek A (Dept A) -> 400
    const adminTryRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/members`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ userId: penggunaBUser.id });

    expect(adminTryRes.status).toBe(400);
    expect(adminTryRes.body.message).toContain('Admin hanya dapat menambahkan anggota dari departemen yang sama');

    // Super Admin mencoba menambah Pengguna B ke Proyek A -> 201 (diizinkan lintas departemen)
    const saRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/members`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ userId: penggunaBUser.id });

    expect(saRes.status).toBe(201);
  });

  it('12. pengguna nonaktif atau berperan finance tidak bisa jadi anggota (400)', async () => {
    // Coba tambah user nonaktif
    const nonActiveRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/members`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ userId: nonActiveUser.id });

    expect(nonActiveRes.status).toBe(400);
    expect(nonActiveRes.body.message).toContain('Pengguna tidak aktif');

    // Coba tambah user berperan finance
    const financeRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/members`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ userId: financeUser.id });

    expect(financeRes.status).toBe(400);
    expect(financeRes.body.message).toContain('Hanya pengguna dengan peran pengguna atau admin');
  });

  it('13. admin menambahkan pengguna A sebagai anggota proyek A', async () => {
    const res = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/members`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ userId: penggunaAUser.id });

    expect(res.status).toBe(201);
  });

  it('14. pengguna A sekarang bisa membaca proyek A, dan field keuangan tidak bocor', async () => {
    const res = await request(app.getHttpServer())
      .get(`/projects/${projectAId}`)
      .set('Authorization', `Bearer ${penggunaAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(projectAId);
    // Verifikasi data keuangan tidak bocor
    expect(res.body.department.annualBudget).toBeUndefined();
    expect(res.body.budgets).toBeUndefined();
    expect(res.body.expenses).toBeUndefined();
  });

  it('15. mengeluarkan anggota yang masih punya task ditolak (400)', async () => {
    // Buat task yang di-assign ke pengguna A dalam proyek A
    const task = await prisma.task.create({
      data: {
        projectId: projectAId,
        title: 'Task Pengujian Anggota',
        assigneeId: penggunaAUser.id,
      },
    });

    const removeRes = await request(app.getHttpServer())
      .delete(`/projects/${projectAId}/members/${penggunaAUser.id}`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(removeRes.status).toBe(400);
    expect(removeRes.body.message).toContain('masih memiliki tugas (task) yang ditugaskan');

    // Hapus task uji agar penggunaA bisa dites pada kondisi berikutnya jika perlu
    await prisma.task.delete({ where: { id: task.id } });
  });

  // -------------------------------------------------------------
  // Test Case 4: Fase & Milestone
  // -------------------------------------------------------------
  let phaseAId: string;
  let milestoneAId: string;

  it('16. validasi tanggal fase terhadap tanggal rentang proyek', async () => {
    // Proyek A rentangnya: 2026-01-01 s.d. 2026-06-30
    // Coba buat fase dengan tanggal selesai melebihi proyek
    const invalidRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/phases`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Fase Invalid',
        startDate: '2026-01-01',
        endDate: '2026-07-15', // Lewat dari 2026-06-30
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.message).toContain('tidak boleh setelah tanggal selesai proyek');

    // Buat fase yang valid
    const validRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/phases`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Fase 1: Desain',
        sortOrder: 1,
        startDate: '2026-01-10',
        endDate: '2026-02-28',
      });

    expect(validRes.status).toBe(201);
    phaseAId = validRes.body.id;
  });

  it('17. membuat milestone yang terikat pada fase', async () => {
    const res = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/milestones`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'Milestone Desain Selesai',
        dueDate: '2026-02-20',
        phaseId: phaseAId,
      });

    expect(res.status).toBe(201);
    milestoneAId = res.body.id;
  });

  it('18. hapus fase ditolak jika masih punya task atau item anggaran (400)', async () => {
    // Buat task di fase ini
    const task = await prisma.task.create({
      data: {
        projectId: projectAId,
        phaseId: phaseAId,
        title: 'Task dalam Fase 1',
      },
    });

    const res = await request(app.getHttpServer())
      .delete(`/projects/${projectAId}/phases/${phaseAId}`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Fase tidak dapat dihapus karena masih memiliki tugas atau item anggaran');

    // Bersihkan task
    await prisma.task.delete({ where: { id: task.id } });
  });

  // -------------------------------------------------------------
  // Test Case 5: Penutupan proyek dan penolakan perubahan pada proyek tertutup
  // -------------------------------------------------------------
  it('19. proyek ditutup menolak perubahan fase, milestone, dan anggota', async () => {
    // 1. Transisi proyek A ke 'berjalan' via internal method
    await projectsService.transitionToRunning(projectAId);

    // 2. Tutup proyek A via endpoint close
    const closeRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/close`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.status).toBe(ProjectStatus.ditutup);

    // 3. Coba tambah fase pada proyek tertutup -> 400
    const phaseRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/phases`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Fase Baru' });
    expect(phaseRes.status).toBe(400);
    expect(phaseRes.body.message).toContain('Proyek yang sudah ditutup tidak dapat diubah fasenya');

    // 4. Coba tambah milestone pada proyek tertutup -> 400
    const msRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/milestones`)
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({ name: 'Milestone Baru', dueDate: '2026-03-01' });
    expect(msRes.status).toBe(400);
    expect(msRes.body.message).toContain('Proyek yang sudah ditutup tidak dapat diubah milestonenya');

    // 5. Coba tambah anggota pada proyek tertutup -> 400
    const memberRes = await request(app.getHttpServer())
      .post(`/projects/${projectAId}/members`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ userId: adminBUser.id });
    expect(memberRes.status).toBe(400);
    expect(memberRes.body.message).toContain('Proyek yang sudah ditutup tidak dapat diubah anggotanya');
  });

  // -------------------------------------------------------------
  // Test Case 6: Soft Delete
  // -------------------------------------------------------------
  it('20. soft delete menyembunyikan proyek dan mencatat log aktivitas', async () => {
    // Buat proyek C khusus untuk pengujian soft-delete
    const createRes = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${adminAToken}`)
      .send({
        name: 'E2E-PROJ-Dept-A-Delete',
        costCenterId: ccDeptAId,
      });

    expect(createRes.status).toBe(201);
    const projectCId = createRes.body.id;

    // Hapus proyek C
    const delRes = await request(app.getHttpServer())
      .delete(`/projects/${projectCId}`)
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(delRes.status).toBe(200);

    // Proyek terhapus tidak bisa diakses lewat detail (404)
    const getRes = await request(app.getHttpServer())
      .get(`/projects/${projectCId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(getRes.status).toBe(404);

    // Proyek terhapus tidak muncul di daftar (GET /projects)
    const listRes = await request(app.getHttpServer())
      .get('/projects')
      .set('Authorization', `Bearer ${superAdminToken}`);

    const found = listRes.body.data.some((p: any) => p.id === projectCId);
    expect(found).toBe(false);

    // Periksa pencatatan activity_logs
    const deleteLog = await prisma.activityLog.findFirst({
      where: {
        action: 'delete_project',
        module: 'projects',
        entityId: projectCId,
      },
    });

    expect(deleteLog).toBeDefined();
    expect(deleteLog?.userId).toBe(adminAUser.id);
  });
});
