import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Kết quả tìm kiếm bạn bè theo tên' })
export class SearchUserType {
  @Field(() => ID)
  _id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ description: 'Trạng thái kết bạn: none | pending_sent | pending_received | friends' })
  relationStatus: string;

  @Field({ nullable: true })
  requestId?: string;
}
