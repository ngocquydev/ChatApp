import { Module } from '@nestjs/common';
import { ModerationModule } from '../moderation/moderation.module.js';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [ModerationModule],
  controllers: [UploadController],
})
export class UploadModule {}
