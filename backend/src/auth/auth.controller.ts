import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Masuk akun dengan email dan kata sandi' })
  @ApiHeader({
    name: 'X-Client',
    description: 'Tipe klien pemanggil (web atau mobile)',
    required: true,
  })
  async login(
    @Body() dto: LoginDto,
    @Headers('x-client') xClient: string | undefined,
    @Ip() ip: string,
  ) {
    return this.authService.login(dto, xClient, ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotasi access token menggunakan refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Keluar dan mencabut refresh token' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: LogoutDto,
  ) {
    return this.authService.logout(userId, dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Melihat profil pengguna yang sedang login' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mengganti kata sandi akun pengguna (wajib login)',
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
  ) {
    return this.authService.changePassword(userId, dto, ip);
  }

  @Get('test-super-admin')
  @Roles(Role.super_admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Endpoint pengujian otorisasi khusus super_admin',
  })
  async testSuperAdminOnly() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Endpoint tidak ditemukan');
    }
    return {
      message: 'Akses diizinkan untuk peran super_admin',
    };
  }
}
