import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as zlib from 'node:zlib';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { BackupFileInfo, BackupListResponse } from './backup.interface.js';

const execAsync = promisify(exec);

export const RETENTION_DAYS = 7;
export const MAX_RETAINED_BACKUPS = 10;

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private backupTimer: NodeJS.Timeout | null = null;
  private readonly backupDir: string;

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  onModuleInit(): void {
    this.scheduleNextBackup();
    this.cleanExpiredBackups().catch((err) => {
      this.logger.warn(`Dọn dẹp bản sao lưu cũ thất bại: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  onModuleDestroy(): void {
    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
      this.backupTimer = null;
    }
  }

  /**
   * Tính toán thời gian (ms) còn lại đến 17:00 (5:00 PM) theo giờ Việt Nam (UTC+7)
   */
  public getNextScheduledTime(): Date {
    const now = new Date();
    // 17:00 hàng ngày theo giờ Việt Nam (UTC+7) tương ứng với 10:00 UTC
    const target = new Date(now);
    target.setUTCHours(10, 0, 0, 0);

    // Nếu thời điểm hiện tại đã qua 10:00 UTC (17:00 VN), chuyển sang ngày tiếp theo
    if (now.getTime() >= target.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    return target;
  }

  /**
   * Thiết lập hẹn giờ tự động sao lưu lúc 17:00 hàng ngày
   */
  public scheduleNextBackup(): void {
    const nextTime = this.getNextScheduledTime();
    const delayMs = Math.max(1000, nextTime.getTime() - Date.now());

    this.logger.log(
      `[Auto Backup] Đã lên lịch sao lưu tự động tiếp theo: ${nextTime.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      })} (sau ${Math.round(delayMs / 1000 / 60)} phút)`,
    );

    if (this.backupTimer) {
      clearTimeout(this.backupTimer);
    }

    this.backupTimer = setTimeout(async () => {
      try {
        this.logger.log('⏰ [Auto Backup] Đang thực thi sao lưu định kỳ lúc 17:00...');
        await this.createBackup('scheduled', 'system_scheduler');
        this.logger.log('✅ [Auto Backup] Sao lưu định kỳ 17:00 hoàn tất thành công!');
      } catch (err: unknown) {
        this.logger.error(
          `❌ [Auto Backup] Sao lưu định kỳ 17:00 thất bại: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } finally {
        this.scheduleNextBackup();
      }
    }, delayMs);

    this.backupTimer.unref();
  }

  /**
   * Tạo bản sao lưu mới (hỗ trợ mongodump qua Docker container hoặc native Mongoose streaming)
   */
  async createBackup(
    trigger: 'manual' | 'scheduled' = 'manual',
    requestedBy = 'admin',
  ): Promise<BackupFileInfo> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_');
    const filename = `backup_chatapp_${timestamp}.archive.gz`;
    const targetPath = path.join(this.backupDir, filename);

    let createdSuccess = false;

    // 1. Thử dùng mongodump qua Docker container 'chat_mongo' (Tốc độ C++ nhanh nhất)
    try {
      const containerTmpPath = `/tmp/${filename}`;
      await execAsync(
        `docker exec chat_mongo mongodump --db=chatapp --archive=${containerTmpPath} --gzip`,
      );
      await execAsync(`docker cp chat_mongo:${containerTmpPath} "${targetPath}"`);
      await execAsync(`docker exec chat_mongo rm -f ${containerTmpPath}`);
      createdSuccess = true;
      this.logger.log(`Tạo bản sao lưu thành công qua Docker mongodump: ${filename}`);
    } catch (dockerErr: unknown) {
      this.logger.warn(
        `Docker mongodump không khả dụng, chuyển sang chế độ Native Mongoose: ${
          dockerErr instanceof Error ? dockerErr.message : String(dockerErr)
        }`,
      );
    }

    // 2. Fallback sang Native Mongoose Dump nếu Docker không khả dụng
    if (!createdSuccess) {
      await this.nativeMongooseDump(targetPath);
      this.logger.log(`Tạo bản sao lưu thành công qua Native Mongoose Dump: ${filename}`);
    }

    // 3. Tính toán kích thước và mã SHA256 checksum
    const stats = fs.statSync(targetPath);
    const sha256 = await this.calculateSha256(targetPath);

    const meta: BackupFileInfo = {
      filename,
      sizeBytes: stats.size,
      sizeFormatted: this.formatBytes(stats.size),
      createdAt: new Date().toISOString(),
      trigger,
      requestedBy,
      sha256,
      type: 'mongodb',
    };

    const metaPath = path.join(this.backupDir, `${filename}.meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    // 4. Dọn dẹp bản sao lưu cũ theo chính sách Retention
    await this.cleanExpiredBackups();

    return meta;
  }

  /**
   * Sao lưu trực tiếp tất cả collections qua Mongoose stream và nén Gzip (Zero dependency)
   */
  private async nativeMongooseDump(targetPath: string): Promise<void> {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu MongoDB để sao lưu');
    }

    const collections = await db.listCollections().toArray();
    const gzip = zlib.createGzip({ level: 9 });
    const output = fs.createWriteStream(targetPath);
    gzip.pipe(output);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      // Ghi header tên collection
      gzip.write(`###COLLECTION:${colName}###\n`);
      const cursor = db.collection(colName).find();

      for await (const doc of cursor) {
        gzip.write(JSON.stringify(doc) + '\n');
      }
    }

    gzip.end();

    await new Promise<void>((resolve, reject) => {
      output.on('finish', () => resolve());
      output.on('error', (err) => reject(err));
      gzip.on('error', (err) => reject(err));
    });
  }

  /**
   * Lấy danh sách toàn bộ các bản sao lưu hiện có kèm siêu dữ liệu
   */
  async listBackups(): Promise<BackupListResponse> {
    const files = fs.readdirSync(this.backupDir);
    const backupFiles = files.filter((f) => f.endsWith('.archive.gz'));

    const list: BackupFileInfo[] = [];

    for (const filename of backupFiles) {
      const fullPath = path.join(this.backupDir, filename);
      const metaPath = path.join(this.backupDir, `${filename}.meta.json`);

      if (fs.existsSync(metaPath)) {
        try {
          const content = fs.readFileSync(metaPath, 'utf-8');
          const meta = JSON.parse(content) as BackupFileInfo;
          list.push(meta);
          continue;
        } catch {
          // Bỏ qua lỗi đọc meta và tạo từ stat
        }
      }

      const stats = fs.statSync(fullPath);
      list.push({
        filename,
        sizeBytes: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        createdAt: stats.mtime.toISOString(),
        trigger: 'manual',
        requestedBy: 'unknown',
        type: 'mongodb',
      });
    }

    // Sắp xếp mới nhất lên đầu
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      backups: list,
      totalBackups: list.length,
      nextScheduledAt: this.getNextScheduledTime().toISOString(),
      retentionPolicyDays: RETENTION_DAYS,
    };
  }

  /**
   * Khôi phục CSDL từ bản sao lưu đã chọn
   */
  async restoreBackup(filename: string): Promise<{ success: boolean; message: string }> {
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.backupDir, safeFilename);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Bản sao lưu không tồn tại: ${safeFilename}`);
    }

    let restoredSuccess = false;

    // 1. Thử dùng mongorestore qua Docker container 'chat_mongo'
    try {
      const containerTmpPath = `/tmp/${safeFilename}`;
      await execAsync(`docker cp "${fullPath}" chat_mongo:${containerTmpPath}`);
      await execAsync(
        `docker exec chat_mongo mongorestore --db=chatapp --archive=${containerTmpPath} --gzip --drop`,
      );
      await execAsync(`docker exec chat_mongo rm -f ${containerTmpPath}`);
      restoredSuccess = true;
      this.logger.log(`Khôi phục thành công qua Docker mongorestore: ${safeFilename}`);
    } catch (dockerErr: unknown) {
      this.logger.warn(
        `Docker mongorestore không khả dụng, chuyển sang chế độ Native Mongoose: ${
          dockerErr instanceof Error ? dockerErr.message : String(dockerErr)
        }`,
      );
    }

    // 2. Fallback sang Native Mongoose Restore nếu file là dạng NDJSON
    if (!restoredSuccess) {
      await this.nativeMongooseRestore(fullPath);
      this.logger.log(`Khôi phục thành công qua Native Mongoose Restore: ${safeFilename}`);
    }

    return {
      success: true,
      message: `Khôi phục dữ liệu từ bản sao lưu ${safeFilename} thành công!`,
    };
  }

  /**
   * Khôi phục trực tiếp qua Mongoose từ stream Gzip
   */
  private async nativeMongooseRestore(fullPath: string): Promise<void> {
    const db = this.connection.db;
    if (!db) {
      throw new Error('Không thể kết nối cơ sở dữ liệu MongoDB để khôi phục');
    }

    const gunzip = zlib.createGunzip();
    const input = fs.createReadStream(fullPath);
    input.pipe(gunzip);

    let currentCollection = '';
    let batch: Record<string, unknown>[] = [];
    let leftover = '';

    const flushBatch = async () => {
      if (batch.length > 0 && currentCollection) {
        await db.collection(currentCollection).insertMany(batch);
        batch = [];
      }
    };

    gunzip.on('data', async (chunk: Buffer) => {
      const lines = (leftover + chunk.toString('utf-8')).split('\n');
      leftover = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('###COLLECTION:') && trimmed.endsWith('###')) {
          await flushBatch();
          currentCollection = trimmed.replace('###COLLECTION:', '').replace('###', '');
          await db.collection(currentCollection).deleteMany({});
        } else if (currentCollection) {
          try {
            const doc = JSON.parse(trimmed);
            batch.push(doc);
            if (batch.length >= 500) {
              await flushBatch();
            }
          } catch {
            // Bỏ qua dòng json lỗi
          }
        }
      }
    });

    await new Promise<void>((resolve, reject) => {
      gunzip.on('end', async () => {
        try {
          await flushBatch();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      gunzip.on('error', (err) => reject(err));
      input.on('error', (err) => reject(err));
    });
  }

  /**
   * Xóa bản sao lưu
   */
  async deleteBackup(filename: string): Promise<boolean> {
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.backupDir, safeFilename);
    const metaPath = path.join(this.backupDir, `${safeFilename}.meta.json`);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Bản sao lưu không tồn tại: ${safeFilename}`);
    }

    fs.unlinkSync(fullPath);
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    this.logger.log(`Đã xóa bản sao lưu: ${safeFilename}`);
    return true;
  }

  /**
   * Lấy đường dẫn tệp sao lưu để tải về (kèm kiểm tra an toàn)
   */
  getBackupFilePath(filename: string): string {
    const safeFilename = path.basename(filename);
    const fullPath = path.join(this.backupDir, safeFilename);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`Bản sao lưu không tồn tại: ${safeFilename}`);
    }

    return fullPath;
  }

  /**
   * Dọn dẹp bản sao lưu quá 7 ngày hoặc vượt quá số lượng tối đa (MAX_RETAINED_BACKUPS)
   */
  async cleanExpiredBackups(): Promise<number> {
    const { backups } = await this.listBackups();
    let deletedCount = 0;

    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 3600 * 1000;

    // 1. Xóa các bản sao lưu cũ hơn 7 ngày
    for (const b of backups) {
      const ageMs = now - new Date(b.createdAt).getTime();
      if (ageMs > maxAgeMs) {
        await this.deleteBackup(b.filename);
        deletedCount++;
      }
    }

    // 2. Nếu vẫn còn nhiều hơn MAX_RETAINED_BACKUPS (10), giữ lại 10 bản mới nhất và xóa phần còn lại
    const remaining = (await this.listBackups()).backups;
    if (remaining.length > MAX_RETAINED_BACKUPS) {
      const toDelete = remaining.slice(MAX_RETAINED_BACKUPS);
      for (const b of toDelete) {
        await this.deleteBackup(b.filename);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`[Retention] Đã tự động dọn dẹp ${deletedCount} bản sao lưu cũ hết hạn.`);
    }

    return deletedCount;
  }

  private calculateSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
