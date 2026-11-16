import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAllowedOrigin, isAllowedCookieRequest } from './origin-policy.js';

afterEach(() => vi.unstubAllEnvs());

describe('origin policy', () => {
  it('accepts only configured origins in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', 'https://chat.example.com');
    vi.stubEnv('ADMIN_URL', '');
    vi.stubEnv('CORS_ORIGIN', '');
    expect(isAllowedOrigin('https://chat.example.com')).toBe(true);
    expect(isAllowedOrigin('https://attacker.vercel.app')).toBe(false);
    expect(isAllowedOrigin('http://localhost:5173')).toBe(false);
  });

  it('rejects cross-origin and originless cookie mutations', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('FRONTEND_URL', 'https://chat.example.com');
    vi.stubEnv('ADMIN_URL', '');
    vi.stubEnv('CORS_ORIGIN', '');
    expect(isAllowedCookieRequest('POST', 'https://attacker.vercel.app', true)).toBe(false);
    expect(isAllowedCookieRequest('POST', undefined, true)).toBe(false);
    expect(isAllowedCookieRequest('POST', 'https://chat.example.com', true)).toBe(true);
    expect(isAllowedCookieRequest('GET', undefined, true)).toBe(true);
    expect(isAllowedCookieRequest('POST', undefined, false)).toBe(true);
  });
});
