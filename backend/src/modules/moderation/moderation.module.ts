import { Module } from "@nestjs/common";
import { ModerationService } from "./moderation.service.js";

@Module({
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
