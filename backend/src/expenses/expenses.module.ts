import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';
import { LocalStorageService } from '../tasks/storage/local-storage.service';
import { STORAGE_SERVICE } from '../tasks/storage/storage.interface';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [PrismaModule, AuthModule, SuperAdminModule],
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    LocalStorageService,
    {
      provide: STORAGE_SERVICE,
      useClass: LocalStorageService,
    },
  ],
  exports: [ExpensesService],
})
export class ExpensesModule {}
