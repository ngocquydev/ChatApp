import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FeedAuthor {
  @Field(() => ID) _id!: string;
  @Field() name!: string;
  @Field({ nullable: true }) avatar?: string;
}

@ObjectType()
export class FeedReactions {
  @Field(() => Int, { nullable: true }) like?: number;
  @Field(() => Int, { nullable: true }) love?: number;
  @Field(() => Int, { nullable: true }) care?: number;
  @Field(() => Int, { nullable: true }) haha?: number;
  @Field(() => Int, { nullable: true }) wow?: number;
  @Field(() => Int, { nullable: true }) sad?: number;
  @Field(() => Int, { nullable: true }) angry?: number;
}

@ObjectType()
export class FeedSharedPost {
  @Field({ nullable: true }) unavailable?: boolean;
  @Field(() => ID, { nullable: true }) _id?: string;
  @Field(() => FeedAuthor, { nullable: true }) author?: FeedAuthor;
  @Field({ nullable: true }) content?: string;
  @Field(() => [String], { nullable: true }) images?: string[];
  @Field({ nullable: true }) privacy?: string;
  @Field(() => Date, { nullable: true }) createdAt?: Date;
  @Field(() => Int, { nullable: true }) shareCount?: number;
}

@ObjectType()
export class FeedPost {
  @Field(() => ID) _id!: string;
  @Field(() => FeedAuthor) author!: FeedAuthor;
  @Field() content!: string;
  @Field(() => [String]) images!: string[];
  @Field() privacy!: string;
  @Field(() => Date, { nullable: true }) createdAt?: Date;
  @Field(() => Int) likeCount!: number;
  @Field(() => Int) commentCount!: number;
  @Field(() => Int) shareCount!: number;
  @Field() likedByMe!: boolean;
  @Field({ nullable: true }) myReaction?: string;
  @Field(() => FeedReactions, { nullable: true }) reactionsCount?: FeedReactions;
  @Field(() => FeedSharedPost, { nullable: true }) sharedPost?: FeedSharedPost;
  @Field({ nullable: true }) isSensitive?: boolean;
  @Field({ nullable: true }) moderationStatus?: string;
  @Field({ nullable: true }) moderationReason?: string;
  @Field(() => Float, { nullable: true }) toxicityScore?: number;
  @Field(() => ID, { nullable: true }) pageId?: string;
  @Field(() => ID, { nullable: true }) groupId?: string;
}

@ObjectType()
export class FeedPage {
  @Field(() => [FeedPost]) items!: FeedPost[];
  @Field() hasMore!: boolean;
  @Field(() => String, { nullable: true }) nextCursor!: string | null;
}
