import { PrismaClient, Role, DocumentType, LimitStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Token warna dari design-tokens/tokens.json
const CATEGORY_COLORS = {
  primary: '#E8141C',
  blue: '#0A47B8',
  warning: '#F29D38',
  textSecondary: '#6B5E60',
};

function generateStrongPassword(): string {
  // Menghasilkan password acak berkekuatan tinggi (huruf besar, kecil, angka, simbol)
  const bytes = crypto.randomBytes(18).toString('base64');
  return bytes.replace(/[+/=]/g, (m) => (m === '+' ? 'X' : m === '/' ? 'Y' : '!'));
}

async function main() {
  console.log('Memulai seeding database BudgetFlow...');

  // 1. Departemen
  const departmentsData = [
    { name: 'IT' },
    { name: 'Finance' },
    { name: 'Operasional' },
    { name: 'HR' },
  ];

  const departments: Record<string, string> = {};
  for (const dept of departmentsData) {
    const record = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name, isActive: true },
    });
    departments[dept.name] = record.id;
  }
  console.log(`✓ 4 Departemen siap: ${Object.keys(departments).join(', ')}`);

  // 2. Cost Centers
  const costCentersData = [
    { code: 'IT-Product-01', name: 'IT Product Development', departmentName: 'IT' },
    { code: 'FIN-01', name: 'Finance Operations', departmentName: 'Finance' },
    { code: 'OPS-01', name: 'General Operations', departmentName: 'Operasional' },
    { code: 'HR-01', name: 'Human Resources', departmentName: 'HR' },
  ];

  for (const cc of costCentersData) {
    await prisma.costCenter.upsert({
      where: { code: cc.code },
      update: { departmentId: departments[cc.departmentName] },
      create: {
        code: cc.code,
        name: cc.name,
        departmentId: departments[cc.departmentName],
        isActive: true,
      },
    });
  }
  console.log('✓ 4 Cost Center siap');

  // 3. Kategori Biaya (warna dari design-tokens/tokens.json)
  const categoriesData = [
    { name: 'Tenaga Kerja', code: 'LABOR', color: CATEGORY_COLORS.primary },
    { name: 'Material', code: 'MATERIAL', color: CATEGORY_COLORS.warning },
    { name: 'Vendor', code: 'VENDOR', color: CATEGORY_COLORS.blue },
    { name: 'Lain-lain', code: 'OTHER', color: CATEGORY_COLORS.textSecondary },
  ];

  for (const cat of categoriesData) {
    await prisma.expenseCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, color: cat.color },
      create: {
        name: cat.name,
        code: cat.code,
        color: cat.color,
        isActive: true,
      },
    });
  }
  console.log('✓ 4 Kategori Biaya siap');

  // 4. Approval Rules
  const approvalRulesData = [
    // Timesheet: Pengaju -> Admin
    { documentType: DocumentType.timesheet, stepOrder: 1, role: Role.admin },
    // Pengeluaran: Pengaju -> Admin -> Finance
    { documentType: DocumentType.expense, stepOrder: 1, role: Role.admin },
    { documentType: DocumentType.expense, stepOrder: 2, role: Role.finance },
    // Anggaran: Admin -> Finance -> Super Admin
    { documentType: DocumentType.budget_request, stepOrder: 1, role: Role.admin },
    { documentType: DocumentType.budget_request, stepOrder: 2, role: Role.finance },
    { documentType: DocumentType.budget_request, stepOrder: 3, role: Role.super_admin },
  ];

  for (const rule of approvalRulesData) {
    await prisma.approvalRule.upsert({
      where: {
        documentType_stepOrder: {
          documentType: rule.documentType,
          stepOrder: rule.stepOrder,
        },
      },
      update: { role: rule.role },
      create: rule,
    });
  }
  console.log('✓ 6 Aturan Persetujuan (approval_rules) siap');

  // 5. Approval Limit Awal (Rp5.000.000, status berlaku)
  const existingLimit = await prisma.approvalLimit.findFirst({
    where: { status: LimitStatus.berlaku },
  });

  if (!existingLimit) {
    await prisma.approvalLimit.create({
      data: {
        amount: 5000000,
        status: LimitStatus.berlaku,
        confirmedAt: new Date(),
      },
    });
    console.log('✓ Batas Nominal Besar awal Rp5.000.000 (status berlaku) dibuat');
  } else {
    console.log(`✓ Batas Nominal Besar sudah ada (Rp${existingLimit.amount.toString()}), melewati`);
  }

  // 6. Pengaturan Aplikasi (app_settings)
  const appSettingsData = [
    {
      key: 'absorption_warning_threshold',
      value: { threshold: 80, unit: 'percent' },
    },
    {
      key: 'split_detection_window_days',
      value: { days: 7, unit: 'days' },
    },
  ];

  for (const setting of appSettingsData) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
  }
  console.log('✓ Pengaturan aplikasi (ambang serapan 80, jendela deteksi 7 hari) siap');

  // 7. Akun Awal (4 peran, satu akun per peran)
  const usersToSeed = [
    {
      name: 'User Pengguna',
      email: 'pengguna@perusahaan.com',
      role: Role.pengguna,
      departmentId: departments['IT'],
      jobTitle: 'Software Engineer',
    },
    {
      name: 'Admin Proyek',
      email: 'admin@perusahaan.com',
      role: Role.admin,
      departmentId: departments['IT'],
      jobTitle: 'Project Lead',
    },
    {
      name: 'Finance Verifier',
      email: 'finance@perusahaan.com',
      role: Role.finance,
      departmentId: departments['Finance'],
      jobTitle: 'Financial Controller',
    },
    {
      name: 'Super Administrator',
      email: 'superadmin@perusahaan.com',
      role: Role.super_admin,
      departmentId: null,
      jobTitle: 'System Administrator',
    },
  ];

  const newlyCreatedAccounts: Array<{
    role: string;
    name: string;
    email: string;
    password: string;
  }> = [];

  for (const u of usersToSeed) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (existing) {
      console.log(`✓ Akun ${u.email} (${u.role}) sudah ada, password tidak diubah.`);
    } else {
      const plainPassword = generateStrongPassword();
      const passwordHash = await argon2.hash(plainPassword);

      await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role,
          departmentId: u.departmentId,
          jobTitle: u.jobTitle,
          isActive: true,
        },
      });

      newlyCreatedAccounts.push({
        role: u.role,
        name: u.name,
        email: u.email,
        password: plainPassword,
      });
    }
  }

  // CETAK PASSWORD SEKALI SAJA KE TERMINAL JIKA ADA AKUN BARU
  if (newlyCreatedAccounts.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log(' [PENTING] KREDENSIAL AKUN AWAL BUDGETFLOW (DICETAK SEKALI KE TERMINAL)');
    console.log('='.repeat(80));
    for (const acc of newlyCreatedAccounts) {
      console.log(`Peran        : ${acc.role}`);
      console.log(`Nama         : ${acc.name}`);
      console.log(`Email        : ${acc.email}`);
      console.log(`Password     : ${acc.password}`);
      console.log('-'.repeat(80));
    }
    console.log('CATATAN: Salin dan simpan password ini sekarang.');
    console.log('Password tidak disimpan di file teks dan tidak akan dicetak ulang.');
    console.log('='.repeat(80) + '\n');
  }

  console.log('Seeding selesai dengan sukses.');
}

main()
  .catch((e) => {
    console.error('Error saat seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
