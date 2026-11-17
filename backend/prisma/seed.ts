// Prisma seed script for dev environment – idempotent
// Run with: npm run seed (see package.json)
import { PrismaClient, Role, ProjectStatus, TaskStatus, Priority, TimesheetStatus, ExpenseStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure we are not in production
  if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') {
    console.warn('Seed script should only run in development. Aborting.');
    return;
  }

  // ----- Users -----
  // Use the existing user with the known ID. Do not alter passwordHash.
  const existingUserId = 'c1d16d80-6861-469c-9182-87e9c196720d';
  let user = await prisma.user.findUnique({ where: { id: existingUserId } });
  if (!user) {
    // Fallback: create the user if it does not exist (development only).
    user = await prisma.user.create({
      data: {
        id: existingUserId,
        name: 'Pengguna',
        email: 'pengguna@perusahaan.com',
        passwordHash: 'TODO_HASH', // placeholder for dev
        role: Role.pengguna,
      },
    });
  }

  // ----- Department & Cost Center -----
  const department = await prisma.department.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT' },
  });

  // Use existing cost center with code 'IT-Product-01'
  const costCenter = await prisma.costCenter.upsert({
    where: { code: 'IT-Product-01' },
    update: {},
    create: { code: 'IT-Product-01', name: 'IT Product Center', departmentId: department.id },
  });

  // ----- Projects (2) -----
  const projectData = [
    { name: 'Implementasi Jaringan Lantai 2', description: 'Konfigurasi VLAN Lantai 2', status: ProjectStatus.berjalan },
    { name: 'Backup Server Utama', description: 'Backup rutin server produksi', status: ProjectStatus.berjalan },
  ];

  const projects = [] as any[];
  for (const pd of projectData) {
    let proj = await prisma.project.findFirst({
      where: { name: pd.name, departmentId: department.id },
    });
    if (!proj) {
      proj = await prisma.project.create({
        data: {
          name: pd.name,
          description: pd.description,
          departmentId: department.id,
          costCenterId: costCenter.id,
          status: pd.status,
          createdById: user.id,
        },
      });
    }
    projects.push(proj);
    // ensure the user is a member of the project (idempotent upsert on composite unique)
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: proj.id, userId: user.id } },
      update: {},
      create: { projectId: proj.id, userId: user.id },
    });
  }

  // ----- Phases for each project (simple single phase) -----
  for (const proj of projects) {
    let phase = await prisma.phase.findFirst({
      where: { projectId: proj.id, name: 'Phase 1' },
    });
    if (!phase) {
      phase = await prisma.phase.create({
        data: { projectId: proj.id, name: 'Phase 1', sortOrder: 1 },
      });
    }
  }

  // ----- Tasks (6) -----
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const past = new Date();
  past.setDate(today.getDate() - 2);

  const taskDefs = [
    { title: 'Konfigurasi VLAN Lantai 2', status: TaskStatus.belum_mulai, priority: Priority.tinggi, dueDate: tomorrow },
    { title: 'Backup server utama', status: TaskStatus.dikerjakan, priority: Priority.sedang, dueDate: today },
    { title: 'Dokumentasi topologi jaringan', status: TaskStatus.review, priority: Priority.rendah, dueDate: past },
    { title: 'Monitoring sistem', status: TaskStatus.selesai, priority: Priority.sedang, dueDate: past },
    { title: 'Patch keamanan', status: TaskStatus.belum_mulai, priority: Priority.tinggi, dueDate: tomorrow },
    { title: 'Audit log', status: TaskStatus.dikerjakan, priority: Priority.rendah, dueDate: today },
  ];

  const tasks = [] as any[];
  for (let i = 0; i < taskDefs.length; i++) {
    const proj = projects[i % projects.length];
    const td = taskDefs[i];
    let task = await prisma.task.findFirst({
      where: { title: td.title, projectId: proj.id },
    });
    if (!task) {
      task = await prisma.task.create({
        data: {
          title: td.title,
          projectId: proj.id,
          assigneeId: user.id,
          status: td.status,
          priority: td.priority,
          dueDate: td.dueDate,
        },
      });
    }
    tasks.push(task);
  }

  // ----- Timesheet for week 16-22 Nov 2026 -----
  const weekStart = new Date('2026-11-16');
  const timesheet = await prisma.timesheet.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    update: {},
    create: {
      userId: user.id,
      weekStart,
      status: TimesheetStatus.draft,
    },
  });

  // Add entries totaling ~20h spread across tasks
  const entryHours = [4, 3, 5, 2, 3, 3];
  for (let i = 0; i < tasks.length; i++) {
    await prisma.timesheetEntry.create({
      data: {
        timesheetId: timesheet.id,
        taskId: tasks[i].id,
        workDate: new Date('2026-11-17'),
        hours: entryHours[i],
        note: 'Dev seed entry',
      },
    });
  }

  // Ensure a default expense category exists
  const defaultCategory = await prisma.expenseCategory.upsert({
    where: { name: 'General' },
    update: {},
    create: { name: 'General', code: 'GEN' },
  });

  // ----- Expenses (6) -----
  const expenseDefs = [
    { amount: 300000, status: ExpenseStatus.disetujui },
    { amount: 1500000, status: ExpenseStatus.menunggu_admin },
    { amount: 2500000, status: ExpenseStatus.menunggu_finance },
    { amount: 5000000, status: ExpenseStatus.siap_dibayar }, // large amount
    { amount: 2000000, status: ExpenseStatus.dibayar },
    { amount: 100000, status: ExpenseStatus.ditolak },
  ];

  for (let i = 0; i < expenseDefs.length; i++) {
    const proj = projects[i % projects.length];
    // Check if expense already exists for this amount and project
    let expense = await prisma.expense.findFirst({
      where: { amount: expenseDefs[i].amount, projectId: proj.id },
    });
    if (!expense) {
      expense = await prisma.expense.create({
        data: {
          requesterId: user.id,
          projectId: proj.id,
          costCenterId: costCenter.id,
          categoryId: defaultCategory.id,
          amount: expenseDefs[i].amount,
          expenseDate: new Date('2026-11-18'),
          status: expenseDefs[i].status,
          isLargeAmount: expenseDefs[i].amount > 5000000,
        },
      });
    }
  }

  // ----- Notifications (5) -----
  const notifDefs = [
    {
      title: 'Welcome',
      body: 'Selamat datang di BudgetFlow',
      type: 'info',
      read: true,
    },
    {
      title: 'Task Assigned',
      body: `Anda memiliki task baru: ${tasks[0]?.title || 'Task'}`,
      type: 'task',
      refType: 'task',
      refId: tasks[0]?.id,
      read: false,
    },
    {
      title: 'Expense Approved',
      body: `Pengeluaran Anda dengan jumlah Rp ${expenseDefs[0]?.amount?.toLocaleString() || ''} telah disetujui`,
      type: 'expense',
      refType: 'expense',
      // Use first expense created (we will capture its id below)
      refId: null,
      read: true,
    },
    {
      title: 'Timesheet Submitted',
      body: 'Timesheet minggu ini telah dikirim',
      type: 'timesheet',
      refType: 'timesheet',
      refId: timesheet.id,
      read: false,
    },
    {
      title: 'System Update',
      body: 'Aplikasi diperbarui ke versi terbaru',
      type: 'info',
      read: false,
    },
  ];

  // Capture created expenses to link in notification
  const createdExpenses: any[] = [];
  for (let i = 0; i < expenseDefs.length; i++) {
    const proj = projects[i % projects.length];
    let expense = await prisma.expense.findFirst({
      where: { amount: expenseDefs[i].amount, projectId: proj.id },
    });
    if (!expense) {
      expense = await prisma.expense.create({
        data: {
          requesterId: user.id,
          projectId: proj.id,
          costCenterId: costCenter.id,
          categoryId: defaultCategory.id,
          amount: expenseDefs[i].amount,
          expenseDate: new Date('2026-11-18'),
          status: expenseDefs[i].status,
          isLargeAmount: expenseDefs[i].amount > 5000000,
        },
      });
    }
    createdExpenses.push(expense);
  }

  // Update refId for Expense Approved notification now that we have an expense id
  const expenseApprovedNotif = notifDefs.find((n) => n.title === 'Expense Approved');
  if (expenseApprovedNotif) {
    expenseApprovedNotif.refId = createdExpenses[0]?.id;
  }

  // Insert notifications idempotently
  for (const nd of notifDefs) {
    const existing = await prisma.notification.findFirst({
      where: { userId: user.id, title: nd.title, type: nd.type },
    });
    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: nd.type,
          title: nd.title,
          body: nd.body,
          refType: nd.refType ?? undefined,
          refId: nd.refId ?? undefined,
          readAt: nd.read ? new Date() : undefined,
        },
      });
    }
  }

  console.log('Seed data inserted/updated successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
