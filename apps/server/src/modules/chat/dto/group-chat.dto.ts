import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from './send-message.dto.js';

export class CreateGroupDto {
  @IsString({ message: 'Tên nhóm phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên nhóm không được để trống' })
  @MinLength(2, { message: 'Tên nhóm phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên nhóm tối đa 100 ký tự' })
  name: string;

  @IsArray({ message: 'Danh sách thành viên phải là mảng' })
  @ArrayMinSize(2, { message: 'Nhóm chat cần ít nhất 2 thành viên khác' })
  @IsMongoId({ each: true, message: 'ID thành viên không hợp lệ' })
  memberIds: string[];

  @IsString({ message: 'URL ảnh đại diện nhóm phải là chuỗi' })
  @IsOptional()
  avatar?: string;
}

export class UpdateGroupDto {
  @IsString({ message: 'Tên nhóm phải là chuỗi ký tự' })
  @IsOptional()
  @MinLength(2, { message: 'Tên nhóm phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Tên nhóm tối đa 100 ký tự' })
  name?: string;

  @IsString({ message: 'URL ảnh đại diện nhóm phải là chuỗi' })
  @IsOptional()
  avatar?: string;
}

export class AddGroupMembersDto {
  @IsArray({ message: 'Danh sách thành viên phải là mảng' })
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 thành viên để thêm' })
  @IsMongoId({ each: true, message: 'ID thành viên không hợp lệ' })
  memberIds: string[];
}

export class SendGroupMessageDto {
  @IsMongoId({ message: 'ID cuộc trò chuyện không hợp lệ' })
  @IsNotEmpty({ message: 'conversationId là bắt buộc' })
  conversationId: string;

  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @MaxLength(5000, { message: 'Tin nhắn không được vượt quá 5000 ký tự' })
  text: string;

  @IsString()
  @IsOptional()
  type?: 'text' | 'location';

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;
}

