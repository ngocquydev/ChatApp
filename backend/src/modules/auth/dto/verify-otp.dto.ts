import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email đã nhận mã OTP',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Định dạng email không hợp lệ' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Mã xác thực gồm 6 chữ số',
  })
  @IsNotEmpty({ message: 'Mã OTP không được để trống' })
  @IsString({ message: 'Mã OTP phải là chuỗi ký tự' })
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 chữ số' })
  @Matches(/^[0-9]{6}$/, { message: 'Mã OTP chỉ bao gồm 6 chữ số' })
  otp: string;
}
