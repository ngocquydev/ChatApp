import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateCommunityGroupDto {
  @IsString({ message: 'Tên nhóm phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên nhóm không được để trống' })
  @Length(2, 100, { message: 'Tên nhóm phải từ 2 đến 100 ký tự' })
  name: string;

  @IsString({ message: 'Slug phải là chuỗi' })
  @IsNotEmpty({ message: 'Đường dẫn (slug) không được để trống' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang',
  })
  slug: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  @Length(0, 1000, { message: 'Mô tả tối đa 1000 ký tự' })
  description?: string;

  @IsOptional()
  @IsIn(['public', 'private'], { message: 'Quyền riêng tư phải là public hoặc private' })
  privacy?: 'public' | 'private';

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  requireJoinReason?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  joinQuestion?: string;
}

export class UpdateCommunityGroupDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsIn(['public', 'private'])
  privacy?: 'public' | 'private';

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  requireJoinReason?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 300)
  joinQuestion?: string;
}

export class JoinGroupDto {
  @IsOptional()
  @IsString()
  @Length(0, 500)
  reason?: string;
}

export class SetDeputyDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsBoolean()
  canRemoveMembers?: boolean;

  @IsOptional()
  @IsBoolean()
  canMuteComments?: boolean;

  @IsOptional()
  @IsBoolean()
  canBlockPosting?: boolean;
}

export class ToggleMuteCommentsDto {
  @IsBoolean()
  muted: boolean;
}

export class ToggleBlockPostingDto {
  @IsBoolean()
  blocked: boolean;
}

