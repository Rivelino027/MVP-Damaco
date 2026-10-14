import * as dotenv from 'dotenv';
dotenv.config();

const testDbUrl =
  process.env.DATABASE_URL_TEST ||
  'mysql://root@127.0.0.1:3306/budgetflow_test';
process.env.DATABASE_URL = testDbUrl;

import { PrismaClient, Role } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

describe('Database Foundation Integration Tests (MariaDB 10.4)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Append-Only Trigger pada activity_logs', () => {
    it('harus menolak UPDATE pada activity_logs dengan pesan error trigger', async () => {
      const log = await prisma.activityLog.create({
        data: {
          action: 'TEST_INIT',
          module: 'TEST_TRIGGER',
          beforeData: { status: 'created' },
          afterData: { status: 'pending' },
        },
      });

      await expect(
        prisma.activityLog.update({
          where: { id: log.id },
          data: { action: 'TAMPERED_ACTION' },
        }),
      ).rejects.toThrow(/activity_logs is append-only/);
    });

    it('harus menolak DELETE pada activity_logs dengan pesan error trigger', async () => {
      const log = await prisma.activityLog.create({
        data: {
          action: 'TEST_DELETE_BLOCK',
          module: 'TEST_TRIGGER',
          beforeData: { status: 'active' },
        },
      });

      await expect(
        prisma.activityLog.delete({
          where: { id: log.id },
        }),
      ).rejects.toThrow(/activity_logs is append-only/);
    });
  });

  describe('2. CHECK Constraint pada limit_change_requests', () => {
    let adminUser: { id: string };
    let financeUser: { id: string };
    let superAdminUser: { id: string };

    beforeAll(async () => {
      adminUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@perusahaan.com' },
      });
      financeUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'finance@perusahaan.com' },
      });
      superAdminUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'superadmin@perusahaan.com' },
      });
    });

    it('harus menolak jika proposerRole = confirmerRole', async () => {
      await expect(
        prisma.limitChangeRequest.create({
          data: {
            oldAmount: 5000000,
            newAmount: 6000000,
            proposedBy: adminUser.id,
            proposerRole: Role.admin,
            confirmedBy: financeUser.id,
            confirmerRole: Role.admin, // TIDAK BOLEH SAMA DENGAN proposerRole
          },
        }),
      ).rejects.toThrow();
    });

    it("harus menolak jika proposerRole = 'super_admin'", async () => {
      await expect(
        prisma.limitChangeRequest.create({
          data: {
            oldAmount: 5000000,
            newAmount: 6000000,
            proposedBy: superAdminUser.id,
            proposerRole: Role.super_admin, // Hanya boleh admin atau finance
          },
        }),
      ).rejects.toThrow();
    });

    it('harus menolak jika proposedBy = confirmedBy (orang yang sama)', async () => {
      await expect(
        prisma.limitChangeRequest.create({
          data: {
            oldAmount: 5000000,
            newAmount: 6000000,
            proposedBy: adminUser.id,
            proposerRole: Role.admin,
            confirmedBy: adminUser.id, // Orang yang sama
            confirmerRole: Role.finance,
          },
        }),
      ).rejects.toThrow();
    });

    it('harus menerima kombinasi valid (Admin mengusulkan, Finance mengonfirmasi)', async () => {
      const valid = await prisma.limitChangeRequest.create({
        data: {
          oldAmount: 5000000,
          newAmount: 7000000,
          reason: 'Uji usulan perubahan batas nominal valid',
          proposedBy: adminUser.id,
          proposerRole: Role.admin,
          confirmedBy: financeUser.id,
          confirmerRole: Role.finance,
          status: 'berlaku',
        },
      });

      expect(valid.id).toBeDefined();
      expect(valid.proposerRole).toBe('admin');
      expect(valid.confirmerRole).toBe('finance');
      expect(valid.proposedBy).not.toBe(valid.confirmedBy);

      // Bersihkan data uji
      await prisma.limitChangeRequest.delete({ where: { id: valid.id } });
    });
  });

  describe('3. Kolom JSON Tersimpan dan Terbaca sebagai Objek (Bukan String)', () => {
    it('activity_logs.beforeData dan afterData harus dibaca sebagai objek', async () => {
      const log = await prisma.activityLog.create({
        data: {
          action: 'JSON_VERIFY',
          module: 'SYSTEM',
          beforeData: { threshold: 80, active: true },
          afterData: { threshold: 90, active: false, nested: { key: 'val' } },
        },
      });

      const retrieved = await prisma.activityLog.findUniqueOrThrow({
        where: { id: log.id },
      });

      expect(typeof retrieved.beforeData).toBe('object');
      expect(retrieved.beforeData).not.toBeNull();
      expect(typeof retrieved.beforeData).not.toBe('string');
      expect((retrieved.beforeData as any).threshold).toBe(80);

      expect(typeof retrieved.afterData).toBe('object');
      expect(retrieved.afterData).not.toBeNull();
      expect(typeof retrieved.afterData).not.toBe('string');
      expect((retrieved.afterData as any).nested.key).toBe('val');
    });

    it('app_settings.value harus dibaca sebagai objek', async () => {
      const setting = await prisma.appSetting.findUniqueOrThrow({
        where: { key: 'absorption_warning_threshold' },
      });

      expect(typeof setting.value).toBe('object');
      expect(setting.value).not.toBeNull();
      expect(typeof setting.value).not.toBe('string');
      expect((setting.value as any).threshold).toBe(80);
    });

    it('expense_flags.relatedExpenseIds harus dibaca sebagai array/objek', async () => {
      const department = await prisma.department.findFirstOrThrow({
        where: { name: 'IT' },
      });
      const costCenter = await prisma.costCenter.findFirstOrThrow({
        where: { code: 'IT-Product-01' },
      });
      const category = await prisma.expenseCategory.findFirstOrThrow({
        where: { code: 'MATERIAL' },
      });
      const adminUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'admin@perusahaan.com' },
      });

      const project = await prisma.project.create({
        data: {
          name: 'Proyek Uji Flag',
          departmentId: department.id,
          costCenterId: costCenter.id,
          createdById: adminUser.id,
        },
      });

      const expense = await prisma.expense.create({
        data: {
          requesterId: adminUser.id,
          projectId: project.id,
          costCenterId: costCenter.id,
          categoryId: category.id,
          amount: 250000,
          expenseDate: new Date(),
        },
      });

      const flag = await prisma.expenseFlag.create({
        data: {
          expenseId: expense.id,
          flagType: 'terindikasi_dipecah',
          relatedExpenseIds: ['exp-001', 'exp-002', 'exp-003'],
        },
      });

      const retrievedFlag = await prisma.expenseFlag.findUniqueOrThrow({
        where: { id: flag.id },
      });

      expect(typeof retrievedFlag.relatedExpenseIds).toBe('object');
      expect(retrievedFlag.relatedExpenseIds).not.toBeNull();
      expect(typeof retrievedFlag.relatedExpenseIds).not.toBe('string');
      expect(Array.isArray(retrievedFlag.relatedExpenseIds)).toBe(true);
      expect(retrievedFlag.relatedExpenseIds).toEqual([
        'exp-001',
        'exp-002',
        'exp-003',
      ]);

      // Bersihkan
      await prisma.expenseFlag.delete({ where: { id: flag.id } });
      await prisma.expense.delete({ where: { id: expense.id } });
      await prisma.project.delete({ where: { id: project.id } });
    });
  });

  describe('4. Pemeriksaan Drift Migrasi Prisma', () => {
    it('menjalankan prisma migrate dev kedua kali tidak membuat migrasi baru', () => {
      const backendDir = path.resolve(__dirname, '..');
      const output = execSync('npx prisma migrate dev', {
        cwd: backendDir,
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: testDbUrl },
      });

      expect(output).toMatch(
        /Already in sync, no schema change or pending migration was found/,
      );
    }, 45000);
  });

  describe('5. Idempotensi Seed', () => {
    it('menjalankan seed kedua kali tidak menggandakan data', async () => {
      const countsBefore = {
        departments: await prisma.department.count(),
        costCenters: await prisma.costCenter.count(),
        categories: await prisma.expenseCategory.count(),
        approvalRules: await prisma.approvalRule.count(),
        approvalLimits: await prisma.approvalLimit.count(),
        users: await prisma.user.count(),
        appSettings: await prisma.appSetting.count(),
      };

      const backendDir = path.resolve(__dirname, '..');
      execSync('npx prisma db seed', {
        cwd: backendDir,
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: testDbUrl },
      });

      const countsAfter = {
        departments: await prisma.department.count(),
        costCenters: await prisma.costCenter.count(),
        categories: await prisma.expenseCategory.count(),
        approvalRules: await prisma.approvalRule.count(),
        approvalLimits: await prisma.approvalLimit.count(),
        users: await prisma.user.count(),
        appSettings: await prisma.appSetting.count(),
      };

      expect(countsAfter).toEqual(countsBefore);
      expect(countsAfter.departments).toBe(4);
      expect(countsAfter.costCenters).toBe(4);
      expect(countsAfter.categories).toBe(4);
      expect(countsAfter.approvalRules).toBe(6);
      expect(countsAfter.approvalLimits).toBe(1);
      expect(countsAfter.users).toBe(4);
      expect(countsAfter.appSettings).toBe(2);
    }, 45000);
  });
});
