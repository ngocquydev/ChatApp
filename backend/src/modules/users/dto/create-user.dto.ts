import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ và tên người dùng' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  name: string;

  @ApiPropertyOptional({
    example: '0987654321',
    description: 'Số điện thoại (đúng 10 chữ số, chuẩn đầu số VN)',
  })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  @Matches(/^(03|05|07|08|09)\d{8}$/, {
    message:
      'Số điện thoại không hợp lệ (phải có đúng 10 chữ số và thuộc các đầu số 03, 05, 07, 08, 09)',
  })
  phone: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email đăng ký',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'Abc@12345',
    description:
      'Mật khẩu tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W]).{8,})/, {
    message:
      'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
  })
  password: string;

  @ApiPropertyOptional({
    example: 'user',
    description: 'Vai trò người dùng (user hoặc admin)',
  })
  @IsOptional()
  @IsString({ message: 'Role phải là chuỗi ký tự' })
  @IsIn(['user', 'admin'], { message: 'Role chỉ có thể là user hoặc admin' })
  role?: string;
}
