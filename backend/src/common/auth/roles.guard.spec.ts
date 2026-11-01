import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { isAdminEmail, resolveEffectiveRole } from './admin.util.js';

function makeContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('admin.util', () => {
  const oldEnv = process.env;
  beforeEach(() => {
    process.env = { ...oldEnv, ADMIN_EMAILS: ' Boss@Example.com , ops@example.com ' };
  });
  afterEach(() => {
    process.env = oldEnv;
  });

  it('so khớp ADMIN_EMAILS không phân biệt hoa thường và khoảng trắng', () => {
    expect(isAdminEmail('boss@example.com')).toBe(true);
    expect(isAdminEmail('OPS@example.com')).toBe(true);
    expect(isAdminEmail('user@example.com')).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('không coi chuỗi rỗng là admin khi ADMIN_EMAILS trống', () => {
    process.env.ADMIN_EMAILS = '';
    expect(isAdminEmail('')).toBe(false);
  });

  it('resolveEffectiveRole nâng quyền theo ADMIN_EMAILS, giữ nguyên role admin trong DB', () => {
    expect(resolveEffectiveRole({ email: 'boss@example.com', role: 'user' })).toBe('admin');
    expect(resolveEffectiveRole({ email: 'x@example.com', role: 'admin' })).toBe('admin');
    expect(resolveEffectiveRole({ email: 'x@example.com', role: 'user' })).toBe('user');
    expect(resolveEffectiveRole({ email: 'x@example.com' })).toBe('user');
  });
});

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('cho qua khi route không yêu cầu role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('cho admin qua route @Roles("admin")', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(makeContext({ role: 'admin' }))).toBe(true);
  });

  it('[abuse] chặn user thường truy cập route admin', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(() => guard.canActivate(makeContext({ role: 'user' }))).toThrow(ForbiddenException);
  });

  it('[abuse] chặn khi chưa xác thực (không có req.user)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
