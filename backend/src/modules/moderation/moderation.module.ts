import { Module } from "@nestjs/common";
import { ModerationService } from "./moderation.service.js";
import { AwsStorageModule } from "../aws-storage/aws-storage.module.js";

@Module({
  imports: [AwsStorageModule],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
