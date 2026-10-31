import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber({}, { message: 'Vĩ độ (latitude) phải là số' })
  latitude: number;

  @IsNumber({}, { message: 'Kinh độ (longitude) phải là số' })
  longitude: number;

  @IsString({ message: 'Địa chỉ phải là chuỗi' })
  @IsOptional()
  address?: string;

  @IsString({ message: 'Tên địa điểm phải là chuỗi' })
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isLive?: boolean;

  @IsDateString()
  @IsOptional()
  liveExpiresAt?: string;

  @IsBoolean()
  @IsOptional()
  isLiveActive?: boolean;
}

export class SendMessageDto {
  @IsMongoId({ message: 'ID người nhận không hợp lệ' })
  @IsNotEmpty({ message: 'receiverId là bắt buộc' })
  receiverId: string;

  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi' })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @MaxLength(5000, { message: 'Tin nhắn không được vượt quá 5000 ký tự' })
  text: string;

  @IsMongoId({ message: 'ID cuộc hội thoại không hợp lệ' })
  @IsOptional()
  conversationId?: string;

  @IsString()
  @IsOptional()
  type?: 'text' | 'call' | 'location';

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;
}
