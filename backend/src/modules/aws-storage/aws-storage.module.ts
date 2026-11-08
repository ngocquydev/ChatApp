import { Module } from '@nestjs/common';
import { AwsRekognitionService } from './aws-rekognition.service.js';

@Module({
  providers: [AwsRekognitionService],
  exports: [AwsRekognitionService],
})
export class AwsStorageModule {}

