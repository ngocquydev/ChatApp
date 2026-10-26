import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryProvider } from './cloudinary.provider.js';
import { CloudinaryService } from './cloudinary.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService, CloudinaryProvider],
})
export class CloudinaryModule {}
