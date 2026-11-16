import { IsMongoId, IsNotEmpty } from 'class-validator';

export class SendFriendRequestDto {
  @IsMongoId({ message: 'ID người nhận lời mời không hợp lệ' })
  @IsNotEmpty({ message: 'recipientId là bắt buộc' })
  recipientId: string;
}
