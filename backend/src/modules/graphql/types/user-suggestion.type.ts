import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Gợi ý kết bạn từ đồ thị Neo4j và mạng lưới quan hệ' })
export class UserSuggestionType {
  @Field(() => ID)
  _id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field(() => Int)
  mutualFriendsCount: number;

  @Field(() => [String])
  mutualFriendNames: string[];

  @Field()
  reason: string;

  @Field({ nullable: true })
  score?: number;
}
