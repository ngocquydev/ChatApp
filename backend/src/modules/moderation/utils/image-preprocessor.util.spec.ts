import { describe, it, expect } from 'vitest';
import {
  detectImageFormat,
  preprocessImageForModeration,
} from './image-preprocessor.util.js';
import omggif from 'omggif';

describe('image-preprocessor.util', () => {
  it('detectImageFormat: phát hiện đúng JPEG qua magic bytes', () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    expect(detectImageFormat(jpegHeader)).toBe('jpeg');
  });

  it('detectImageFormat: phát hiện đúng PNG qua magic bytes', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageFormat(pngHeader)).toBe('png');
  });

  it('detectImageFormat: phát hiện đúng GIF qua magic bytes', () => {
    const gifHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);
    expect(detectImageFormat(gifHeader)).toBe('gif');
  });

  it('detectImageFormat: trả về unknown khi buffer không hợp lệ', () => {
    const invalidHeader = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(detectImageFormat(invalidHeader)).toBe('unknown');
  });

  it('preprocessImageForModeration: giải mã và trích xuất frames từ ảnh GIF chuẩn', () => {
    // Tạo 1 tệp GIF hợp lệ kích thước 2x2 pixels bằng GifWriter
    const gifBuf = Buffer.alloc(1024);
    const writer = new omggif.GifWriter(gifBuf, 2, 2, { loop: 0 });
    const palette = [0x000000, 0xffffff]; // 0: đen, 1: trắng
    const pixels = Buffer.from([0, 1, 1, 0]);
    writer.addFrame(0, 0, 2, 2, pixels, { palette, delay: 10 });
    const finalLength = writer.end();
    const validGif = gifBuf.subarray(0, finalLength);

    const result = preprocessImageForModeration(validGif);
    expect(result.format).toBe('gif');
    expect(result.frames.length).toBeGreaterThan(0);
    expect(result.frames[0].width).toBe(2);
    expect(result.frames[0].height).toBe(2);
    expect(result.frames[0].rekognitionBuffer.length).toBeGreaterThan(0);
  });
});
