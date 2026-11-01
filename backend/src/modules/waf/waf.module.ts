import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { WafSettings, WafSettingsSchema } from './schemas/waf-settings.schema.js';
import { WafConfigService } from './waf-config.service.js';
import { WafEventsService } from './waf-events.service.js';
import { WafClearanceService } from './waf-clearance.service.js';
import { WafMiddleware } from './waf.middleware.js';
import { WafController } from './waf.controller.js';
import { WafAdminController } from './waf-admin.controller.js';
import { EdgeBanService } from './edge-ban.service.js';
import { CloudflareWafService } from './cloudflare/cloudflare-waf.service.js';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: WafSettings.name, schema: WafSettingsSchema }]),
  ],
  controllers: [WafController, WafAdminController],
  providers: [
    WafConfigService,
    WafEventsService,
    WafClearanceService,
    WafMiddleware,
    EdgeBanService,
    CloudflareWafService,
  ],
  exports: [WafConfigService, WafEventsService, WafClearanceService, WafMiddleware, EdgeBanService],
})
export class WafModule {}
