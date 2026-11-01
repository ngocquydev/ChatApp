import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SummarizeCommentsDto {
  @ApiProperty({ description: 'Mã bài viết cần tóm tắt bình luận' })
  @IsMongoId({ message: 'Mã bài viết (postId) không hợp lệ' })
  @IsNotEmpty({ message: 'Mã bài viết (postId) là bắt buộc' })
  @IsString({ message: 'Mã bài viết phải là chuỗi ký tự' })
  postId: string;
}

export class SummarizeChatDto {
  @ApiProperty({ description: 'Mã cuộc trò chuyện cần tóm tắt' })
  @IsMongoId({ message: 'Mã cuộc trò chuyện (conversationId) không hợp lệ' })
  @IsNotEmpty({ message: 'Mã cuộc trò chuyện (conversationId) là bắt buộc' })
  @IsString({ message: 'Mã cuộc trò chuyện phải là chuỗi ký tự' })
  conversationId: string;

  @ApiPropertyOptional({ description: 'Số lượng tin nhắn gần nhất cần tóm tắt (5 - 50)', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'limit phải là số' })
  @Min(5, { message: 'limit tối thiểu là 5' })
  @Max(50, { message: 'limit tối đa là 50' })
  limit?: number;
}

export class AskAuraDto {
  @ApiProperty({ description: 'Nội dung câu hỏi hoặc yêu cầu dành cho Aura Bot' })
  @IsNotEmpty({ message: 'Nội dung câu hỏi (prompt) không được để trống' })
  @IsString({ message: 'Nội dung câu hỏi phải là chuỗi ký tự' })
  prompt: string;

  @ApiPropertyOptional({ description: 'Mã cuộc trò chuyện để nạp ngữ cảnh gần nhất' })
  @IsOptional()
  @IsMongoId({ message: 'Mã cuộc trò chuyện không hợp lệ' })
  @IsString({ message: 'Mã cuộc trò chuyện phải là chuỗi ký tự' })
  conversationId?: string;
}
