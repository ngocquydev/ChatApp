import { describe, it, expect } from 'vitest';
import { Mongoose } from 'mongoose';
import { UserSchema } from './user.entity.js';

// Mongoose riêng (không kết nối DB) để kiểm tra giá trị mặc định của schema
const mongoose = new Mongoose();
const UserModel = mongoose.model('UserSchemaSpec', UserSchema);

describe('UserSchema', () => {
  it('không tự tạo location thiếu tọa độ khi đăng ký (tránh lỗi 2dsphere "Can\'t extract geo keys")', () => {
    const doc = new UserModel({ name: 'Nguyễn Văn A', email: 'a@example.com' });
    expect(doc.toObject({ minimize: true }).location).toBeUndefined();
  });

  it('giữ nguyên location hợp lệ khi có tọa độ', () => {
    const doc = new UserModel({
      name: 'B',
      email: 'b@example.com',
      location: { type: 'Point', coordinates: [105.85, 21.03] },
    });
    expect(doc.toObject().location).toEqual({ type: 'Point', coordinates: [105.85, 21.03] });
  });
});

