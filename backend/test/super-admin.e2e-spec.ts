import * as dotenv from 'dotenv';
dotenv.config();

const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'mysql://root@127.0.0.1:3306/budgetflow_test';
process.env.DATABASE_URL = testDbUrl;

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Super Admin Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;

  const TEST_PASSWORD = 'PasswordSuperAdmin123!';
  let itDepartmentId: string;
  let financeDepartmentId: string;

  // Akun pengujian
  let penggunaToken: string;
  let adminToken: string;
  let financeToken: string;
  let superAdminToken: string;
  let superAdminUser: any;
  let secondarySuperAdminToken: string;
  let secondarySuperAdminUser: any;

  // Prefix unik untuk data uji agar pembersihan terisolasi sempurna
  const TEST_EMAIL_PREFIX = 'e2e-sa-';
  const testUserEmails = {
    pengguna: `${TEST_EMAIL_PREFIX}pengguna@perusahaan.com`,
    admin: `${TEST_EMAIL_PREFIX}admin@perusahaan.com`,
    finance: `${TEST_EMAIL_PREFIX}finance@perusahaan.com`,
    superAdmin: `${TEST_EMAIL_PREFIX}superadmin@perusahaan.com`,
    secondarySuperAdmin: `${TEST_EMAIL_PREFIX}superadmin2@perusahaan.com`,
    targetUser: `${TEST_EMAIL_PREFIX}target@perusahaan.com`,
  };

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

    // 1. Hapus entitas master data & proyek pengujian
    await prisma.projectMember.deleteMany({
      where: { user: { email: { startsWith: TEST_EMAIL_PREFIX } } },
    });
    await prisma.project.deleteMany({
      where: { name: { startsWith: 'E2E-SA-' } },
    });
    await prisma.costCenter.deleteMany({
      where: { code: { startsWith: 'E2E-CC-' } },
    });
    await prisma.department.deleteMany({
      where: { name: { startsWith: 'E2E-DEPT-' } },
    });
    await prisma.expenseCategory.deleteMany({
      where: { code: { startsWith: 'E2E-CAT-' } },
    });
    await prisma.projectType.deleteMany({
      where: { name: { startsWith: 'E2E-PT-' } },
    });

    // 2. Hapus token dan reset password user pengujian
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { startsWith: TEST_EMAIL_PREFIX } } },
    });
    await prisma.passwordReset.deleteMany({
      where: { user: { email: { startsWith: TEST_EMAIL_PREFIX } } },
    });

    // 3. Reset activity_logs tanpa memicu trigger DELETE
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE `activity_logs`');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

    // 4. Hapus pengguna pengujian
    await prisma.user.deleteMany({
      where: { email: { startsWith: TEST_EMAIL_PREFIX } },
    });
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });
    await prisma.$connect();

    const itDept = await prisma.department.findUniqueOrThrow({
      where: { name: 'IT' },
    });
    const finDept = await prisma.department.findUniqueOrThrow({
      where: { name: 'Finance' },
    });
    itDepartmentId = itDept.id;
    financeDepartmentId = finDept.id;

    await cleanTestData();

    // Buat akun-akun untuk pengujian peran
    const passwordHash = await argon2.hash(TEST_PASSWORD);

    const createdPengguna = await prisma.user.create({
      data: {
        name: 'E2E SA Pengguna',
        email: testUserEmails.pengguna,
        passwordHash,
        role: Role.pengguna,
        departmentId: itDepartmentId,
        isActive: true,
      },
    });

    const createdAdmin = await prisma.user.create({
      data: {
        name: 'E2E SA Admin',
        email: testUserEmails.admin,
        passwordHash,
        role: Role.admin,
        departmentId: itDepartmentId,
        isActive: true,
      },
    });

    const createdFinance = await prisma.user.create({
      data: {
        name: 'E2E SA Finance',
        email: testUserEmails.finance,
        passwordHash,
        role: Role.finance,
        departmentId: financeDepartmentId,
        isActive: true,
      },
    });

    superAdminUser = await prisma.user.create({
      data: {
        name: 'E2E SA Super Admin',
        email: testUserEmails.superAdmin,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });

    secondarySuperAdminUser = await prisma.user.create({
      data: {
        name: 'E2E SA Super Admin 2',
        email: testUserEmails.secondarySuperAdmin,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Terbitkan JWT access token untuk masing-masing peran
    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    penggunaToken = await jwtService.signAsync(
      {
        sub: createdPengguna.id,
        email: createdPengguna.email,
        role: Role.pengguna,
        departmentId: createdPengguna.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    adminToken = await jwtService.signAsync(
      {
        sub: createdAdmin.id,
        email: createdAdmin.email,
        role: Role.admin,
        departmentId: createdAdmin.departmentId,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );

    financeToken = await jwtService.signAsync(
      {
        sub: createdFinance.id,
        email: createdFinance.email,
        role: Role.finance,
        departmentId: createdFinance.departmentId,
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

    secondarySuperAdminToken = await jwtService.signAsync(
      {
        sub: secondarySuperAdminUser.id,
        email: secondarySuperAdminUser.email,
        role: Role.super_admin,
        departmentId: null,
      },
      { secret: jwtSecret, expiresIn: '15m' },
    );
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (prisma) {
      await cleanTestData();
      await prisma.$disconnect();
    }
  }, 30000);

  // ─────────────────────────────────────────────────────────────
  // 1. Guard Otentikasi & Otorisasi Khusus Super Admin
  // ─────────────────────────────────────────────────────────────
  describe('1. Hak Akses Super Admin (401 & 403 Guards)', () => {
    const endpoints = [
      { method: 'get', url: '/users' },
      { method: 'get', url: '/departments' },
      { method: 'get', url: '/cost-centers' },
      { method: 'get', url: '/expense-categories' },
      { method: 'get', url: '/project-types' },
      { method: 'get', url: '/activity-logs' },
    ];

    it.each(endpoints)(
      'Permintaan tanpa token ke $url harus ditolak 401 Unauthorized',
      async ({ method, url }) => {
        await (request(app.getHttpServer()) as any)[method](url).expect(401);
      },
    );

    it.each(endpoints)(
      'Pengguna biasa (role: pengguna) mengakses $url harus ditolak 403 Forbidden',
      async ({ method, url }) => {
        await (request(app.getHttpServer()) as any)[method](url)
          .set('Authorization', `Bearer ${penggunaToken}`)
          .expect(403);
      },
    );

    it.each(endpoints)(
      'Admin departemen (role: admin) mengakses $url harus ditolak 403 Forbidden',
      async ({ method, url }) => {
        await (request(app.getHttpServer()) as any)[method](url)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(403);
      },
    );

    it.each(endpoints)(
      'Finance (role: finance) mengakses $url harus ditolak 403 Forbidden',
      async ({ method, url }) => {
        await (request(app.getHttpServer()) as any)[method](url)
          .set('Authorization', `Bearer ${financeToken}`)
          .expect(403);
      },
    );

    it('Super Admin berhasil mengakses endpoint ini (200 OK)', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. CRUD Pengguna & Aturan Keamanan Akun
  // ─────────────────────────────────────────────────────────────
  describe('2. CRUD Pengguna & Aturan Keamanan', () => {
    let createdUserId: string;

    it('Gagal membuat pengguna pengguna/admin tanpa departmentId (400)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Pengguna Tanpa Dept',
          email: `${TEST_EMAIL_PREFIX}no-dept@perusahaan.com`,
          role: 'pengguna',
        })
        .expect(400);

      expect(response.body.message).toMatch(/Departemen wajib diisi/);
    });

    it('Berhasil membuat pengguna baru dengan kata sandi acak (passwordHash tidak boleh ada di respons)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Budi Santoso',
          email: testUserEmails.targetUser,
          role: 'pengguna',
          departmentId: itDepartmentId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Budi Santoso');
      expect(response.body).toHaveProperty('email', testUserEmails.targetUser);
      expect(response.body).toHaveProperty('role', 'pengguna');
      expect(response.body).toHaveProperty('initialPassword'); // Dikembalikan hanya sekali saat pembuatan acak
      expect(response.body).not.toHaveProperty('passwordHash'); // TIDAK PERNAH dikembalikan
      expect(response.body).not.toHaveProperty('password_hash');

      createdUserId = response.body.id;
    });

    it('Gagal membuat pengguna dengan email duplikat (409 Conflict)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Duplikat Email',
          email: testUserEmails.targetUser.toUpperCase(), // Uji normalisasi huruf kecil
          role: 'pengguna',
          departmentId: itDepartmentId,
        })
        .expect(409);

      expect(response.body.message).toMatch(/Email sudah digunakan/);
    });

    it('Detail pengguna tidak pernah menyertakan passwordHash (200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdUserId);
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('initialPassword');
    });

    it('Daftar pengguna (paginasi dan pencarian) tidak memuat passwordHash', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users?search=Budi&limit=5`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      for (const user of response.body.data) {
        expect(user).not.toHaveProperty('passwordHash');
        expect(user).not.toHaveProperty('password');
      }
    });

    it('Super admin tidak boleh menurunkan peran dirinya sendiri (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${superAdminUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          role: 'admin',
          departmentId: itDepartmentId,
        })
        .expect(400);

      expect(response.body.message).toMatch(
        /Super admin tidak dapat menurunkan peran dirinya sendiri/,
      );
    });

    it('Super admin tidak boleh menonaktifkan dirinya sendiri (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/users/${superAdminUser.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          isActive: false,
        })
        .expect(400);

      expect(response.body.message).toMatch(
        /Super admin tidak dapat menonaktifkan akun dirinya sendiri/,
      );
    });

    it('Super admin tidak boleh menghapus dirinya sendiri (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${superAdminUser.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);

      expect(response.body.message).toMatch(
        /Super admin tidak dapat menghapus akun dirinya sendiri/,
      );
    });

    it('Mengubah peran atau menonaktifkan akun mencabut refresh token pengguna', async () => {
      // Buat dummy refresh token untuk target user
      await prisma.refreshToken.create({
        data: {
          userId: createdUserId,
          tokenHash: 'dummy-token-hash-12345',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const tokenBefore = await prisma.refreshToken.count({
        where: { userId: createdUserId },
      });
      expect(tokenBefore).toBe(1);

      // Ubah status menjadi nonaktif
      await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: false })
        .expect(200);

      const tokenAfter = await prisma.refreshToken.count({
        where: { userId: createdUserId },
      });
      expect(tokenAfter).toBe(0); // Refresh token telah dicabut

      // Aktifkan kembali untuk uji selanjutnya
      await request(app.getHttpServer())
        .patch(`/users/${createdUserId}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isActive: true })
        .expect(200);
    });

    it('Akun yang di-soft-delete tidak dapat login (403 Forbidden)', async () => {
      // Berikan kata sandi yang diketahui
      const knownPassword = 'PasswordBaru123!';
      await request(app.getHttpServer())
        .patch(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ password: knownPassword })
        .expect(200);

      // Pastikan sebelum soft-delete bisa login
      await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'mobile')
        .send({
          email: testUserEmails.targetUser,
          password: knownPassword,
        })
        .expect(200);

      // Soft delete pengguna
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Coba login setelah soft-delete: harus ditolak 403
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'mobile')
        .send({
          email: testUserEmails.targetUser,
          password: knownPassword,
        })
        .expect(403);

      expect(loginRes.body.message).toMatch(
        /Akun tidak aktif, hubungi administrator/,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Reset Password Pengguna
  // ─────────────────────────────────────────────────────────────
  describe('3. Reset Password & Keamanan Token', () => {
    let testSubjectUser: any;

    beforeAll(async () => {
      testSubjectUser = await prisma.user.create({
        data: {
          name: 'Reset Target User',
          email: `${TEST_EMAIL_PREFIX}reset-target@perusahaan.com`,
          passwordHash: await argon2.hash('OldPassword123!'),
          role: Role.pengguna,
          departmentId: itDepartmentId,
          isActive: true,
        },
      });
    });

    it('Mereset kata sandi menghasilkan record password_resets, mencabut refresh token, dan respons tidak memuat password_hash atau token', async () => {
      // Simpan refresh token dummy
      await prisma.refreshToken.create({
        data: {
          userId: testSubjectUser.id,
          tokenHash: 'dummy-refresh-for-reset-test',
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/users/${testSubjectUser.id}/reset-password`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      // Respons tidak boleh memuat passwordHash, password, token, tokenHash, atau resetToken
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId', testSubjectUser.id);
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('rawToken');
      expect(response.body).not.toHaveProperty('tokenHash');
      expect(response.body).not.toHaveProperty('resetToken');
      expect(response.body).not.toHaveProperty('passwordHash');

      // Refresh token harus telah dicabut
      const tokensCount = await prisma.refreshToken.count({
        where: { userId: testSubjectUser.id },
      });
      expect(tokensCount).toBe(0);

      // Record password_resets harus ada
      const resetRecord = await prisma.passwordReset.findFirst({
        where: { userId: testSubjectUser.id },
      });
      expect(resetRecord).not.toBeNull();
      expect(resetRecord?.tokenHash).toBeDefined();

      // Log aktivitas harus tercatat dan tidak memuat token
      const log = await prisma.activityLog.findFirst({
        where: {
          action: 'RESET_PASSWORD',
          entityId: testSubjectUser.id,
        },
      });
      expect(log).not.toBeNull();
      const afterDataStr = JSON.stringify(log?.afterData || {});
      expect(afterDataStr).not.toMatch(/token/i);
      expect(afterDataStr).not.toMatch(/password/i);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. CRUD Departemen & Cost Center
  // ─────────────────────────────────────────────────────────────
  describe('4. CRUD Departemen & Cost Center', () => {
    let deptId: string;
    let ccId: string;

    it('Berhasil membuat departemen baru', async () => {
      const res = await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E-DEPT-Operasional',
          annualBudget: 250000000,
        })
        .expect(201);

      deptId = res.body.id;
      expect(res.body.name).toBe('E2E-DEPT-Operasional');
    });

    it('Departemen duplikat ditolak 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E-DEPT-Operasional',
        })
        .expect(409);
    });

    it('Berhasil membuat cost center pada departemen tersebut', async () => {
      const res = await request(app.getHttpServer())
        .post('/cost-centers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'E2E-CC-OPS-01',
          name: 'Cost Center Operasional Cabang',
          departmentId: deptId,
        })
        .expect(201);

      ccId = res.body.id;
      expect(res.body.code).toBe('E2E-CC-OPS-01');
    });

    it('Cost center duplikat kode ditolak 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/cost-centers')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'E2E-CC-OPS-01',
          name: 'Duplikat CC',
          departmentId: deptId,
        })
        .expect(409);
    });

    it('Departemen atau cost center yang digunakan proyek/user tidak boleh dihapus (400 Bad Request)', async () => {
      // Hubungkan cost center dan departemen ini ke proyek pengujian
      const testProject = await prisma.project.create({
        data: {
          name: 'E2E-SA-Project-Protect',
          departmentId: deptId,
          costCenterId: ccId,
          createdById: superAdminUser.id,
        },
      });

      // Percobaan hapus cost center yang dipakai proyek harus gagal 400
      const ccDelRes = await request(app.getHttpServer())
        .delete(`/cost-centers/${ccId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);
      expect(ccDelRes.body.message).toMatch(
        /Cost center yang sudah digunakan .* tidak boleh dihapus/,
      );

      // Percobaan hapus departemen yang dipakai proyek harus gagal 400
      const deptDelRes = await request(app.getHttpServer())
        .delete(`/departments/${deptId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);
      expect(deptDelRes.body.message).toMatch(
        /Departemen yang sudah digunakan .* tidak boleh dihapus/,
      );

      // Bersihkan proyek pengujian
      await prisma.project.delete({ where: { id: testProject.id } });

      // Sekarang setelah tidak terikat proyek, penghapusan berhasil
      await request(app.getHttpServer())
        .delete(`/cost-centers/${ccId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/departments/${deptId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. CRUD Master Data: Expense Categories & Project Types
  // ─────────────────────────────────────────────────────────────
  describe('5. Master Data (Kategori & Jenis Proyek)', () => {
    let categoryId: string;
    let projectTypeId: string;

    it('Berhasil membuat kategori pengeluaran dan jenis proyek', async () => {
      const catRes = await request(app.getHttpServer())
        .post('/expense-categories')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E-CAT-Konsumsi',
          code: 'E2E-CAT-FNB',
          color: '#F59E0B',
        })
        .expect(201);
      categoryId = catRes.body.id;

      const ptRes = await request(app.getHttpServer())
        .post('/project-types')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'E2E-PT-Infrastruktur Jaringan',
        })
        .expect(201);
      projectTypeId = ptRes.body.id;
    });

    it('Penghapusan master data menonaktifkan status (isActive = false), bukan menghapus baris fisik', async () => {
      await request(app.getHttpServer())
        .delete(`/expense-categories/${categoryId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const catInDb = await prisma.expenseCategory.findUnique({
        where: { id: categoryId },
      });
      expect(catInDb).not.toBeNull();
      expect(catInDb?.isActive).toBe(false);

      await request(app.getHttpServer())
        .delete(`/project-types/${projectTypeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const ptInDb = await prisma.projectType.findUnique({
        where: { id: projectTypeId },
      });
      expect(ptInDb).not.toBeNull();
      expect(ptInDb?.isActive).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Audit Logs Inspection (GET /activity-logs)
  // ─────────────────────────────────────────────────────────────
  describe('6. GET /activity-logs (Audit Trail)', () => {
    it('Super admin dapat melihat daftar log aktivitas dengan filter dan paginasi', async () => {
      const response = await request(app.getHttpServer())
        .get('/activity-logs?module=USER_MANAGEMENT&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      for (const log of response.body.data) {
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('module');
        // Pastikan beforeData dan afterData tidak memuat token atau passwordHash
        const logContent = JSON.stringify(log);
        expect(logContent).not.toMatch(/passwordHash/i);
        expect(logContent).not.toMatch(/initialPassword/i);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Endpoint /auth/test-super-admin di Produksi
  // ─────────────────────────────────────────────────────────────
  describe('7. /auth/test-super-admin Behaviour', () => {
    it('Mengembalikan 200 di lingkungan non-produksi untuk super admin', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      await request(app.getHttpServer())
        .get('/auth/test-super-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      process.env.NODE_ENV = prevEnv;
    });

    it('Mengembalikan 404 Not Found jika NODE_ENV adalah production', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const res = await request(app.getHttpServer())
        .get('/auth/test-super-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);

      expect(res.body.message).toMatch(/Endpoint tidak ditemukan/);

      process.env.NODE_ENV = prevEnv;
    });
  });
});
