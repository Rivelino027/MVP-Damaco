import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Email atau password salah.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Email atau password salah.' });
    }

    const roleName = user.role.name;
    const secret = process.env.JWT_SECRET || 'super-secret-key-mp-agile-cost-2026';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: roleName,
        hourlyRate: user.hourlyRate,
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleName,
        hourlyRate: user.hourlyRate,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Tidak terotentikasi' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        hourlyRate: user.hourlyRate,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
    });

    const isOwnerOrPMOrFinance = req.user?.role === 'OWNER' || req.user?.role === 'PROJECT_MANAGER' || req.user?.role === 'PM' || req.user?.role === 'FINANCE';

    const sanitizedUsers = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role.name,
      avatar: u.avatar,
      // Hourly rate strictly hidden from non-authorized roles
      hourlyRate: (isOwnerOrPMOrFinance || u.id === req.user?.id) ? u.hourlyRate : undefined,
    }));

    return res.json({ success: true, data: sanitizedUsers });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/auth/users/:id/role (STRICTLY OWNER ONLY)
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const callerRole = req.user?.role;
    if (callerRole !== 'OWNER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'Akses ditolak. Pengubahan peran (role) pengguna hanya dapat dilakukan oleh OWNER.',
      });
    }

    const { id } = req.params;
    const { role: targetRoleName } = req.body;

    if (!targetRoleName) {
      return res.status(400).json({ success: false, message: 'Role target wajib diisi.' });
    }

    const normalizedRole = targetRoleName === 'PM' ? 'PROJECT_MANAGER' : targetRoleName;
    const roleRecord = await prisma.role.findFirst({ where: { name: normalizedRole } });

    if (!roleRecord) {
      return res.status(400).json({ success: false, message: `Role '${targetRoleName}' tidak valid.` });
    }

    const targetUser = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roleId: roleRecord.id },
      include: { role: true },
    });

    const { logAudit } = await import('../lib/services');
    await logAudit(req.user!.id, 'CHANGE_USER_ROLE', 'USER', targetUser.id, targetUser.role.name, updatedUser.role.name);

    return res.json({
      success: true,
      message: `Role pengguna ${targetUser.name} berhasil diperbarui menjadi ${updatedUser.role.name}.`,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role.name,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/auth/profile (Role manipulation protection)
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Belum terautentikasi.' });

    const { name, phone, avatar, role, roleId } = req.body;

    // Mass assignment / Role manipulation protection
    if ((role || roleId) && req.user?.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        code: 'ROLE_MANIPULATION_ATTEMPT',
        message: 'Akses ditolak. Anda tidak diizinkan mengubah role akun sendiri.',
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name ? name.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        avatar: avatar !== undefined ? avatar : undefined,
      },
      include: { role: true },
    });

    return res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role.name,
        phone: updated.phone,
        avatar: updated.avatar,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

