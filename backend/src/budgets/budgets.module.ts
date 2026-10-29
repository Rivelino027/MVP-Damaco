import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LaborCostsModule } from '../labor-costs/labor-costs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { BudgetsService } from './budgets.service';
import { BudgetRequestsController } from './controllers/budget-requests.controller';
import { ProjectBudgetsController } from './controllers/project-budgets.controller';

@Module({
  imports: [PrismaModule, AuthModule, SuperAdminModule, LaborCostsModule, ProjectsModule],
  controllers: [BudgetRequestsController, ProjectBudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
