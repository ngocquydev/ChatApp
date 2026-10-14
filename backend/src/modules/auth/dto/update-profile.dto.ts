import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', description: 'Tên hiển thị' })
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  @MaxLength(60, { message: 'Tên không được vượt quá 60 ký tự' })
  name?: string;

  @ApiPropertyOptional({ example: '0987654321', description: 'Số điện thoại' })
  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://...', description: 'URL hoặc data ảnh đại diện' })
  @IsOptional()
  @IsString({ message: 'Ảnh đại diện phải là chuỗi ký tự' })
  avatar?: string;

  @ApiPropertyOptional({ example: 'Yêu thích lập trình và kết nối bạn bè', description: 'Tiểu sử' })
  @IsOptional()
  @IsString({ message: 'Tiểu sử phải là chuỗi ký tự' })
  @MaxLength(300, { message: 'Tiểu sử không được vượt quá 300 ký tự' })
  bio?: string;
}
