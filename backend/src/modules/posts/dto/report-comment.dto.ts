import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentReportDto {
  @ApiProperty({
    enum: ['group_admin', 'web_admin'],
    description: 'Đối tượng nhận báo cáo: quản trị viên nhóm (group_admin) hoặc admin web (web_admin)',
    example: 'group_admin',
  })
  @IsNotEmpty({ message: 'Vui lòng chọn đối tượng nhận báo cáo' })
  @IsIn(['group_admin', 'web_admin'], {
    message: 'Đối tượng nhận báo cáo chỉ có thể là group_admin hoặc web_admin',
  })
  target: 'group_admin' | 'web_admin';

  @ApiProperty({
    description: 'Lý do báo cáo vi phạm',
    example: 'harassment',
  })
  @IsNotEmpty({ message: 'Vui lòng cung cấp lý do báo cáo' })
  @IsString({ message: 'Lý do báo cáo phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Lý do báo cáo không quá 200 ký tự' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Chi tiết thêm về vi phạm',
    example: 'Người này liên tục có hành vi công kích cá nhân trong nhóm',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Nội dung chi tiết không quá 1000 ký tự' })
  details?: string;
}

export class ResolveCommentReportDto {
  @ApiProperty({
    enum: ['dismiss', 'delete_comment', 'mute_user', 'banned_posting', 'banned_user'],
    description: 'Hành động xử lý báo cáo vi phạm',
    example: 'delete_comment',
  })
  @IsNotEmpty({ message: 'Vui lòng chọn hành động xử lý' })
  @IsIn(['dismiss', 'delete_comment', 'mute_user', 'banned_posting', 'banned_user'], {
    message: 'Hành động xử lý không hợp lệ',
  })
  action: 'dismiss' | 'delete_comment' | 'mute_user' | 'banned_posting' | 'banned_user';

  @ApiPropertyOptional({
    description: 'Ghi chú xử lý của quản trị viên',
    example: 'Đã xóa bình luận do vi phạm quy tắc ứng xử của nhóm',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Ghi chú xử lý không quá 500 ký tự' })
  note?: string;
}

