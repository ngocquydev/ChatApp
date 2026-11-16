import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const UPLOAD_ROOT = join(process.cwd(), 'uploads');
export const POST_UPLOAD_DIR = join(UPLOAD_ROOT, 'posts');
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type ImageExt = 'jpg' | 'png' | 'webp' | 'gif';

/**
 * Nhận diện ảnh bằng "magic bytes" thay vì tin MIME/đuôi file do client gửi
 * (client có thể giả mạo Content-Type để tải lên HTML/SVG chứa script).
 */
export function detectImageExt(buf: Buffer): ImageExt | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (buf.length >= 6) {
    const head = buf.subarray(0, 6).toString('ascii');
    if (head === 'GIF87a' || head === 'GIF89a') return 'gif';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/** Lưu ảnh bài viết với tên ngẫu nhiên; trả về đường dẫn công khai /uploads/posts/<uuid>.<ext>. */
export async function savePostImage(buf: Buffer | undefined): Promise<string> {
  if (!buf || buf.length === 0) {
    throw new BadRequestException('Chưa chọn ảnh để tải lên');
  }
  if (buf.length > POST_IMAGE_MAX_BYTES) {
    throw new BadRequestException('Ảnh vượt quá 5MB');
  }
  const ext = detectImageExt(buf);
  if (!ext) {
    throw new BadRequestException('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF');
  }
  await mkdir(POST_UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(join(POST_UPLOAD_DIR, name), buf);
  return `/uploads/posts/${name}`;
}
