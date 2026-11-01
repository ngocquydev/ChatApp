import { describe, it, expect } from 'vitest';
import { signClearance, verifyClearance } from './waf-clearance.util.js';

const SECRET = 'test-secret-that-is-long-enough-123456';
const NOW = 1_800_000_000_000;

describe('WAF clearance token', () => {
  it('xác minh được token còn hạn, đúng IP', () => {
    const token = signClearance('203.0.113.10', SECRET, 1800, NOW);
    expect(verifyClearance(token, '203.0.113.10', SECRET, NOW + 60_000)).toBe(true);
  });

  it('[abuse] từ chối token dùng từ IP khác', () => {
    const token = signClearance('203.0.113.10', SECRET, 1800, NOW);
    expect(verifyClearance(token, '198.51.100.1', SECRET, NOW)).toBe(false);
  });

  it('từ chối token hết hạn', () => {
    const token = signClearance('203.0.113.10', SECRET, 1800, NOW);
    expect(verifyClearance(token, '203.0.113.10', SECRET, NOW + 1801_000)).toBe(false);
  });

  it('[abuse] từ chối token bị sửa thời hạn hoặc ký bằng khóa khác', () => {
    const token = signClearance('203.0.113.10', SECRET, 1800, NOW);
    const [, sig] = token.split('.');
    const forgedExp = `${Math.floor(NOW / 1000) + 999_999}.${sig}`;
    expect(verifyClearance(forgedExp, '203.0.113.10', SECRET, NOW)).toBe(false);
    expect(verifyClearance(signClearance('203.0.113.10', 'other-secret-xxxxxxxxxxxxxxxxxxxxxx', 1800, NOW), '203.0.113.10', SECRET, NOW)).toBe(false);
  });

  it.each([undefined, '', 'abc', '123', '123.', '.sig', 'x.y.z'])('từ chối token sai định dạng %s', (token) => {
    expect(verifyClearance(token, '203.0.113.10', SECRET, NOW)).toBe(false);
  });
});
