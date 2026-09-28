import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

/**
 * GET /api/clients
 */
export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      include: {
        projects: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            contractValue: true,
            status: true,
            progressPercentage: true,
          },
        },
        invoices: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = clients.map((client) => {
      const totalInvoice = client.invoices.reduce((sum, inv) => sum + (inv.totalAmount || inv.amount), 0);
      const paid = client.invoices.reduce((sum, inv) => {
        const invPaid = inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
        return sum + (inv.status === 'PAID' ? (inv.totalAmount || inv.amount) : invPaid);
      }, 0);
      const outstanding = Math.max(0, totalInvoice - paid);

      return {
        ...client,
        billingSummary: {
          totalInvoice,
          paid,
          outstanding,
        },
      };
    });

    return res.json({ success: true, data: sanitized });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/clients/:id
 */
export const getClientById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: true,
        invoices: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Klien tidak ditemukan.' });
    }

    const totalInvoice = client.invoices.reduce((sum, inv) => sum + (inv.totalAmount || inv.amount), 0);
    const paid = client.invoices.reduce((sum, inv) => {
      const invPaid = inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
      return sum + (inv.status === 'PAID' ? (inv.totalAmount || inv.amount) : invPaid);
    }, 0);
    const outstanding = Math.max(0, totalInvoice - paid);

    return res.json({
      success: true,
      data: {
        ...client,
        billingSummary: {
          totalInvoice,
          paid,
          outstanding,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/clients (OWNER & PM only)
 */
export const createClient = async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, contactPerson, email, phone, address, status } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ success: false, message: 'Company name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const client = await prisma.client.create({
      data: {
        companyName: companyName.trim(),
        contactPerson: (contactPerson || '').trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        status: status || 'ACTIVE',
      },
    });

    return res.status(201).json({ success: true, data: client });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/clients/:id
 */
export const updateClient = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { companyName, contactPerson, email, phone, address, status } = req.body;

    const existingClient = await prisma.client.findUnique({ where: { id } });
    if (!existingClient) {
      return res.status(404).json({ success: false, message: 'Klien tidak ditemukan.' });
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        companyName: companyName !== undefined ? companyName.trim() : existingClient.companyName,
        contactPerson: contactPerson !== undefined ? contactPerson.trim() : existingClient.contactPerson,
        email: email !== undefined ? email.trim() : existingClient.email,
        phone: phone !== undefined ? phone.trim() : existingClient.phone,
        address: address !== undefined ? address.trim() : existingClient.address,
        status: status !== undefined ? status : existingClient.status,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/clients/:id
 */
export const deleteClient = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: true,
      },
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Klien tidak ditemukan.' });
    }

    if (client.projects && client.projects.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'CLIENT_HAS_PROJECTS',
        message: 'Klien tidak dapat dihapus karena masih terhubung dengan proyek.',
      });
    }

    await prisma.client.delete({ where: { id } });

    return res.json({ success: true, message: 'Klien berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
