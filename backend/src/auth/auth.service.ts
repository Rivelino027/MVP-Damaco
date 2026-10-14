import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly rateLimiter: LoginRateLimiterService,
  ) {}

  async onModuleInit() {
    // Hash dummy yang di-generate saat startup untuk mitigasi timing attack
    this.dummyHash = await argon2.hash(
      'budgetflow_timing_attack_mitigation_secret',
    );
  }

  /**
   * Login pengguna dengan verifikasi argon2, pembatasan klien via header X-Client,
   * rate limit, mitigasi timing attack, pembaruan lastLoginAt, dan pencatatan activity_logs.
   */
  async login(dto: LoginDto, xClientHeader: string | undefined, ip: string) {
    // 1. Validasi keberadaan dan nilai header X-Client
    if (!xClientHeader) {
      throw new BadRequestException(
        'Header X-Client wajib disertakan (web atau mobile)',
      );
    }

    const client = xClientHeader.trim().toLowerCase();
    if (client !== 'web' && client !== 'mobile') {
      throw new BadRequestException(
        'Nilai header X-Client harus "web" atau "mobile"',
      );
    }

    // 2. Normalisasi email menjadi huruf kecil
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 3. Rate limiting (maks 5 percobaan per menit per kombinasi IP dan email)
    this.rateLimiter.check(ip, normalizedEmail);

    // 4. Cari pengguna di database
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 5. Mitigasi timing attack: jika email tidak ada, tetap jalankan argon2.verify
    if (!user) {
      await argon2.verify(this.dummyHash, dto.password).catch(() => false);

      await this.logActivity(null, 'LOGIN_FAILED', ip, {
        email: normalizedEmail,
        client,
        reason: 'INVALID_CREDENTIALS',
      });

      throw new UnauthorizedException('Email atau kata sandi salah');
    }

    // 6. Verifikasi kata sandi
    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      await this.logActivity(user.id, 'LOGIN_FAILED', ip, {
        email: normalizedEmail,
        client,
        reason: 'INVALID_CREDENTIALS',
      });

      throw new UnauthorizedException('Email atau kata sandi salah');
    }

    // 7. Cek status aktif akun
    if (!user.isActive || user.deletedAt !== null) {
      await this.logActivity(user.id, 'LOGIN_FAILED', ip, {
        email: normalizedEmail,
        client,
        reason: 'ACCOUNT_INACTIVE',
      });

      throw new ForbiddenException(
        'Akun tidak aktif, hubungi administrator',
      );
    }

    // 8. Pembatasan klien (web vs mobile)
    if (client === 'web' && user.role === Role.pengguna) {
      await this.logActivity(user.id, 'LOGIN_FAILED', ip, {
        email: normalizedEmail,
        client,
        reason: 'WEB_CLIENT_RESTRICTED_FOR_PENGGUNA',
      });

      throw new ForbiddenException(
        'Akun Pengguna tidak dapat masuk ke Web Admin',
      );
    }

    if (client === 'mobile' && user.role === Role.super_admin) {
      await this.logActivity(user.id, 'LOGIN_FAILED', ip, {
        email: normalizedEmail,
        client,
        reason: 'MOBILE_CLIENT_RESTRICTED_FOR_SUPER_ADMIN',
      });

      throw new ForbiddenException(
        'Akun Super Admin tidak dapat masuk ke aplikasi mobile',
      );
    }

    // 9. Login berhasil: perbarui lastLoginAt dan catat di activity_logs
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logActivity(user.id, 'LOGIN_SUCCESS', ip, {
      email: user.email,
      role: user.role,
      client,
    });

    // 10. Terbitkan Access Token (15 menit) dan Refresh Token acak (7 hari)
    const tokens = await this.generateTokens(user, client);

    return {
      ...tokens,
      mustChangePassword: user.mustChangePassword,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        jobTitle: user.jobTitle,
        avatarUrl: user.avatarUrl,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt,
      },
    };
  }

  /**
   * Rotasi refresh token: refresh token lama langsung dicabut dan tidak bisa dipakai lagi.
   */
  async refresh(dto: RefreshTokenDto) {
    const rawToken = dto.refreshToken.trim();
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    if (record.revokedAt !== null) {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau telah dicabut',
      );
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token telah kedaluwarsa');
    }

    if (!record.user || !record.user.isActive || record.user.deletedAt !== null) {
      throw new ForbiddenException(
        'Akun tidak aktif, hubungi administrator',
      );
    }

    // Cabut refresh token yang sedang dipakai (single-use rotation)
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    // Terbitkan token baru
    return this.generateTokens(record.user, record.deviceInfo ?? 'web');
  }

  /**
   * Logout: mencabut refresh token aktif.
   */
  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken.trim())
        .digest('hex');

      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    // Cabut juga seluruh refresh token milik pengguna yang masih aktif
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Berhasil keluar' };
  }

  /**
   * Mengambil profil diri pengguna yang sedang login.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      throw new ForbiddenException(
        'Akun tidak aktif, hubungi administrator',
      );
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name ?? null,
      jobTitle: user.jobTitle,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Mengganti kata sandi pengguna (semua peran) dan menghapus penanda mustChangePassword.
   */
  async changePassword(userId: string, dto: ChangePasswordDto, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      throw new ForbiddenException('Akun tidak aktif, hubungi administrator');
    }

    // 1. Verifikasi kecocokan kata sandi lama
    const isOldPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.oldPassword,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('Kata sandi lama tidak sesuai');
    }

    // 2. Validasi kata sandi baru tidak boleh sama dengan kata sandi lama
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'Kata sandi baru tidak boleh sama dengan kata sandi lama',
      );
    }

    const isSameAsCurrent = await argon2.verify(
      user.passwordHash,
      dto.newPassword,
    );
    if (isSameAsCurrent) {
      throw new BadRequestException(
        'Kata sandi baru tidak boleh sama dengan kata sandi saat ini',
      );
    }

    // 3. Hash kata sandi baru
    const passwordHash = await argon2.hash(dto.newPassword);

    // 4. Perbarui data pengguna dan hapus penanda mustChangePassword
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    // 5. Cabut seluruh refresh token pengguna itu
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    // 6. Catat log aktivitas (tanpa kata sandi)
    await this.logActivity(user.id, 'CHANGE_PASSWORD_SUCCESS', ip, {
      userId: user.id,
      email: user.email,
      mustChangePassword: false,
    });

    return {
      message: 'Kata sandi berhasil diperbarui',
      mustChangePassword: false,
    };
  }

  private async generateTokens(
    user: { id: string; email: string; role: Role; departmentId: string | null },
    deviceInfo: string,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '15m',
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawRefreshToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        deviceInfo,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  private async logActivity(
    userId: string | null,
    action: string,
    ip: string,
    afterData: Record<string, any>,
  ) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          module: 'AUTH',
          entityId: userId,
          afterData,
          ipAddress: ip,
        },
      });
    } catch (e) {
      // Menghindari kegagalan login karena log audit jika ada kendala non-kritis
      console.error('Gagal mencatat log aktivitas login:', e);
    }
  }
}
