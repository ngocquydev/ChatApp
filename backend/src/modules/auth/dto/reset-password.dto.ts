import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'rst_abc123...',
    description: 'Mã token xác thực nhận được sau khi xác minh OTP thành công',
  })
  @IsNotEmpty({ message: 'Reset token không được để trống' })
  @IsString({ message: 'Reset token phải là chuỗi ký tự' })
  resetToken: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description:
      'Mật khẩu mới (tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)',
  })
  @IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu mới' })
  @MinLength(8, { message: 'Mật khẩu mới phải có ít nhất 8 ký tự' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=-])[A-Za-z\d@$!%*?&#^()_+=-]{8,}$/,
    {
      message:
        'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
    },
  )
  newPassword: string;
}
