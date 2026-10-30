import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    example: 'Đại học Bách Khoa',
    description: 'Trường học / Học vấn',
  })
  @IsOptional()
  @IsString({ message: 'Trường học phải là chuỗi ký tự' })
  @MaxLength(150, { message: 'Trường học không được vượt quá 150 ký tự' })
  school?: string;

  @ApiPropertyOptional({
    example: 'dating',
    description: 'Tình trạng mối quan hệ',
  })
  @IsOptional()
  @IsString({ message: 'Tình trạng mối quan hệ phải là chuỗi ký tự' })
  @IsIn(
    ['single', 'dating', 'engaged', 'married', 'complicated', 'separated', 'divorced', 'widowed', ''],
    { message: 'Tình trạng mối quan hệ không hợp lệ' },
  )
  relationshipStatus?: string;
}
