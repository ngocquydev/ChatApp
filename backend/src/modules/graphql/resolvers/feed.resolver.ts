import { BadRequestException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, Int, Query, Resolver } from '@nestjs/graphql';
import { PostsService } from '../../posts/posts.service.js';
import { GqlAuthGuard } from '../guards/gql-auth.guard.js';
import { FeedPage } from '../types/post.type.js';

@Resolver()
export class FeedResolver {
  constructor(private readonly postsService: PostsService) {}

  @Query(() => FeedPage)
  @UseGuards(GqlAuthGuard)
  async feed(
    @Context() ctx: { req: { user?: { _id?: string; id?: string; sub?: string }; feedRequested?: boolean } },
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('after', { type: () => String, nullable: true }) after?: string,
  ) {
    const user = ctx.req.user;
    const viewerId = user?._id?.toString() || user?.id?.toString() || user?.sub;
    if (!viewerId) throw new UnauthorizedException();
    if (limit < 1 || limit > 30) throw new BadRequestException('Invalid page limit');
    if (after != null && !/^[a-f\d]{24}$/i.test(after)) throw new BadRequestException('Invalid cursor');
    if (ctx.req.feedRequested) throw new BadRequestException('Only one feed query is allowed per request');
    ctx.req.feedRequested = true;
    return this.postsService.getFeed(viewerId, { limit, after });
  }
}
