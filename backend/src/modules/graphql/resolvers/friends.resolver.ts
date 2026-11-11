import { BadRequestException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FriendsService } from '../../friends/friends.service.js';
import { Neo4jService } from '../../neo4j/neo4j.service.js';
import { GqlAuthGuard } from '../guards/gql-auth.guard.js';
import { FriendType } from '../types/friend.type.js';
import { SearchUserType, SearchUsersPage } from '../types/search-user.type.js';
import { UserSuggestionType } from '../types/user-suggestion.type.js';

interface GqlContext {
  req: {
    searchPageRequested?: boolean;
    user?: {
      _id?: string;
      id?: string;
      sub?: string;
    };
  };
}

@Resolver()
export class FriendsResolver {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly neo4jService: Neo4jService,
  ) {}

  private extractUserId(ctx: GqlContext): string {
    const user = ctx.req.user;
    const userId = user?._id?.toString() || user?.id?.toString() || user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Không thể xác thực danh tính người dùng');
    }
    return userId;
  }

  @Query(() => [UserSuggestionType], {
    name: 'suggestedFriends',
    description: 'Lấy danh sách gợi ý kết bạn sử dụng đồ thị Neo4j (bạn của bạn) kèm dự phòng mạng lưới',
  })
  @UseGuards(GqlAuthGuard)
  async suggestedFriends(
    @Context() ctx: GqlContext,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<UserSuggestionType[]> {
    const currentUserId = this.extractUserId(ctx);

    // Ưu tiên đồ thị Neo4j nếu service online
    if (this.neo4jService.isAvailable()) {
      const neo4jSuggestions = await this.neo4jService.getFriendSuggestions(currentUserId, limit);
      if (neo4jSuggestions.length > 0) {
        return neo4jSuggestions
          .filter((s) => s.role !== 'admin' && s.role !== 'bot')
          .map((s) => ({
            _id: s.id,
            name: s.name,
            avatar: s.avatar,
            mutualFriendsCount: s.mutualFriendsCount,
            mutualFriendNames: s.mutualFriendNames,
            score: s.score,
            reason: s.reason,
          }));
      }
    }

    // Lấy gợi ý từ friendsService (đã tích hợp Neo4j đồ thị, loại trừ bot & admin, kèm Redis cache)
    const recs = await this.friendsService.getFriendRecommendations(currentUserId, { limit });
    return recs.map((r) => ({
      _id: r._id,
      name: r.name,
      avatar: r.avatar,
      bio: r.bio,
      mutualFriendsCount: r.mutualFriendsCount || 0,
      mutualFriendNames: [],
      score: r.score,
      reason: r.recommendationReason || 'Gợi ý kết bạn',
    }));
  }

  @Query(() => [SearchUserType], {
    name: 'searchFriends',
    description: 'Tìm kiếm người dùng theo tên (không dùng email)',
  })
  @UseGuards(GqlAuthGuard)
  async searchFriends(
    @Context() ctx: GqlContext,
    @Args('name', { type: () => String }) name: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<SearchUserType[]> {
    const currentUserId = this.extractUserId(ctx);
    const { users } = await this.friendsService.searchUsersWithRelation(name, currentUserId, { limit });

    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      avatar: u.avatar,
      bio: u.bio,
      relationStatus: u.relationStatus,
      requestId: u.requestId,
    }));
  }

  @Query(() => SearchUsersPage)
  @UseGuards(GqlAuthGuard)
  async searchUsersPage(
    @Context() ctx: GqlContext,
    @Args('query') query: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('after', { type: () => String, nullable: true }) after?: string,
  ) {
    const currentUserId = this.extractUserId(ctx);
    if (!query.trim() || query.length > 100) throw new BadRequestException('Invalid search query');
    if (limit < 1 || limit > 50) throw new BadRequestException('Invalid page limit');
    if (after != null && !/^[a-f\d]{24}$/i.test(after)) throw new BadRequestException('Invalid cursor');
    if (ctx.req.searchPageRequested) throw new BadRequestException('Only one search page is allowed per request');
    ctx.req.searchPageRequested = true;
    return this.friendsService.searchUsersWithRelation(query, currentUserId, { limit, after });
  }

  @Query(() => [FriendType], {
    name: 'myFriends',
    description: 'Lấy danh sách bạn bè của người dùng hiện tại',
  })
  @UseGuards(GqlAuthGuard)
  async myFriends(@Context() ctx: GqlContext): Promise<FriendType[]> {
    const currentUserId = this.extractUserId(ctx);
    const list = (await this.friendsService.getFriendsList(currentUserId)) as Array<{
      friendshipId: unknown;
      friend?: { _id?: { toString(): string } | string; name?: string; avatar?: string; bio?: string };
    }>;

    return list.map((item) => ({
      _id: item.friend?._id ? item.friend._id.toString() : '',
      name: item.friend?.name || '',
      avatar: item.friend?.avatar,
      bio: item.friend?.bio,
    }));
  }

  @Mutation(() => Boolean, {
    name: 'sendFriendRequest',
    description: 'Gửi lời mời kết bạn',
  })
  @UseGuards(GqlAuthGuard)
  async sendFriendRequest(
    @Context() ctx: GqlContext,
    @Args('recipientId', { type: () => ID }) recipientId: string,
  ): Promise<boolean> {
    const currentUserId = this.extractUserId(ctx);
    await this.friendsService.sendFriendRequest(currentUserId, recipientId);
    return true;
  }

  @Mutation(() => Boolean, {
    name: 'acceptFriendRequest',
    description: 'Chấp nhận lời mời kết bạn và cập nhật đồ thị Neo4j',
  })
  @UseGuards(GqlAuthGuard)
  async acceptFriendRequest(
    @Context() ctx: GqlContext,
    @Args('requestId', { type: () => ID }) requestId: string,
  ): Promise<boolean> {
    const currentUserId = this.extractUserId(ctx);
    await this.friendsService.respondToRequest(requestId, currentUserId, 'accept');
    return true;
  }
}
