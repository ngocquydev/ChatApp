import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
