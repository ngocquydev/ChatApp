import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

/** Cùng cấu hình với ValidationPipe toàn cục trong main.ts */
async function validateLikeApp(body: Record<string, unknown>) {
  const dto = plainToInstance(CreateUserDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

const validBody = {
  name: 'Nguyễn Văn A',
  email: 'a@example.com',
  password: 'Abc@12345',
};

describe('CreateUserDto', () => {
  it('chấp nhận dữ liệu đăng ký hợp lệ', async () => {
    expect(await validateLikeApp(validBody)).toHaveLength(0);
  });

  it('[abuse] từ chối trường role do client gửi lên (chống tự nâng quyền admin)', async () => {
    const errors = await validateLikeApp({ ...validBody, role: 'admin' });
    expect(errors.map((e) => e.property)).toContain('role');
  });
});
