import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { optimizePostVideo } from './video-optimization.util.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

describe('video encoding process', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports an unavailable encoder without uploading the source', async () => {
    const child = Object.assign(new EventEmitter(), { kill: vi.fn() });
    vi.mocked(spawn).mockReturnValueOnce(child as unknown as ReturnType<typeof spawn>);
    const input = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
    const result = expect(optimizePostVideo(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    child.emit('error', new Error('ENOENT'));
    await result;
  });

  it('reports an unavailable encoder when FFmpeg lacks libx264', async () => {
    const stderr = Object.assign(new EventEmitter(), { setEncoding: vi.fn() });
    const child = Object.assign(new EventEmitter(), { kill: vi.fn(), stderr });
    vi.mocked(spawn).mockReturnValueOnce(child as unknown as ReturnType<typeof spawn>);
    const input = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
    const result = expect(optimizePostVideo(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    stderr.emit('data', "Unknown encoder 'libx264'");
    child.emit('close', 1);
    await result;
  });

  it('rejects malformed video when FFmpeg cannot decode it', async () => {
    const child = Object.assign(new EventEmitter(), { kill: vi.fn() });
    vi.mocked(spawn).mockReturnValueOnce(child as unknown as ReturnType<typeof spawn>);
    const input = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
    const result = expect(optimizePostVideo(input)).rejects.toBeInstanceOf(BadRequestException);
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce());
    child.emit('close', 1);
    await result;
  });
});
