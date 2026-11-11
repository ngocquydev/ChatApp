import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const ENCODE_TIMEOUT_MS = 120_000;
let encoding = false;
type VideoFormat = 'mov' | 'matroska';
type VideoEncoder = (input: string, output: string, format: VideoFormat) => Promise<void>;

function videoFormat(buffer: Buffer): VideoFormat | null {
  if (buffer.length >= 12) {
    const box = buffer.subarray(4, 8).toString('ascii');
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (box === 'ftyp' && ['avif', 'avis', 'heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)) return null;
    if (['ftyp', 'moov', 'mdat', 'wide'].includes(box)) return 'mov';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'matroska';
  return null;
}

export function isSupportedPostVideo(buffer: Buffer): boolean {
  return videoFormat(buffer) !== null;
}

const encodeVideo: VideoEncoder = (input, output, format) => new Promise((resolve, reject) => {
  const args = [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-protocol_whitelist', 'file,pipe', '-threads', '2', '-filter_threads', '2', '-max_pixels', '16777216', '-f', format,
    ...(format === 'mov' ? ['-enable_drefs', '0'] : []),
    '-i', input, '-map', '0:V:0', '-map', '0:a:0?', '-sn', '-dn', '-map_metadata', '-1',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
    '-vf', "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-threads', '2',
    '-movflags', '+faststart', '-f', 'mp4', output,
  ];
  const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  let finished = false;
  let timedOut = false;
  let tooLarge = false;
  let diagnostics = '';
  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk: string) => {
    if (diagnostics.length < 8192) diagnostics += chunk.slice(0, 8192 - diagnostics.length);
  });
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, ENCODE_TIMEOUT_MS);
  const monitor = setInterval(() => {
    void stat(output).then((info) => {
      if (!finished && info.size > MAX_VIDEO_BYTES) { tooLarge = true; child.kill('SIGKILL'); }
    }).catch(() => {});
  }, 500);
  const finish = (error?: Error) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    clearInterval(monitor);
    if (error) reject(error); else resolve();
  };
  child.once('error', () => finish(new ServiceUnavailableException('Không thể chạy FFmpeg để xử lý video')));
  child.once('close', (code) => {
    if (timedOut) return finish(new ServiceUnavailableException('Xử lý video mất quá nhiều thời gian'));
    if (tooLarge) return finish(new BadRequestException('Video sau xử lý vượt quá 100MB'));
    if (code !== 0) {
      if (/unknown encoder|encoder .* not found|no space left/i.test(diagnostics)) {
        return finish(new ServiceUnavailableException('Bộ xử lý video chưa sẵn sàng'));
      }
      return finish(new BadRequestException('Video không hợp lệ hoặc không thể xử lý'));
    }
    finish();
  });
});

export async function optimizePostVideo(buffer: Buffer, encoder: VideoEncoder = encodeVideo): Promise<Buffer> {
  const format = videoFormat(buffer);
  if (!format || buffer.length > MAX_VIDEO_BYTES) throw new BadRequestException('Chỉ hỗ trợ video MP4, MOV hoặc WEBM tối đa 100MB');
  if (encoding) throw new ServiceUnavailableException('Máy chủ đang xử lý video khác, vui lòng thử lại');
  encoding = true;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), 'chatapp-video-'));
    const input = join(directory, 'source');
    const output = join(directory, 'optimized.mp4');
    await writeFile(input, buffer);
    await encoder(input, output, format);
    const info = await stat(output);
    if (info.size === 0 || info.size > MAX_VIDEO_BYTES) throw new BadRequestException('Video sau xử lý không hợp lệ hoặc vượt quá 100MB');
    return await readFile(output);
  } finally {
    try {
      if (directory) await rm(directory, { recursive: true, force: true });
    } finally {
      encoding = false;
    }
  }
}
