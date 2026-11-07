import { Module } from '@nestjs/common';
import { AwsStorageService } from './aws-storage.service.js';
import { AwsRekognitionService } from './aws-rekognition.service.js';

@Module({
  providers: [AwsStorageService, AwsRekognitionService],
  exports: [AwsStorageService, AwsRekognitionService],
})
export class AwsStorageModule {}

