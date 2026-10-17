import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { ProjectMembersController } from './project-members.controller';
import { ProjectMembersService } from './project-members.service';
import { ProjectMilestonesController } from './project-milestones.controller';
import { ProjectMilestonesService } from './project-milestones.service';
import { ProjectPhasesController } from './project-phases.controller';
import { ProjectPhasesService } from './project-phases.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule, AuthModule, SuperAdminModule],
  controllers: [
    ProjectsController,
    ProjectMembersController,
    ProjectPhasesController,
    ProjectMilestonesController,
  ],
  providers: [
    ProjectsService,
    ProjectMembersService,
    ProjectPhasesService,
    ProjectMilestonesService,
  ],
  exports: [
    ProjectsService,
    ProjectMembersService,
    ProjectPhasesService,
    ProjectMilestonesService,
  ],
})
export class ProjectsModule {}
