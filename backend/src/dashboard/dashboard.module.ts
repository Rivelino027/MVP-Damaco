import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LaborCostsModule } from '../labor-costs/labor-costs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule, AuthModule, LaborCostsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
