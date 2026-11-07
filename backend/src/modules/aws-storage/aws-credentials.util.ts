import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { Logger } from '@nestjs/common';
import type { AwsCredentialIdentity } from '@aws-sdk/types';

const logger = new Logger('AwsCredentialsUtil');

interface AwsLoginCacheFile {
  accessToken?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    accountId?: string;
    expiresAt: string;
  };
}

/**
 * Trình tải chứng thực AWS thích ứng đa nền tảng
 * Hỗ trợ:
 * 1. Biến môi trường tiêu chuẩn (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN)
 * 2. Đăng nhập "The New AWS Experience" (AWS CLI v2 login_session qua ~/.aws/login/cache/*.json)
 * 3. Tự động làm mới phiên thông qua `aws configure export-credentials` khi token hết hạn
 */
export function getAwsCredentials(): AwsCredentialIdentity | null {
  // 1. Biến môi trường
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }

  // 2. Tìm cache từ phiên đăng nhập New AWS Experience
  const candidateDirs = [
    '/root/.aws/login/cache',
    path.join(process.env.USERPROFILE || '', '.aws', 'login', 'cache'),
    path.join(process.env.HOME || '', '.aws', 'login', 'cache'),
  ];

  for (const cacheDir of candidateDirs) {
    if (cacheDir && fs.existsSync(cacheDir)) {
      try {
        const files = fs.readdirSync(cacheDir).filter((f) => f.endsWith('.json'));
        for (const file of files) {
          const filePath = path.join(cacheDir, file);
          const raw = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(raw) as AwsLoginCacheFile;

          if (data?.accessToken?.accessKeyId && data?.accessToken?.secretAccessKey) {
            const expTime = new Date(data.accessToken.expiresAt).getTime();
            // Nếu token còn hạn ít nhất 30 giây
            if (expTime - Date.now() > 30_000) {
              return {
                accessKeyId: data.accessToken.accessKeyId,
                secretAccessKey: data.accessToken.secretAccessKey,
                sessionToken: data.accessToken.sessionToken,
                expiration: new Date(expTime),
              };
            }
          }
        }
      } catch (err) {
        logger.debug(`Lỗi đọc AWS login cache tại ${cacheDir}: ${String(err)}`);
      }
    }
  }

  // 3. Nếu token đã hết hạn hoặc chưa có, tự động kích hoạt AWS CLI làm mới qua refreshToken
  try {
    const stdout = execSync('aws configure export-credentials --profile default', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(stdout.trim());
    if (parsed.AccessKeyId && parsed.SecretAccessKey) {
      return {
        accessKeyId: parsed.AccessKeyId,
        secretAccessKey: parsed.SecretAccessKey,
        sessionToken: parsed.SessionToken,
        expiration: parsed.Expiration ? new Date(parsed.Expiration) : undefined,
      };
    }
  } catch (err) {
    logger.debug(`Không thể làm mới credentials qua AWS CLI export-credentials: ${String(err)}`);
  }

  return null;
}
