import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, Context, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FriendsService } from '../../friends/friends.service.js';
import { Neo4jService } from '../../neo4j/neo4j.service.js';
import { GqlAuthGuard } from '../guards/gql-auth.guard.js';
import { FriendType } from '../types/friend.type.js';
import { SearchUserType } from '../types/search-user.type.js';
import { UserSuggestionType } from '../types/user-suggestion.type.js';

interface GqlContext {
  req: {
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

    // 1. Thử lấy gợi ý từ đồ thị Neo4j (Friends of Friends)
    if (this.neo4jService.isAvailable()) {
      const neo4jSuggestions = await this.neo4jService.getFriendSuggestions(currentUserId, limit);
      if (neo4jSuggestions.length > 0) {
        return neo4jSuggestions.map((s) => ({
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

    // 2. Dự phòng: Sử dụng thuật toán gợi ý hiện có (Redis + Mongo)
    const fallbackRecs = await this.friendsService.getFriendRecommendations(currentUserId, { limit });
    return fallbackRecs.map((r) => ({
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
