import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';
import { logAudit } from '../lib/services';

const getNormalizedRole = (req: AuthRequest): string => {
  const role = req.user?.role || 'MEMBER';
  return role === 'PM' ? 'PROJECT_MANAGER' : role;
};

export const getVendors = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Client tidak dapat mengakses data vendor internal.' });
    }

    const vendors = await prisma.vendor.findMany({
      include: {
        purchaseOrders: {
          select: { id: true, poNumber: true, totalAmount: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ success: true, data: vendors });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getVendorById = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role === 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        purchaseOrders: true,
      },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor tidak ditemukan.' });
    }

    return res.json({ success: true, data: vendor });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createVendor = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak untuk membuat vendor.' });
    }

    const { name, contactPerson, email, phone, address, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama vendor wajib diisi.' });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson ? contactPerson.trim() : null,
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        status: status || 'ACTIVE',
      },
    });

    await logAudit(req.user!.id, 'VENDOR_CREATED', 'VENDOR', vendor.id, null, vendor.name);

    return res.status(201).json({ success: true, data: vendor });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVendor = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE' && role !== 'PROJECT_MANAGER') {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    const { id } = req.params;
    const { name, contactPerson, email, phone, address, status } = req.body;

    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Vendor tidak ditemukan.' });
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        contactPerson: contactPerson !== undefined ? (contactPerson ? contactPerson.trim() : null) : existing.contactPerson,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
        address: address !== undefined ? (address ? address.trim() : null) : existing.address,
        status: status !== undefined ? status : existing.status,
      },
    });

    await logAudit(req.user!.id, 'VENDOR_UPDATED', 'VENDOR', id, existing.name, updated.name);

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVendor = async (req: AuthRequest, res: Response) => {
  try {
    const role = getNormalizedRole(req);
    if (role !== 'OWNER' && role !== 'FINANCE') {
      return res.status(403).json({ success: false, message: 'Hanya OWNER dan FINANCE yang dapat menghapus vendor.' });
    }

    const { id } = req.params;
    const existing = await prisma.vendor.findUnique({
      where: { id },
      include: { purchaseOrders: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Vendor tidak ditemukan.' });
    }

    if (existing.purchaseOrders && existing.purchaseOrders.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ini tidak dapat dihapus karena terhubung dengan Purchase Order.',
      });
    }

    await prisma.vendor.delete({ where: { id } });
    await logAudit(req.user!.id, 'VENDOR_DELETED', 'VENDOR', id, existing.name, null);

    return res.json({ success: true, message: 'Vendor berhasil dihapus.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
