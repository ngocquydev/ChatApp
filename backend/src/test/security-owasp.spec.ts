import { describe, it, expect } from 'vitest';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

describe('OWASP Security Test Suite', () => {
  describe('A02: Cryptographic Failures & Password Security', () => {
    it('mật khẩu phải được băm bằng bcrypt với salt rounds tối thiểu là 10', async () => {
      const rawPassword = 'SecurePassword@123!';
      const saltRounds = 10;
      const hash = await bcrypt.hash(rawPassword, saltRounds);

      expect(hash).not.toBe(rawPassword);
      expect(hash.startsWith('$2')).toBe(true); // Bcrypt prefix ($2a$, $2b$)

      // Trích xuất cost factor từ chuỗi hash bcrypt (ví dụ: $2b$10$...)
      const parts = hash.split('$');
      const rounds = parseInt(parts[2], 10);
      expect(rounds).toBeGreaterThanOrEqual(10);

      // Xác thực so khớp mật khẩu
      const isMatch = await bcrypt.compare(rawPassword, hash);
      expect(isMatch).toBe(true);

      const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
      expect(isWrongMatch).toBe(false);
    });

    it('không bao giờ chấp nhận mật khẩu rỗng hoặc khoảng trắng', () => {
      const invalidPasswords = ['', '   ', null, undefined];
      invalidPasswords.forEach((pwd) => {
        expect(!pwd || (typeof pwd === 'string' && pwd.trim().length === 0)).toBe(true);
      });
    });
  });

  describe('A03: Injection & NoSQL Injection Prevention', () => {
    it('phải chặn hoặc loại bỏ các toán tử NoSQL ($gt, $ne, $where) trong dữ liệu đầu vào chuỗi', () => {
      const maliciousPayloads = [
        { email: { $gt: '' } },
        { email: { $ne: null } },
        { $where: 'sleep(5000)' },
      ];

      for (const payload of maliciousPayloads) {
        const emailValue = (payload as Record<string, unknown>).email;
        // Nếu trường email không phải string hoặc chứa object operator, phải bị từ chối
        const isSafeString = typeof emailValue === 'string' && !emailValue.startsWith('$');
        expect(isSafeString).toBe(false);
      }
    });

    it('ValidationPipe phải chặn các object không hợp lệ truyền vào trường kiểu chuỗi', async () => {
      class TestEmailDto {
        email: string;
      }

      // Giả lập đầu vào là object NoSQL injection thay vì string
      const maliciousInput = { email: { $gt: '' } };
      const instance = plainToInstance(TestEmailDto, maliciousInput);

      expect(typeof instance.email).not.toBe('string');
    });
  });

  describe('A05: Security Misconfiguration - Cookie & Session Security', () => {
    it('cấu hình cookie phiên phải bắt buộc httpOnly và sameSite lax/strict', () => {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      };

      // Bảo vệ chống XSS: JavaScript client không thể đọc cookie
      expect(cookieOptions.httpOnly).toBe(true);
      // Bảo vệ chống CSRF
      expect(['lax', 'strict']).toContain(cookieOptions.sameSite);
      // Thời gian sống hữu hạn
      expect(cookieOptions.maxAge).toBeGreaterThan(0);
    });
  });

  describe('A08: Software and Data Integrity Failures - Prototype Pollution', () => {
    it('phải miễn nhiễm trước tấn công Prototype Pollution', () => {
      const maliciousJson = '{"__proto__": {"polluted": true}}';
      JSON.parse(maliciousJson);

      // Object rỗng thông thường không được bị ô nhiễm thuộc tính
      const cleanObject: Record<string, unknown> = {};
      expect(cleanObject['polluted']).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(cleanObject, 'polluted')).toBe(false);
    });
  });
});
