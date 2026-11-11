import { describe, expect, it, vi } from 'vitest';
import { writeFile, access, truncate } from 'node:fs/promises';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { optimizePostVideo } from './video-optimization.util.js';

const mp4 = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);

describe('optimizePostVideo', () => {
  it('encodes video and removes its temporary files', async () => {
    let tempInput = '';
    const encode = vi.fn(async (input: string, output: string, format: string) => {
      tempInput = input;
      expect(format).toBe('mov');
      await writeFile(output, Buffer.from('optimized'));
    });
    await expect(optimizePostVideo(mp4, encode)).resolves.toEqual(Buffer.from('optimized'));
    await expect(access(tempInput)).rejects.toThrow();
  });

  it('rejects files that are not recognized video containers', async () => {
    const encode = vi.fn();
    await expect(optimizePostVideo(Buffer.from('not video'), encode)).rejects.toBeInstanceOf(BadRequestException);
    expect(encode).not.toHaveBeenCalled();
  });

  it('does not treat an AVIF image as an MP4 video', async () => {
    const avif = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
    await expect(optimizePostVideo(avif, vi.fn())).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts WebM containers for encoding', async () => {
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]);
    const encode = vi.fn(async (_input: string, output: string, format: string) => {
      expect(format).toBe('matroska');
      await writeFile(output, Buffer.from('optimized'));
    });
    await optimizePostVideo(webm, encode);
    expect(encode).toHaveBeenCalledOnce();
  });

  it('cleans up after an encoding failure', async () => {
    let tempInput = '';
    const encode = vi.fn(async (input: string) => { tempInput = input; throw new Error('encoding failed'); });
    await expect(optimizePostVideo(mp4, encode)).rejects.toThrow('encoding failed');
    await expect(access(tempInput)).rejects.toThrow();
  });

  it('rejects an output larger than 100 MB without reading it into memory', async () => {
    let tempInput = '';
    const encode = vi.fn(async (input: string, output: string) => {
      tempInput = input;
      await writeFile(output, Buffer.from('x'));
      await truncate(output, 100 * 1024 * 1024 + 1);
    });
    await expect(optimizePostVideo(mp4, encode)).rejects.toBeInstanceOf(BadRequestException);
    await expect(access(tempInput)).rejects.toThrow();
  });

  it('rejects concurrent encoding when capacity is in use', async () => {
    let finish!: () => void;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    const pending = new Promise<void>((resolve) => { finish = resolve; });
    const encode = vi.fn(async (_input: string, output: string) => { started(); await pending; await writeFile(output, Buffer.from('ok')); });
    const first = optimizePostVideo(mp4, encode);
    await ready;
    await expect(optimizePostVideo(mp4, encode)).rejects.toBeInstanceOf(ServiceUnavailableException);
    finish();
    await first;
  });
});
