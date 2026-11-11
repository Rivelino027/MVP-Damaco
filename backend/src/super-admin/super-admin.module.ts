import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivityLogsController } from './controllers/activity-logs.controller';
import { CostCentersController } from './controllers/cost-centers.controller';
import { DepartmentsController } from './controllers/departments.controller';
import { ExpenseCategoriesController } from './controllers/expense-categories.controller';
import { ProjectTypesController } from './controllers/project-types.controller';
import { UsersController } from './controllers/users.controller';
import { ActivityLogsService } from './services/activity-logs.service';
import { AuditLoggerService } from './services/audit-logger.service';
import { SuperAdminCostCentersService } from './services/super-admin-cost-centers.service';
import { SuperAdminDepartmentsService } from './services/super-admin-departments.service';
import { SuperAdminMasterDataService } from './services/super-admin-master-data.service';
import { SuperAdminUsersService } from './services/super-admin-users.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    UsersController,
    DepartmentsController,
    CostCentersController,
    ExpenseCategoriesController,
    ProjectTypesController,
    ActivityLogsController,
  ],
  providers: [
    AuditLoggerService,
    SuperAdminUsersService,
    SuperAdminDepartmentsService,
    SuperAdminCostCentersService,
    SuperAdminMasterDataService,
    ActivityLogsService,
  ],
  exports: [
    AuditLoggerService,
    SuperAdminUsersService,
    SuperAdminDepartmentsService,
    SuperAdminCostCentersService,
    SuperAdminMasterDataService,
    ActivityLogsService,
  ],
})
export class SuperAdminModule {}
