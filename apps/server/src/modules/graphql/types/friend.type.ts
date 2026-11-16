import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Thông tin bạn bè' })
export class FriendType {
  @Field(() => ID)
  _id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;
}
