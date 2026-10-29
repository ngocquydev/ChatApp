import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { POST_PRIVACIES } from '../schemas/post.schema.js';
import type { PostPrivacy } from '../schemas/post.schema.js';

/** Chỉ nhận đường dẫn ảnh/video do Cloudinary hoặc chính endpoint upload sinh ra — chặn URL ngoài/đường dẫn tùy ý. */
export const POST_IMAGE_PATH_REGEX =
  /^(https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_\-./%]+|\/uploads\/posts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif))$/i;

export const POST_MAX_IMAGES = 4;

export class CreatePostDto {
  @ApiPropertyOptional({ description: 'Nội dung bài viết (tối đa 5000 ký tự)' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn ảnh đã tải lên qua POST /posts/images (tối đa 4)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(POST_MAX_IMAGES)
  @IsString({ each: true })
  @Matches(POST_IMAGE_PATH_REGEX, { each: true, message: 'Đường dẫn ảnh không hợp lệ' })
  images?: string[];

  @ApiPropertyOptional({ enum: POST_PRIVACIES, default: 'friends' })
  @IsOptional()
  @IsIn(POST_PRIVACIES as readonly string[])
  privacy?: PostPrivacy;
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: 'Nội dung bài viết (tối đa 5000 ký tự)' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn ảnh đã tải lên qua POST /posts/images (tối đa 4)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(POST_MAX_IMAGES)
  @IsString({ each: true })
  @Matches(POST_IMAGE_PATH_REGEX, { each: true, message: 'Đường dẫn ảnh không hợp lệ' })
  images?: string[];

  @ApiPropertyOptional({ enum: POST_PRIVACIES })
  @IsOptional()
  @IsIn(POST_PRIVACIES as readonly string[])
  privacy?: PostPrivacy;
}

export class SharePostDto {
  @ApiPropertyOptional({ description: 'Lời bình kèm theo khi chia sẻ lại' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ enum: POST_PRIVACIES, default: 'friends' })
  @IsOptional()
  @IsIn(POST_PRIVACIES as readonly string[])
  privacy?: PostPrivacy;
}

export class CreateCommentDto {
  @ApiPropertyOptional({ description: 'Nội dung bình luận (1–1000 ký tự)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn ảnh hoặc video đính kèm trong bình luận' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Loại tệp media (image hoặc video)', enum: ['image', 'video'] })
  @IsOptional()
  @IsIn(['image', 'video'])
  mediaType?: 'image' | 'video';
}

export class PageQueryDto {
  @ApiPropertyOptional({ description: 'Số mục mỗi trang (1–30, mặc định 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;

  @ApiPropertyOptional({ description: 'Con trỏ: nextCursor của trang trước' })
  @IsOptional()
  @IsMongoId()
  after?: string;
}

export class PhotosQueryDto {
  @ApiPropertyOptional({ description: 'Số ảnh tối đa (1–30, mặc định 9)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number;
}
