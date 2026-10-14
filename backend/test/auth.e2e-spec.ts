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
import { ScopeService } from '../src/auth/services/scope.service';

describe('Auth Module & Guards Integration Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let jwtService: JwtService;
  let scopeService: ScopeService;

  const TEST_PASSWORD = 'PasswordKhususUji123!';
  let itDepartmentId: string;
  let financeDepartmentId: string;

  const testUsers = {
    pengguna: {
      id: '',
      email: 'e2e-pengguna@perusahaan.com',
      role: Role.pengguna,
    },
    admin: {
      id: '',
      email: 'e2e-admin@perusahaan.com',
      role: Role.admin,
    },
    finance: {
      id: '',
      email: 'e2e-finance@perusahaan.com',
      role: Role.finance,
    },
    superAdmin: {
      id: '',
      email: 'e2e-superadmin@perusahaan.com',
      role: Role.super_admin,
    },
    inactive: {
      id: '',
      email: 'e2e-inactive@perusahaan.com',
      role: Role.pengguna,
    },
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });
    await prisma.$connect();

    // Dapatkan ID departemen untuk asosiasi user uji
    const itDept = await prisma.department.findUniqueOrThrow({
      where: { name: 'IT' },
    });
    const finDept = await prisma.department.findUniqueOrThrow({
      where: { name: 'Finance' },
    });
    itDepartmentId = itDept.id;
    financeDepartmentId = finDept.id;

    // Helper pembersih data uji dengan pengaman database target
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

      const allEmails = [
        testUsers.pengguna.email,
        testUsers.admin.email,
        testUsers.finance.email,
        testUsers.superAdmin.email,
        testUsers.inactive.email,
        'e2e-ratelimit@perusahaan.com',
      ];

      await prisma.refreshToken.deleteMany({
        where: { user: { email: { in: allEmails } } },
      });

      // TRUNCATE TABLE activity_logs mereset tabel tanpa memicu trigger BEFORE DELETE
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
      await prisma.$executeRawUnsafe('TRUNCATE TABLE `activity_logs`');
      await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');

      await prisma.user.deleteMany({
        where: { email: { in: allEmails } },
      });
    };

    // Bersihkan data uji sebelumnya jika ada
    await cleanTestData();

    // Buat akun khusus untuk pengujian
    const passwordHash = await argon2.hash(TEST_PASSWORD);

    const createdPengguna = await prisma.user.create({
      data: {
        name: 'E2E Pengguna',
        email: testUsers.pengguna.email,
        passwordHash,
        role: Role.pengguna,
        departmentId: itDepartmentId,
        isActive: true,
      },
    });
    testUsers.pengguna.id = createdPengguna.id;

    const createdAdmin = await prisma.user.create({
      data: {
        name: 'E2E Admin',
        email: testUsers.admin.email,
        passwordHash,
        role: Role.admin,
        departmentId: itDepartmentId,
        isActive: true,
      },
    });
    testUsers.admin.id = createdAdmin.id;

    const createdFinance = await prisma.user.create({
      data: {
        name: 'E2E Finance',
        email: testUsers.finance.email,
        passwordHash,
        role: Role.finance,
        departmentId: financeDepartmentId,
        isActive: true,
      },
    });
    testUsers.finance.id = createdFinance.id;

    const createdSuperAdmin = await prisma.user.create({
      data: {
        name: 'E2E Super Admin',
        email: testUsers.superAdmin.email,
        passwordHash,
        role: Role.super_admin,
        departmentId: null,
        isActive: true,
      },
    });
    testUsers.superAdmin.id = createdSuperAdmin.id;

    const createdInactive = await prisma.user.create({
      data: {
        name: 'E2E Inactive User',
        email: testUsers.inactive.email,
        passwordHash,
        role: Role.pengguna,
        departmentId: itDepartmentId,
        isActive: false, // Tidak aktif
      },
    });
    testUsers.inactive.id = createdInactive.id;

    // Inisialisasi NestJS TestingModule
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    scopeService = moduleFixture.get<ScopeService>(ScopeService);
  }, 45000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (prisma) {
      const currentDbUrl = process.env.DATABASE_URL || '';
      if (!currentDbUrl.includes('budgetflow_test')) {
        throw new Error(
          `Operasi pembersihan dibatalkan: DATABASE_URL bukan 'budgetflow_test'! (got: ${currentDbUrl})`,
        );
      }
      const dbNameResult: any = await prisma.$queryRawUnsafe(
        'SELECT DATABASE() AS db',
      );
      if (dbNameResult[0]?.db === 'budgetflow_test') {
        const allEmails = [
          testUsers.pengguna.email,
          testUsers.admin.email,
          testUsers.finance.email,
          testUsers.superAdmin.email,
          testUsers.inactive.email,
          'e2e-ratelimit@perusahaan.com',
        ];
        await prisma.refreshToken.deleteMany({
          where: { user: { email: { in: allEmails } } },
        });
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
        await prisma.$executeRawUnsafe('TRUNCATE TABLE `activity_logs`');
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
        await prisma.user.deleteMany({
          where: { email: { in: allEmails } },
        });
      }
      await prisma.$disconnect();
    }
  }, 30000);

  describe('1. Login Tiap Peran Berhasil & Header X-Client', () => {
    it('Pengguna dapat login via client mobile dan menerima tokens yang sah', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'mobile')
        .send({
          email: testUsers.pengguna.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('id', testUsers.pengguna.id);
      expect(response.body.user).toHaveProperty('role', 'pengguna');

      // Verifikasi lastLoginAt terupdate di database
      const dbUser = await prisma.user.findUnique({
        where: { id: testUsers.pengguna.id },
      });
      expect(dbUser?.lastLoginAt).not.toBeNull();
    });

    it('Admin dapat login via client web dan menerima tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.admin.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.role).toBe('admin');
    });

    it('Finance dapat login via client web dan mobile', async () => {
      const responseWeb = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.finance.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(responseWeb.body.user.role).toBe('finance');

      const responseMobile = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'mobile')
        .send({
          email: testUsers.finance.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(responseMobile.body.user.role).toBe('finance');
    });

    it('Super Admin dapat login via client web', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.superAdmin.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      expect(response.body.user.role).toBe('super_admin');
    });

    it('Login tanpa header X-Client harus ditolak 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUsers.admin.email,
          password: TEST_PASSWORD,
        })
        .expect(400);

      expect(response.body.message).toMatch(/Header X-Client wajib disertakan/);
    });

    it('Login dengan header X-Client tidak dikenal harus ditolak 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'desktop_unknown')
        .send({
          email: testUsers.admin.email,
          password: TEST_PASSWORD,
        })
        .expect(400);

      expect(response.body.message).toMatch(
        /Nilai header X-Client harus "web" atau "mobile"/,
      );
    });
  });

  describe('2. Keseragaman Pesan Kesalahan (Password Salah vs Email Tidak Ada)', () => {
    it('mengembalikan pesan kesalahan yang sama persis: "Email atau kata sandi salah"', async () => {
      // Kasus 1: Email ada, kata sandi salah
      const resWrongPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.admin.email,
          password: 'PasswordSalahTotal999!',
        })
        .expect(401);

      // Kasus 2: Email tidak terdaftar di sistem
      const resNonExistentEmail = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: 'email.tidak.pernah.ada@perusahaan.com',
          password: 'PasswordSembarang123!',
        })
        .expect(401);

      expect(resWrongPassword.body.message).toBe('Email atau kata sandi salah');
      expect(resNonExistentEmail.body.message).toBe(
        'Email atau kata sandi salah',
      );
    });
  });

  describe('3. Penolakan Akun Tidak Aktif (is_active = false)', () => {
    it('login akun tidak aktif ditolak dengan pesan: "Akun tidak aktif, hubungi administrator"', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'mobile')
        .send({
          email: testUsers.inactive.email,
          password: TEST_PASSWORD,
        })
        .expect(403);

      expect(response.body.message).toBe(
        'Akun tidak aktif, hubungi administrator',
      );
    });

    it('jika akun dinonaktifkan setelah token terbit, request berikutnya wajib ditolak', async () => {
      // 1. Login saat aktif
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.admin.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const token = loginRes.body.accessToken;

      // 2. Akses berhasil saat masih aktif
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 3. Ubah status menjadi non-aktif di database
      await prisma.user.update({
        where: { id: testUsers.admin.id },
        data: { isActive: false },
      });

      // 4. Request berikutnya harus ditolak 403 oleh guard
      const rejectedRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(rejectedRes.body.message).toBe(
        'Akun tidak aktif, hubungi administrator',
      );

      // Pulihkan status aktif user admin
      await prisma.user.update({
        where: { id: testUsers.admin.id },
        data: { isActive: true },
      });
    });
  });

  describe('4. Penolakan Token Kedaluwarsa', () => {
    it('token yang telah melewati masa berlaku ditolak 401 Unauthorized', async () => {
      // Buat token yang sudah kedaluwarsa 10 detik lalu
      const expiredToken = await jwtService.signAsync(
        {
          sub: testUsers.admin.id,
          email: testUsers.admin.email,
          role: Role.admin,
          departmentId: itDepartmentId,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '-10s',
        },
      );

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toBe('Token telah kedaluwarsa');
    });
  });

  describe('5. Siklus & Rotasi Refresh Token', () => {
    it('refresh token yang sudah dipakai atau dicabut wajib ditolak', async () => {
      // 1. Login untuk mendapatkan refresh token awal
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.admin.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const oldRefreshToken = loginRes.body.refreshToken;

      // 2. Gunakan refresh token pertama kali -> BERHASIL dan menghasilkan token baru
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');
      const newRefreshToken = refreshRes.body.refreshToken;
      expect(newRefreshToken).not.toBe(oldRefreshToken);

      // 3. Gunakan refresh token lama lagi (sudah dirotasi) -> DITOLAK 401
      const reuseRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      expect(reuseRes.body.message).toMatch(
        /Refresh token tidak valid atau telah dicabut/,
      );

      // 4. Logout dengan refresh token baru
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${refreshRes.body.accessToken}`)
        .send({ refreshToken: newRefreshToken })
        .expect(200);

      // 5. Coba pakai refresh token yang baru saja dicabut saat logout -> DITOLAK 401
      const postLogoutRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: newRefreshToken })
        .expect(401);

      expect(postLogoutRes.body.message).toMatch(
        /Refresh token tidak valid atau telah dicabut/,
      );
    });
  });

  describe('6. Otorisasi RolesGuard (@Roles)', () => {
    let penggunaToken: string;
    let adminToken: string;
    let financeToken: string;
    let superAdminToken: string;

    beforeAll(async () => {
      const resPengguna = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'mobile')
        .send({
          email: testUsers.pengguna.email,
          password: TEST_PASSWORD,
        });
      penggunaToken = resPengguna.body.accessToken;

      const resAdmin = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.admin.email,
          password: TEST_PASSWORD,
        });
      adminToken = resAdmin.body.accessToken;

      const resFinance = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.finance.email,
          password: TEST_PASSWORD,
        });
      financeToken = resFinance.body.accessToken;

      const resSuperAdmin = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.superAdmin.email,
          password: TEST_PASSWORD,
        });
      superAdminToken = resSuperAdmin.body.accessToken;
    });

    it('endpoint @Roles(super_admin) mengembalikan 403 untuk pengguna', async () => {
      await request(app.getHttpServer())
        .get('/auth/test-super-admin')
        .set('Authorization', `Bearer ${penggunaToken}`)
        .expect(403);
    });

    it('endpoint @Roles(super_admin) mengembalikan 403 untuk admin', async () => {
      await request(app.getHttpServer())
        .get('/auth/test-super-admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('endpoint @Roles(super_admin) mengembalikan 403 untuk finance', async () => {
      await request(app.getHttpServer())
        .get('/auth/test-super-admin')
        .set('Authorization', `Bearer ${financeToken}`)
        .expect(403);
    });

    it('endpoint @Roles(super_admin) mengembalikan 200 untuk super_admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/test-super-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/Akses diizinkan/);
    });
  });

  describe('7. Endpoint Tanpa Token Mengembalikan 401', () => {
    it('akses /auth/me tanpa Authorization header harus ditolak 401', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(response.body.message).toBe('Token otentikasi tidak ditemukan');
    });

    it('akses /auth/test-super-admin tanpa token harus ditolak 401', async () => {
      await request(app.getHttpServer())
        .get('/auth/test-super-admin')
        .expect(401);
    });
  });

  describe('8. Pembatasan Client Web (Menolak Pengguna)', () => {
    it('client web menolak pengguna dengan pesan "Akun Pengguna tidak dapat masuk ke Web Admin"', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.pengguna.email,
          password: TEST_PASSWORD,
        })
        .expect(403);

      expect(response.body.message).toBe(
        'Akun Pengguna tidak dapat masuk ke Web Admin',
      );
    });
  });

  describe('9. Pembatasan Client Mobile (Menolak Super Admin)', () => {
    it('client mobile menolak super_admin dengan 403 Forbidden', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'mobile')
        .send({
          email: testUsers.superAdmin.email,
          password: TEST_PASSWORD,
        })
        .expect(403);

      expect(response.body.message).toBe(
        'Akun Super Admin tidak dapat masuk ke aplikasi mobile',
      );
    });
  });

  describe('10. Rate Limiting Login (Maksimal 5 Percobaan per Menit)', () => {
    it('menolak percobaan login ke-6 dalam 1 menit dengan 429 Too Many Requests', async () => {
      const rateLimitEmail = 'e2e-ratelimit@perusahaan.com';

      // 5 percobaan pertama (gagal kredensial -> 401)
      for (let i = 1; i <= 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Client', 'web')
          .send({
            email: rateLimitEmail,
            password: 'PasswordSalah!',
          })
          .expect(401);
      }

      // Percobaan ke-6 harus ditolak 429
      const blockedRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: rateLimitEmail,
          password: 'PasswordSalah!',
        })
        .expect(429);

      expect(blockedRes.body.message).toMatch(
        /Terlalu banyak percobaan login/,
      );
    });
  });

  describe('11. Keamanan Data: passwordHash Tidak Pernah Bocor', () => {
    it('passwordHash tidak muncul pada respons login maupun /auth/me', async () => {
      // Gunakan finance agar tidak kena rate limit (admin melebihi 5 login/menit di suite ini)
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Client', 'web')
        .send({
          email: testUsers.finance.email,
          password: TEST_PASSWORD,
        })
        .expect(200);

      const loginRaw = JSON.stringify(loginRes.body);
      expect(loginRaw).not.toContain('passwordHash');
      expect(loginRaw).not.toContain('password_hash');
      expect(loginRaw).not.toContain('$argon2');

      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200);

      const meRaw = JSON.stringify(meRes.body);
      expect(meRaw).not.toContain('passwordHash');
      expect(meRaw).not.toContain('password_hash');
      expect(meRaw).not.toContain('$argon2');
    });
  });

  describe('12. Validasi ScopeService', () => {
    it('mengembalikan filter yang tepat untuk tiap peran', () => {
      const penggunaScope = scopeService.getScope({
        id: 'user-1',
        role: Role.pengguna,
        departmentId: 'dept-1',
      });
      expect(penggunaScope).toEqual({ type: 'self', userId: 'user-1' });

      const adminScope = scopeService.getScope({
        id: 'user-2',
        role: Role.admin,
        departmentId: 'dept-1',
      });
      expect(adminScope).toEqual({
        type: 'department',
        departmentId: 'dept-1',
      });

      const financeScope = scopeService.getScope({
        id: 'user-3',
        role: Role.finance,
        departmentId: 'dept-2',
      });
      expect(financeScope).toEqual({ type: 'all' });

      const superAdminScope = scopeService.getScope({
        id: 'user-4',
        role: Role.super_admin,
        departmentId: null,
      });
      expect(superAdminScope).toEqual({ type: 'all' });
    });

    it('getPrismaWhereClause menghasilkan objek filter Prisma sesuai peran', () => {
      const penggunaFilter = scopeService.getPrismaWhereClause(
        { id: 'user-1', role: Role.pengguna },
        { userField: 'requesterId' },
      );
      expect(penggunaFilter).toEqual({ requesterId: 'user-1' });

      const adminFilter = scopeService.getPrismaWhereClause({
        id: 'user-2',
        role: Role.admin,
        departmentId: 'dept-1',
      });
      expect(adminFilter).toEqual({ departmentId: 'dept-1' });

      const financeFilter = scopeService.getPrismaWhereClause({
        id: 'user-3',
        role: Role.finance,
      });
      expect(financeFilter).toEqual({});

      const superAdminFilter = scopeService.getPrismaWhereClause({
        id: 'user-4',
        role: Role.super_admin,
      });
      expect(superAdminFilter).toEqual({});
    });
  });
});
