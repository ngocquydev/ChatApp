import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatGateway } from './chat.gateway.js';

afterEach(() => vi.unstubAllEnvs());

describe('chat socket authentication', () => {
  it.each([
    { revoked: true, user: { isBan: false, isDeleted: false } },
    { revoked: false, user: { isBan: true, isDeleted: false } },
    { revoked: false, user: null },
  ])('disconnects revoked or inactive users: %j', async ({ revoked, user }) => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    const client = { handshake: { auth: { token: 'test-token' } }, disconnect: vi.fn(), join: vi.fn(), data: {} };
    const gateway = new ChatGateway(
      {} as never,
      { verifyAsync: vi.fn().mockResolvedValue({ sub: 'user-1' }) } as never,
      { isTokenBlacklisted: vi.fn().mockResolvedValue(revoked) } as never,
      undefined,
      undefined,
      { findById: vi.fn().mockResolvedValue(user) } as never,
    );
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });
});
