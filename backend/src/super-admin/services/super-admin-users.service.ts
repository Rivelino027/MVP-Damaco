import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user-query.dto';
import { AuditLoggerService } from './audit-logger.service';

export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentId: true,
  jobTitle: true,
  avatarUrl: true,
  isActive: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
};

@Injectable()
export class SuperAdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  private generateSecurePassword(length = 16): string {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  async create(dto: CreateUserDto, currentUserId: string, ip: string) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Cek duplikasi email
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('Email sudah digunakan');
    }

    // 2. Validasi keharusan departemen untuk pengguna dan admin
    if (dto.role === Role.pengguna || dto.role === Role.admin) {
      if (!dto.departmentId) {
        throw new BadRequestException(
          'Departemen wajib diisi untuk peran pengguna dan admin',
        );
      }
    }

    // 3. Jika departmentId diisi, pastikan departemen valid dan aktif
    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept || dept.deletedAt !== null) {
        throw new BadRequestException(
          'Departemen tidak ditemukan atau telah dihapus',
        );
      }
    }

    // 4. Generate atau hash kata sandi awal
    let initialPassword: string | null = null;
    let rawPasswordToHash = dto.password;

    if (!rawPasswordToHash) {
      initialPassword = this.generateSecurePassword(16);
      rawPasswordToHash = initialPassword;
    }

    const passwordHash = await argon2.hash(rawPasswordToHash);

    // 5. Simpan pengguna ke database
    const createdUser = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: dto.role,
        departmentId: dto.departmentId ?? null,
        jobTitle: dto.jobTitle ? dto.jobTitle.trim() : null,
        isActive: true,
      },
      select: USER_SELECT,
    });

    // 6. Catat log audit (tanpa password/passwordHash)
    await this.auditLogger.log({
      userId: currentUserId,
      action: 'CREATE_USER',
      module: 'USER_MANAGEMENT',
      entityId: createdUser.id,
      beforeData: null,
      afterData: createdUser,
      ipAddress: ip,
    });

    // 7. Jika password acak dibuat otomatis, kembalikan hanya sekali saat response pembuatan
    if (initialPassword) {
      return {
        ...createdUser,
        initialPassword,
      };
    }

    return createdUser;
  }

  async findAll(query: UserQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (!query.includeDeleted) {
      where.deletedAt = null;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search && query.search.trim() !== '') {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user || user.deletedAt !== null) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
    ip: string,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.deletedAt !== null) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    // Aturan keamanan 1: Super admin tidak boleh menurunkan perannya sendiri
    if (
      targetUser.id === currentUserId &&
      dto.role &&
      dto.role !== Role.super_admin
    ) {
      throw new BadRequestException(
        'Super admin tidak dapat menurunkan peran dirinya sendiri',
      );
    }

    // Aturan keamanan 2: Tidak boleh menurunkan super_admin terakhir yang aktif
    if (
      targetUser.role === Role.super_admin &&
      dto.role &&
      dto.role !== Role.super_admin
    ) {
      const activeSuperAdminCount = await this.prisma.user.count({
        where: {
          role: Role.super_admin,
          isActive: true,
          deletedAt: null,
        },
      });

      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
          'Tidak dapat menurunkan peran super_admin terakhir yang aktif',
        );
      }
    }

    // Aturan keamanan 3: Super admin tidak boleh menonaktifkan dirinya sendiri
    if (targetUser.id === currentUserId && dto.isActive === false) {
      throw new BadRequestException(
        'Super admin tidak dapat menonaktifkan akun dirinya sendiri',
      );
    }

    // Aturan keamanan 4: Tidak boleh menonaktifkan super_admin terakhir yang aktif
    if (targetUser.role === Role.super_admin && dto.isActive === false) {
      const activeSuperAdminCount = await this.prisma.user.count({
        where: {
          role: Role.super_admin,
          isActive: true,
          deletedAt: null,
        },
      });

      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
          'Tidak dapat menonaktifkan super_admin terakhir yang aktif',
        );
      }
    }

    // Validasi email jika diubah
    let normalizedEmail: string | undefined = undefined;
    if (dto.email) {
      normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== targetUser.email) {
        const existing = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing) {
          throw new ConflictException('Email sudah digunakan');
        }
      }
    }

    // Validasi departemen berdasarkan peran efektif
    const effectiveRole = dto.role ?? targetUser.role;
    const effectiveDept =
      dto.departmentId !== undefined
        ? dto.departmentId
        : targetUser.departmentId;

    if (effectiveRole === Role.pengguna || effectiveRole === Role.admin) {
      if (!effectiveDept) {
        throw new BadRequestException(
          'Departemen wajib diisi untuk peran pengguna dan admin',
        );
      }
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept || dept.deletedAt !== null) {
        throw new BadRequestException(
          'Departemen tidak ditemukan atau telah dihapus',
        );
      }
    }

    // Siapkan data update
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.departmentId !== undefined)
      updateData.departmentId = dto.departmentId;
    if (dto.jobTitle !== undefined)
      updateData.jobTitle = dto.jobTitle?.trim() ?? null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.password) {
      updateData.passwordHash = await argon2.hash(dto.password);
    }

    // Aturan keamanan: Mengubah peran atau menonaktifkan akun mencabut refresh token akun itu
    const shouldRevokeTokens =
      (dto.role !== undefined && dto.role !== targetUser.role) ||
      (dto.isActive === false && targetUser.isActive === true) ||
      dto.password !== undefined;

    if (shouldRevokeTokens) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: targetUser.id },
      });
    }

    const beforeData = {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      departmentId: targetUser.departmentId,
      jobTitle: targetUser.jobTitle,
      isActive: targetUser.isActive,
    };

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'UPDATE_USER',
      module: 'USER_MANAGEMENT',
      entityId: updatedUser.id,
      beforeData,
      afterData: updatedUser,
      ipAddress: ip,
    });

    return updatedUser;
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    currentUserId: string,
    ip: string,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.deletedAt !== null) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (targetUser.id === currentUserId && dto.isActive === false) {
      throw new BadRequestException(
        'Super admin tidak dapat menonaktifkan akun dirinya sendiri',
      );
    }

    if (targetUser.role === Role.super_admin && dto.isActive === false) {
      const activeSuperAdminCount = await this.prisma.user.count({
        where: {
          role: Role.super_admin,
          isActive: true,
          deletedAt: null,
        },
      });

      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
          'Tidak dapat menonaktifkan super_admin terakhir yang aktif',
        );
      }
    }

    if (dto.isActive === false && targetUser.isActive === true) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: targetUser.id },
      });
    }

    const beforeData = {
      id: targetUser.id,
      isActive: targetUser.isActive,
    };

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: USER_SELECT,
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: dto.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      module: 'USER_MANAGEMENT',
      entityId: updatedUser.id,
      beforeData,
      afterData: { id: updatedUser.id, isActive: updatedUser.isActive },
      ipAddress: ip,
    });

    return updatedUser;
  }

  async remove(id: string, currentUserId: string, ip: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.deletedAt !== null) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    // Aturan keamanan 1: Super admin tidak boleh menghapus dirinya sendiri
    if (targetUser.id === currentUserId) {
      throw new BadRequestException(
        'Super admin tidak dapat menghapus akun dirinya sendiri',
      );
    }

    // Aturan keamanan 2: Tidak boleh menghapus super_admin terakhir yang aktif
    if (targetUser.role === Role.super_admin) {
      const activeSuperAdminCount = await this.prisma.user.count({
        where: {
          role: Role.super_admin,
          isActive: true,
          deletedAt: null,
        },
      });

      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
          'Tidak dapat menghapus super_admin terakhir yang aktif',
        );
      }
    }

    // Soft delete: set deletedAt dan isActive = false
    const beforeData = {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      deletedAt: targetUser.deletedAt,
      isActive: targetUser.isActive,
    };

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: USER_SELECT,
    });

    // Cabut seluruh refresh token
    await this.prisma.refreshToken.deleteMany({
      where: { userId: targetUser.id },
    });

    await this.auditLogger.log({
      userId: currentUserId,
      action: 'SOFT_DELETE_USER',
      module: 'USER_MANAGEMENT',
      entityId: updatedUser.id,
      beforeData,
      afterData: {
        id: updatedUser.id,
        deletedAt: updatedUser.deletedAt,
        isActive: updatedUser.isActive,
      },
      ipAddress: ip,
    });

    return {
      message: 'Pengguna berhasil dihapus secara aman (soft delete)',
      id: updatedUser.id,
    };
  }

  async resetPassword(id: string, currentUserId: string, ip: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser || targetUser.deletedAt !== null) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    // 1. Buat password sementara acak 16 karakter
    const temporaryPassword = this.generateSecurePassword(16);
    const passwordHash = await argon2.hash(temporaryPassword);

    // 2. Simpan passwordHash baru dan set mustChangePassword = true
    const beforeData = {
      id: targetUser.id,
      mustChangePassword: targetUser.mustChangePassword,
    };

    await this.prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    // 3. Cabut semua refresh token milik pengguna itu
    await this.prisma.refreshToken.deleteMany({
      where: { userId: targetUser.id },
    });

    // 4. Catat log aktivitas (JANGAN PERNAH menyimpan atau mencatat password di log!)
    await this.auditLogger.log({
      userId: currentUserId,
      action: 'RESET_PASSWORD',
      module: 'USER_MANAGEMENT',
      entityId: targetUser.id,
      beforeData,
      afterData: {
        userId: targetUser.id,
        email: targetUser.email,
        mustChangePassword: true,
      },
      ipAddress: ip,
    });

    // 5. Kembalikan respons dengan temporaryPassword SEKALI di respons
    return {
      message:
        'Kata sandi sementara berhasil dibuat. Pengguna wajib mengganti kata sandi saat pertama kali masuk.',
      userId: targetUser.id,
      temporaryPassword,
      mustChangePassword: true,
    };
  }
}
