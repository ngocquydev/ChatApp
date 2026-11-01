import { Module } from '@nestjs/common';
import { BackupService } from './backup.service.js';
import { BackupController } from './backup.controller.js';

@Module({
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
