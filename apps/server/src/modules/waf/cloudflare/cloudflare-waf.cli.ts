/**
 * CLI quản lý WAF trên Cloudflare (WAF-as-code).
 *   npm run cf:waf -- status
 *   npm run cf:waf -- apply
 *   npm run cf:waf -- under-attack on|off
 *   npm run cf:waf -- bot-fight on|off
 *   npm run cf:waf -- ban <ip> [block|managed_challenge]
 *   npm run cf:waf -- unban <ruleId>
 * Đọc CLOUDFLARE_* từ backend/.env. Không bao giờ in token ra màn hình.
 */
import 'dotenv/config';
import { isIP } from 'node:net';
import { createCloudflareManager, readCloudflareEnv } from './cloudflare-waf.config.js';
import type { AccessRuleMode } from './cloudflare-api.client.js';

function parseOnOff(value: string | undefined): boolean {
  if (value === 'on') return true;
  if (value === 'off') return false;
  throw new Error('Giá trị phải là "on" hoặc "off".');
}

async function main(): Promise<void> {
  const [command, arg1, arg2] = process.argv.slice(2);
  const config = readCloudflareEnv();
  if (!config) {
    throw new Error('Thiếu CLOUDFLARE_API_TOKEN hoặc CLOUDFLARE_ZONE_ID trong backend/.env.');
  }

  // CLI không có Redis: tắt Under Attack sẽ về CLOUDFLARE_DEFAULT_SECURITY_LEVEL (mặc định medium)
  let previousLevel: string | null = process.env.CLOUDFLARE_DEFAULT_SECURITY_LEVEL?.trim() || null;
  const { client, manager } = createCloudflareManager(config, {
    get: () => Promise.resolve(previousLevel),
    set: (v: string) => {
      previousLevel = v;
      return Promise.resolve();
    },
  });

  switch (command) {
    case 'status': {
      const status = await manager.getStatus();
      console.log(JSON.stringify(status, null, 2));
      return;
    }
    case 'apply': {
      const result = await manager.syncRules();
      console.log(`Đã đồng bộ ${result.customRules} custom rule + ${result.rateLimitRules} rate limiting rule (giữ nguyên ${result.preservedUserRules} rule của bạn).`);
      return;
    }
    case 'under-attack': {
      const level = await manager.setUnderAttack(parseOnOff(arg1));
      console.log(`Security Level hiện tại: ${level}`);
      return;
    }
    case 'bot-fight': {
      const on = await manager.setBotFightMode(parseOnOff(arg1));
      console.log(`Bot Fight Mode: ${on ? 'BẬT' : 'TẮT'}`);
      return;
    }
    case 'ban': {
      if (!arg1 || isIP(arg1) === 0) throw new Error('Cần truyền một địa chỉ IP hợp lệ.');
      const mode = (arg2 as AccessRuleMode | undefined) ?? config.autoBanMode;
      const id = await client.createAccessRule(arg1, mode, 'chatapp-manual-ban (CLI)');
      console.log(`Đã tạo IP Access Rule ${id} (${mode}) cho ${arg1}.`);
      return;
    }
    case 'unban': {
      if (!arg1) throw new Error('Cần truyền ID của IP Access Rule.');
      await client.deleteAccessRule(arg1);
      console.log(`Đã xóa IP Access Rule ${arg1}.`);
      return;
    }
    default:
      console.log('Lệnh: status | apply | under-attack on|off | bot-fight on|off | ban <ip> [mode] | unban <ruleId>');
      process.exitCode = command ? 1 : 0;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

