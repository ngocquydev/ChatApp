import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { FeedAuthor } from './post.type.js';

@ObjectType()
export class ProfileUser {
  @Field(() => ID) _id!: string;
  @Field() name!: string;
  @Field({ nullable: true }) avatar?: string;
  @Field({ nullable: true }) cover?: string;
  @Field({ nullable: true }) bio?: string;
  @Field({ nullable: true }) school?: string;
  @Field({ nullable: true }) relationshipStatus?: string;
  @Field(() => Date, { nullable: true }) createdAt?: Date;
}

@ObjectType()
export class PublicProfile {
  @Field(() => ProfileUser) user!: ProfileUser;
  @Field() relationStatus!: string;
  @Field(() => ID, { nullable: true }) requestId?: string;
  @Field(() => Int) friendCount!: number;
  @Field(() => [FeedAuthor]) friendsPreview!: FeedAuthor[];
}
