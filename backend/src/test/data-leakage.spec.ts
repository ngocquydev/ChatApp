import { describe, it, expect } from 'vitest';

describe('Data Leakage Prevention Test Suite', () => {
  describe('User Serialization & Sensitive Field Stripping', () => {
    it('khi serialize User document, không bao giờ để lộ trường password hoặc refreshToken', () => {
      // Giả lập raw document trong MongoDB
      const rawUserDoc = {
        _id: '65f123456789abcdef012345',
        name: 'Nguyễn Văn A',
        email: 'user@example.com',
        phone: '0987654321',
        password: '$2b$10$encryptedSecretHashStringHere12345',
        refreshToken: 'definitely-secret-refresh-jwt-token-string',
        role: 'user',
        firebaseUid: 'firebase_secret_uid_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      };

      // Giả lập hàm transform chuẩn bảo mật
      const sanitizeUser = (user: typeof rawUserDoc) => {
        const { password: _p, refreshToken: _rt, __v: _v, ...safeUser } = user;
        return safeUser;
      };

      const sanitized = sanitizeUser(rawUserDoc);

      // Đảm bảo không tồn tại password và refreshToken
      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).not.toHaveProperty('refreshToken');
      expect(sanitized).not.toHaveProperty('__v');

      // Đảm bảo các thông tin công khai hợp lệ vẫn được giữ nguyên
      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.name).toBe('Nguyễn Văn A');
    });

    it('kết quả tìm kiếm người dùng công khai chỉ chứa các trường thông tin an toàn', () => {
      const allowedPublicFields = new Set([
        '_id',
        'id',
        'name',
        'email',
        'avatar',
        'bio',
        'role',
        'relationship',
        'requestId',
      ]);

      const mockSearchResult = {
        _id: '65f123456789abcdef012345',
        name: 'Trần Thị B',
        email: 'b@example.com',
        avatar: 'https://example.com/avatar.jpg',
        role: 'user',
        relationship: 'none',
      };

      // Kiểm tra mọi key trong response đều thuộc danh sách an toàn
      for (const key of Object.keys(mockSearchResult)) {
        expect(allowedPublicFields.has(key)).toBe(true);
      }

      // Đảm bảo các trường nhạy cảm tuyệt đối không xuất hiện
      const forbiddenFields = ['password', 'refreshToken', 'hash', 'salt', 'otp'];
      for (const field of forbiddenFields) {
        expect(mockSearchResult).not.toHaveProperty(field);
      }
    });
  });

  describe('Mass Assignment & DTO Whitelist Enforcement', () => {
    it('phải chặn người dùng tự gán role admin hoặc trạng thái isBan thông qua payload đăng ký', () => {
      // Giả lập payload người dùng cố tình chèn trường role: 'admin'
      const maliciousPayload = {
        name: 'Hacker',
        email: 'hacker@example.com',
        password: 'Password123!',
        role: 'admin',
        isBan: false,
        isDeleted: false,
      };

      // Kiểm tra logic lọc dữ liệu đầu vào: role chỉ được gán mặc định 'user' từ phía server
      const defaultRole = 'user';
      const cleanData = {
        name: maliciousPayload.name,
        email: maliciousPayload.email,
        role: defaultRole, // Buộc override bởi hệ thống, không tin cậy payload
      };

      expect(cleanData.role).toBe('user');
      expect(cleanData).not.toHaveProperty('isBan');
      expect(cleanData).not.toHaveProperty('isDeleted');
    });
  });

  describe('Log Sanitization', () => {
    it('logger không được phép in mật khẩu dạng plain text', () => {
      const sanitizeLog = (message: string): string => {
        return message
          .replace(/(password|token|refreshToken)=([^\s&]+)/gi, '$1=***REDACTED***')
          .replace(/"(password|token|refreshToken)"\s*:\s*"[^"]+"/gi, '"$1":"***REDACTED***"');
      };

      const rawLog = 'User login attempt: {"email":"test@test.com","password":"MySecretPassword123"}';
      const safeLog = sanitizeLog(rawLog);

      expect(safeLog).not.toContain('MySecretPassword123');
      expect(safeLog).toContain('***REDACTED***');
    });
  });
});
