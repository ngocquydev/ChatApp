import { BadRequestException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, Int, Query, Resolver } from '@nestjs/graphql';
import { FriendsService } from '../../friends/friends.service.js';
import { PostsService } from '../../posts/posts.service.js';
import { GqlAuthGuard } from '../guards/gql-auth.guard.js';
import { FeedPage } from '../types/post.type.js';
import { PublicProfile } from '../types/profile.type.js';

interface ProfileContext {
  req: { user?: { _id?: string; id?: string; sub?: string }; profileRequested?: boolean; profilePostsRequested?: boolean };
}

@Resolver()
export class ProfileResolver {
  constructor(private readonly friendsService: FriendsService, private readonly postsService: PostsService) {}

  private viewerId(ctx: ProfileContext): string {
    const user = ctx.req.user;
    const id = user?._id?.toString() || user?.id?.toString() || user?.sub;
    if (!id) throw new UnauthorizedException();
    return id;
  }

  @Query(() => PublicProfile)
  @UseGuards(GqlAuthGuard)
  async publicProfile(@Context() ctx: ProfileContext, @Args('userId') userId: string) {
    const viewer = this.viewerId(ctx);
    if (!userId || userId.length > 256) throw new BadRequestException('Invalid user ID');
    if (ctx.req.profileRequested) throw new BadRequestException('Only one profile query is allowed per request');
    ctx.req.profileRequested = true;
    return this.friendsService.getPublicProfile(viewer, userId);
  }

  @Query(() => FeedPage)
  @UseGuards(GqlAuthGuard)
  async profilePosts(
    @Context() ctx: ProfileContext,
    @Args('userId') userId: string,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('after', { type: () => String, nullable: true }) after?: string,
  ) {
    const viewer = this.viewerId(ctx);
    if (!/^[a-f\d]{24}$/i.test(userId)) throw new BadRequestException('Invalid user ID');
    if (limit < 1 || limit > 30) throw new BadRequestException('Invalid page limit');
    if (after != null && !/^[a-f\d]{24}$/i.test(after)) throw new BadRequestException('Invalid cursor');
    if (ctx.req.profilePostsRequested) throw new BadRequestException('Only one profile posts query is allowed per request');
    ctx.req.profilePostsRequested = true;
    return this.postsService.getUserPosts(viewer, userId, { limit, after });
  }
}
