import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!context.getHandler()) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token otentikasi tidak ditemukan');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Token otentikasi tidak ditemukan');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token telah kedaluwarsa');
      }
      throw new UnauthorizedException('Token tidak valid');
    }

    // Pengecekan status akun aktif di database pada setiap request
    // Jika akun dinonaktifkan setelah token terbit, request langsung ditolak
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        departmentId: true,
        isActive: true,
        mustChangePassword: true,
        deletedAt: true,
      },
    });

    if (!user || !user.isActive || user.deletedAt !== null) {
      throw new ForbiddenException('Akun tidak aktif, hubungi administrator');
    }

    (request as any).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      mustChangePassword: user.mustChangePassword,
    };

    // Jika mustChangePassword = true, hanya /auth/change-password, /auth/me, dan /auth/logout yang boleh diakses
    if (user.mustChangePassword) {
      const fullPath = (
        (request.baseUrl || '') + (request.path || request.url || '')
      ).split('?')[0];

      const allowedPaths = [
        '/auth/change-password',
        '/auth/me',
        '/auth/logout',
      ];

      const isAllowed = allowedPaths.some(
        (allowed) =>
          fullPath === allowed ||
          fullPath === `${allowed}/` ||
          fullPath.endsWith(allowed),
      );

      if (!isAllowed) {
        throw new ForbiddenException(
          'Pengguna wajib mengganti kata sandi terlebih dahulu',
        );
      }
    }

    return true;
  }
}
