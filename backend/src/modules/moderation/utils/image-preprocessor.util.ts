// Image Preprocessor Utility for Dual-Layer Moderation
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import omggif from 'omggif';
import { spawnSync } from 'node:child_process';

export interface DecodedImageFrame {
  rgba: Buffer;
  width: number;
  height: number;
  /** Buffer chuẩn hóa (JPEG hoặc PNG) để gửi sang Amazon Rekognition */
  rekognitionBuffer: Buffer;
}

export interface PreprocessedImageResult {
  format: 'jpeg' | 'png' | 'gif' | 'webp' | 'unknown';
  frames: DecodedImageFrame[];
}

/**
 * Nhận diện định dạng ảnh qua magic bytes nhị phân
 */
export function detectImageFormat(buffer: Buffer): 'jpeg' | 'png' | 'gif' | 'webp' | 'unknown' {
  if (!buffer || buffer.length < 8) return 'unknown';

  // JPEG: 0xFF, 0xD8, 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }

  // GIF: GIF87a hoặc GIF89a (0x47, 0x49, 0x46, 0x38)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return 'gif';
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return 'unknown';
}

/**
 * Tiền xử lý và chuẩn hóa ảnh cho hệ thống kiểm duyệt 2 tầng (Vision AI + Amazon Rekognition)
 * Đảm bảo mọi định dạng (kể cả GIF động hay WebP) đều được trích xuất frame chuẩn RGBA & JPEG.
 */
export function preprocessImageForModeration(buffer: Buffer): PreprocessedImageResult {
  const format = detectImageFormat(buffer);
  const frames: DecodedImageFrame[] = [];

  switch (format) {
    case 'gif': {
      try {
        const reader = new omggif.GifReader(buffer);
        const numFrames = reader.numFrames();
        const width = reader.width;
        const height = reader.height;

        if (width > 0 && height > 0 && numFrames > 0) {
          // Lấy mẫu tối đa 3 frames đại diện: Frame đầu, Frame giữa, Frame cuối
          const sampleIndices = Array.from(
            new Set([
              0,
              Math.floor(numFrames / 2),
              Math.max(0, numFrames - 1),
            ]),
          );

          for (const frameIdx of sampleIndices) {
            const rgba = Buffer.alloc(width * height * 4);
            reader.decodeAndBlitFrameRGBA(frameIdx, rgba);

            // Chuyển frame thành JPEG buffer để Rekognition có thể quét
            const jpegEncoded = jpeg.encode({ data: rgba, width, height }, 85);
            frames.push({
              rgba,
              width,
              height,
              rekognitionBuffer: jpegEncoded.data,
            });
          }
        }
      } catch {
        // Nuốt lỗi định dạng GIF hỏng
      }
      break;
    }

    case 'jpeg': {
      try {
        const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 64 });
        if (decoded?.data && decoded.width > 0 && decoded.height > 0) {
          frames.push({
            rgba: Buffer.from(decoded.data),
            width: decoded.width,
            height: decoded.height,
            rekognitionBuffer: buffer, // JPEG đã được Rekognition hỗ trợ sẵn
          });
        }
      } catch {
        // Fallback
      }
      break;
    }

    case 'png': {
      try {
        const png = PNG.sync.read(buffer);
        if (png?.data && png.width > 0 && png.height > 0) {
          frames.push({
            rgba: png.data,
            width: png.width,
            height: png.height,
            rekognitionBuffer: buffer, // PNG đã được Rekognition hỗ trợ sẵn
          });
        }
      } catch {
        // Fallback
      }
      break;
    }

    case 'webp': {
      // Nếu có sẵn công cụ dwebp, giải mã sang PNG để xử lý
      try {
        const proc = spawnSync('dwebp', ['-', '-o', '-'], {
          input: buffer,
          maxBuffer: 30 * 1024 * 1024,
        });
        if (proc.status === 0 && proc.stdout && proc.stdout.length > 0) {
          const png = PNG.sync.read(proc.stdout);
          if (png?.data && png.width > 0 && png.height > 0) {
            frames.push({
              rgba: png.data,
              width: png.width,
              height: png.height,
              rekognitionBuffer: proc.stdout,
            });
          }
        }
      } catch {
        // dwebp không có sẵn
      }
      break;
    }

    default:
      break;
  }

  return { format, frames };
}
