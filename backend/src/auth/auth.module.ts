import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginRateLimiterService } from './services/login-rate-limiter.service';
import { ScopeService } from './services/scope.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginRateLimiterService,
    ScopeService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    ScopeService,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
