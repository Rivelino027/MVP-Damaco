import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ProjectFlow Database with 12 Business Workflows & 17 entities...');

  // Clean existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.budgetRevision.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.task.deleteMany();
  await prisma.wbsPhase.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // 1. Roles
  const ownerRole = await prisma.role.create({ data: { name: 'OWNER' } });
  const pmRole = await prisma.role.create({ data: { name: 'PROJECT_MANAGER' } });
  const memberRole = await prisma.role.create({ data: { name: 'MEMBER' } });
  const financeRole = await prisma.role.create({ data: { name: 'FINANCE' } });
  const clientRole = await prisma.role.create({ data: { name: 'CLIENT' } });

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Primary Users
  const ownerUser = await prisma.user.create({
    data: {
      roleId: ownerRole.id,
      name: 'Budi Santoso (Owner)',
      email: 'owner@projectflow.id',
      password: hashedPassword,
      phone: '08112345678',
      hourlyRate: 250000,
      status: 'ACTIVE',
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      roleId: pmRole.id,
      name: 'Rina Wijaya (Project Manager)',
      email: 'pm@projectflow.id',
      password: hashedPassword,
      phone: '08123456789',
      hourlyRate: 175000,
      status: 'ACTIVE',
    },
  });

  const memberAndi = await prisma.user.create({
    data: {
      roleId: memberRole.id,
      name: 'Andi Pratama (Senior Dev)',
      email: 'member@projectflow.id',
      password: hashedPassword,
      phone: '08134567890',
      hourlyRate: 50000, // Rp 50.000 / jam (Contoh Workflow 4)
      status: 'ACTIVE',
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      roleId: financeRole.id,
      name: 'Dewi Lestari (Finance Manager)',
      email: 'finance@projectflow.id',
      password: hashedPassword,
      phone: '08145678901',
      hourlyRate: 100000,
      status: 'ACTIVE',
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      roleId: clientRole.id,
      name: 'Hendra Setiawan (Bank Nusantara)',
      email: 'client@banknusantara.co.id',
      password: hashedPassword,
      phone: '08156789012',
      hourlyRate: 0,
      status: 'ACTIVE',
    },
  });

  // Also create Alias Users for legacy email formats
  await prisma.user.createMany({
    data: [
      { roleId: ownerRole.id, name: 'Budi Santoso', email: 'owner@damaco.id', password: hashedPassword, hourlyRate: 250000, status: 'ACTIVE' },
      { roleId: pmRole.id, name: 'Rina Wijaya', email: 'pm@damaco.id', password: hashedPassword, hourlyRate: 175000, status: 'ACTIVE' },
      { roleId: memberRole.id, name: 'Andi Pratama', email: 'andi@damaco.id', password: hashedPassword, hourlyRate: 50000, status: 'ACTIVE' },
      { roleId: memberRole.id, name: 'Siti Rahma', email: 'siti@damaco.id', password: hashedPassword, hourlyRate: 45000, status: 'ACTIVE' },
      { roleId: financeRole.id, name: 'Dewi Lestari', email: 'finance@damaco.id', password: hashedPassword, hourlyRate: 100000, status: 'ACTIVE' },
    ],
  });

  // 3. Clients (Workflow 1)
  const clientBank = await prisma.client.create({
    data: {
      companyName: 'PT Bank Nusantara',
      contactPerson: 'Hendra Setiawan',
      email: 'client@banknusantara.co.id',
      phone: '021-5551234',
      address: 'Jl. Jend. Sudirman No. 45, Jakarta Pusat',
      status: 'ACTIVE',
    },
  });

  // 4. WORKFLOW 1 — CREATE PROJECT
  const project1 = await prisma.project.create({
    data: {
      clientId: clientBank.id,
      projectManagerId: pmUser.id,
      projectCode: 'PRJ-2026-BN01',
      name: 'Mobile Banking App Redesign',
      description: 'Pengembangan ulang iOS & Android App dengan Microservices Backend',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2026-12-31'),
      contractValue: 100000000, // Rp 100,000,000 (Contoh Workflow 6)
      status: 'ACTIVE',
      progressPercentage: 40, // 40% Progress vs 65% Cost Consumption -> AT RISK Warning!
    },
  });

  // 5. Project Members
  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: pmUser.id },
      { projectId: project1.id, userId: memberAndi.id },
      { projectId: project1.id, userId: financeUser.id },
    ],
  });

  // 6. WORKFLOW 2 — CREATE WBS PHASES
  const phaseAnalysis = await prisma.wbsPhase.create({
    data: {
      projectId: project1.id,
      name: 'Analysis & Requirement',
      description: 'System Requirement & Architecture Specification',
      sortOrder: 1,
      budgetAmount: 15000000,
      progressPercentage: 100,
      status: 'COMPLETED',
    },
  });

  const phaseUIUX = await prisma.wbsPhase.create({
    data: {
      projectId: project1.id,
      name: 'UI/UX Design',
      description: 'Figma Prototype & Design System',
      sortOrder: 2,
      budgetAmount: 20000000,
      progressPercentage: 100,
      status: 'COMPLETED',
    },
  });

  const phaseDev = await prisma.wbsPhase.create({
    data: {
      projectId: project1.id,
      name: 'Development',
      description: 'Backend API & Frontend Flutter Implementation',
      sortOrder: 3,
      budgetAmount: 45000000,
      progressPercentage: 25,
      status: 'IN_PROGRESS',
    },
  });

  const phaseTesting = await prisma.wbsPhase.create({
    data: {
      projectId: project1.id,
      name: 'Testing & QA',
      description: 'UAT & Security Vulnerability Audit',
      sortOrder: 4,
      budgetAmount: 12000000,
      progressPercentage: 0,
      status: 'PLANNING',
    },
  });

  const phaseDeploy = await prisma.wbsPhase.create({
    data: {
      projectId: project1.id,
      name: 'Deployment & Handover',
      description: 'App Store Release & Production Migration',
      sortOrder: 5,
      budgetAmount: 8000000,
      progressPercentage: 0,
      status: 'PLANNING',
    },
  });

  // 7. WORKFLOW 3 — CREATE TASK
  const taskLoginAPI = await prisma.task.create({
    data: {
      projectId: project1.id,
      phaseId: phaseDev.id,
      assignedToId: memberAndi.id,
      title: 'Develop Login API',
      description: 'Implementasi JWT OAuth2 Login Endpoint & Biometric Token',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      startDate: new Date('2026-09-01'),
      dueDate: new Date('2026-09-30'),
      estimatedHours: 16,
      actualHours: 6,
      progressPercentage: 50,
      estimatedCost: 16 * memberAndi.hourlyRate, // 16 * 50.000 = 800.000
      actualCost: 6 * memberAndi.hourlyRate, // 6 * 50.000 = 300.000 (Labor Cost)
    },
  });

  // 8. WORKFLOW 4 — WORK & TIMESHEET
  // Andi logs 6 hours x Rp50.000 = Rp300.000 Labor Cost
  const timesheetAndi = await prisma.timesheet.create({
    data: {
      userId: memberAndi.id,
      projectId: project1.id,
      taskId: taskLoginAPI.id,
      date: new Date('2026-09-20'),
      hours: 6,
      hourlyRateSnapshot: memberAndi.hourlyRate, // 50.000
      laborCost: 6 * memberAndi.hourlyRate, // Rp300.000
      description: 'Selesai coding endpoint auth & validasi password hashing',
      status: 'APPROVED',
      approvedById: pmUser.id,
      approvedAt: new Date('2026-09-21'),
    },
  });

  // Additional timesheets to demonstrate realistic Rp65M actual cost
  await prisma.timesheet.createMany({
    data: [
      {
        userId: memberAndi.id,
        projectId: project1.id,
        taskId: taskLoginAPI.id,
        date: new Date('2026-08-15'),
        hours: 140,
        hourlyRateSnapshot: 150000,
        laborCost: 21000000, // Rp 21M
        description: 'Design Architecture & Core Services',
        status: 'APPROVED',
        approvedById: pmUser.id,
      },
      {
        userId: pmUser.id,
        projectId: project1.id,
        taskId: taskLoginAPI.id,
        date: new Date('2026-08-28'),
        hours: 120,
        hourlyRateSnapshot: 175000,
        laborCost: 21000000, // Rp 21M
        description: 'Sprint Planning, WBS setup & Client Alignment',
        status: 'APPROVED',
        approvedById: ownerUser.id,
      },
    ],
  });

  // 9. WORKFLOW 5 — EXPENSE
  const expenseTransport = await prisma.expense.create({
    data: {
      projectId: project1.id,
      phaseId: phaseDev.id,
      taskId: taskLoginAPI.id,
      submittedById: memberAndi.id,
      category: 'TRAVEL',
      description: 'Transport taksi meeting teknis tim perbankan',
      amount: 75000, // Rp 75.000
      expenseDate: new Date('2026-09-22'),
      receiptPath: '/receipts/transport_75k.png',
      status: 'APPROVED',
      approvedById: pmUser.id,
      approvedAt: new Date('2026-09-23'),
      paidAt: new Date('2026-09-23'),
    },
  });

  const expenseServer = await prisma.expense.create({
    data: {
      projectId: project1.id,
      phaseId: phaseDev.id,
      submittedById: pmUser.id,
      category: 'SOFTWARE_LICENSE',
      description: 'Sewa Server Cloud AWS Enterprise & SSL Certificate',
      amount: 22625000, // Rp 22.625.000 -> Total Actual Cost = 21M + 21M + 0.3M + 0.075M + 22.625M = Rp65,000,000
      expenseDate: new Date('2026-09-10'),
      receiptPath: '/receipts/aws_invoice.pdf',
      status: 'APPROVED',
      approvedById: financeUser.id,
      approvedAt: new Date('2026-09-11'),
      paidAt: new Date('2026-09-12'),
    },
  });

  // 10. WORKFLOW 6 & 7 — BUDGET & PROJECT HEALTH
  await prisma.budget.create({
    data: {
      projectId: project1.id,
      phaseId: phaseDev.id,
      category: 'LABOR',
      baselineAmount: 100000000,
      currentAmount: 100000000,
      actualAmount: 65000000, // Rp 65M Actual Cost
      committedAmount: 10000000, // Rp 10M Committed Cost (PO)
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      projectId: project1.id,
      phaseId: phaseDev.id,
      vendorName: 'AWS Cloud Hosting Vendor',
      poNumber: 'PO-2026-001',
      amount: 10000000, // Rp 10M Committed Cost
      status: 'APPROVED',
      orderDate: new Date('2026-09-15'),
      expectedDate: new Date('2026-10-01'),
      createdById: pmUser.id,
      approvedById: ownerUser.id,
    },
  });

  // 11. WORKFLOW 8 — MILESTONE
  const milestoneUIUX = await prisma.milestone.create({
    data: {
      projectId: project1.id,
      name: 'UI/UX Completed',
      description: '100% UI/UX tasks completed & signed off by client',
      dueDate: new Date('2026-09-01'),
      progressRequirement: 100,
      status: 'COMPLETED',
      completedAt: new Date('2026-09-02'),
    },
  });

  // 12. WORKFLOW 9 — INVOICE
  const invoice1 = await prisma.invoice.create({
    data: {
      projectId: project1.id,
      clientId: clientBank.id,
      milestoneId: milestoneUIUX.id,
      invoiceNumber: 'INV-2026-001',
      amount: 20000000, // Rp 20.000.000
      issueDate: new Date('2026-09-05'),
      dueDate: new Date('2026-09-25'),
      status: 'PAID',
      notes: 'Termin 1: Milestone UI/UX Completed Sign-off',
    },
  });

  // 13. WORKFLOW 10 — PAYMENT
  await prisma.payment.create({
    data: {
      invoiceId: invoice1.id,
      amount: 20000000, // Rp 20.000.000 Full Payment
      paymentDate: new Date('2026-09-15'),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'TRF-BN-99201',
      notes: 'Lunas full payment dari PT Bank Nusantara',
      createdById: financeUser.id,
    },
  });

  // 14. WORKFLOW 11 — AUTOMATIC NOTIFICATIONS
  await prisma.notification.createMany({
    data: [
      {
        userId: pmUser.id,
        type: 'PROJECT_HEALTH_WARNING',
        title: '⚠️ Early Warning: Proyek 🔴 At Risk',
        message: 'Cost consumption is significantly higher than project progress. (Progress: 40%, Cost Consumption: 65%)',
      },
      {
        userId: financeUser.id,
        type: 'MILESTONE_COMPLETED',
        title: 'Milestone Completed',
        message: 'Milestone UI/UX Completed. Invoice can now be issued.',
      },
      {
        userId: memberAndi.id,
        type: 'TASK_ASSIGNED',
        title: 'Tugas Baru Ditugaskan',
        message: 'Anda ditugaskan mengerjakan "Develop Login API" (Est: 16 jam).',
      },
    ],
  });

  // 15. WORKFLOW 12 — AUDIT TRAIL LOGS
  await prisma.auditLog.createMany({
    data: [
      {
        userId: ownerUser.id,
        action: 'PROJECT_CHANGE',
        targetType: 'PROJECT',
        targetId: project1.id,
        oldValue: 'PLANNING',
        newValue: 'ACTIVE (Contract: Rp100.000.000)',
      },
      {
        userId: pmUser.id,
        action: 'TASK_STATUS_CHANGE',
        targetType: 'TASK',
        targetId: taskLoginAPI.id,
        oldValue: 'TODO',
        newValue: 'IN_PROGRESS (Assignee: Andi)',
      },
      {
        userId: pmUser.id,
        action: 'EXPENSE_APPROVAL',
        targetType: 'EXPENSE',
        targetId: expenseTransport.id,
        oldValue: 'SUBMITTED',
        newValue: 'APPROVED (Rp75.000)',
      },
      {
        userId: financeUser.id,
        action: 'INVOICE_CHANGE',
        targetType: 'INVOICE',
        targetId: invoice1.id,
        oldValue: 'DRAFT',
        newValue: 'ISSUED (INV-2026-001 - Rp20.000.000)',
      },
      {
        userId: financeUser.id,
        action: 'PAYMENT_RECORDED',
        targetType: 'PAYMENT',
        targetId: invoice1.id,
        oldValue: 'ISSUED',
        newValue: 'PAID (TRF-BN-99201 - Rp20.000.000)',
      },
    ],
  });

  console.log('ProjectFlow Database successfully seeded with all alias emails!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
