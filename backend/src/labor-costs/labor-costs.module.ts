import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { HourlyCostsController } from './controllers/hourly-costs.controller';
import { LaborCostsController } from './controllers/labor-costs.controller';
import { HourlyCostsService } from './services/hourly-costs.service';
import { LaborCostsService } from './services/labor-costs.service';

@Module({
  imports: [PrismaModule, AuthModule, SuperAdminModule],
  controllers: [HourlyCostsController, LaborCostsController],
  providers: [HourlyCostsService, LaborCostsService],
  exports: [HourlyCostsService, LaborCostsService],
})
export class LaborCostsModule {}
