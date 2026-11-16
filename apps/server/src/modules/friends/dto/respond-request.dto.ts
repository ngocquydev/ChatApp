import { IsIn, IsNotEmpty } from 'class-validator';

export class RespondFriendRequestDto {
  @IsIn(['accept', 'reject'], {
    message: 'Hành động phản hồi phải là accept hoặc reject',
  })
  @IsNotEmpty({ message: 'action là bắt buộc' })
  action: 'accept' | 'reject';
}
