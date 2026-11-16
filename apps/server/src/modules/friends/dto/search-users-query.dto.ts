import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SearchUsersQueryDto {
  @ApiPropertyOptional({ description: 'Từ khóa (tên hoặc email)', example: 'nguyen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'Số kết quả mỗi trang (1–50, mặc định 20)',
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Con trỏ phân trang: nextCursor của trang trước (infinite scroll)',
  })
  @IsOptional()
  @IsMongoId()
  after?: string;
}
