import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { DEFAULT_WAF_CONFIG } from '../waf.types.js';

/** Một document duy nhất (key = "global") chứa cấu hình WAF trong app */
@Schema({ collection: 'waf_settings', timestamps: true })
export class WafSettings {
  @Prop({ required: true, unique: true, default: 'global' })
  key: string;

  @Prop({ default: DEFAULT_WAF_CONFIG.enabled })
  enabled: boolean;

  @Prop({ default: DEFAULT_WAF_CONFIG.blockScanners })
  blockScanners: boolean;

  @Prop({ default: DEFAULT_WAF_CONFIG.blockBadUserAgents })
  blockBadUserAgents: boolean;

  @Prop({ default: DEFAULT_WAF_CONFIG.underAttack })
  underAttack: boolean;

  @Prop({ default: DEFAULT_WAF_CONFIG.challengeForeignAuth })
  challengeForeignAuth: boolean;

  @Prop({ type: [String], default: DEFAULT_WAF_CONFIG.allowedCountries })
  allowedCountries: string[];

  @Prop({ type: [String], default: [] })
  ipAllowlist: string[];

  @Prop({ type: [String], default: [] })
  ipBlocklist: string[];

  @Prop({ type: String, default: null })
  updatedBy: string | null;
}

export type WafSettingsDocument = HydratedDocument<WafSettings>;
export const WafSettingsSchema = SchemaFactory.createForClass(WafSettings);

