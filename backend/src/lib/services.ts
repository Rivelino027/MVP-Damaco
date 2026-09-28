import { prisma } from './prisma';

/**
 * WORKFLOW 12: Audit Trail Service
 */
export const logAudit = async (
  userId: string,
  action: string,
  targetType: string,
  targetId: string,
  oldValue?: string | null,
  newValue?: string | null
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetType,
        targetId,
        oldValue: oldValue || null,
        newValue: newValue || null,
      },
    });
  } catch (err) {
    console.error('AuditLog Creation Failed:', err);
  }
};

/**
 * WORKFLOW 11: Notification Dispatcher Service
 */
export const notifyUser = async (
  userId: string,
  type: string,
  title: string,
  message: string
) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });
  } catch (err) {
    console.error('Notification Dispatch Failed:', err);
  }
};

/**
 * WORKFLOW 6 & 7: Project Health & Early Warning Calculation Service
 */
export const calculateProjectHealth = (progressPct: number, costConsumptionPct: number) => {
  if (costConsumptionPct > 85 || costConsumptionPct > 100) {
    return {
      status: 'OVER_BUDGET_RISK',
      badge: '🔴 Over Budget Risk',
      color: '#EF4444',
      message: 'Penyerapan anggaran mendekati atau melebihi limit total anggaran proyek.',
    };
  } else if ((costConsumptionPct - progressPct) > 15) {
    return {
      status: 'AT_RISK',
      badge: '🔴 At Risk',
      color: '#F59E0B',
      message: 'Cost consumption is significantly higher than project progress.',
    };
  } else {
    return {
      status: 'ON_TRACK',
      badge: '🟢 On Track',
      color: '#10B981',
      message: 'Proyek berjalan sesuai rencana anggaran dan jadwal.',
    };
  }
};
