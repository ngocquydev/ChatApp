import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FriendsResolver } from './friends.resolver.js';
import { FriendsService } from '../../friends/friends.service.js';
import { Neo4jService } from '../../neo4j/neo4j.service.js';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { createRequire } from 'node:module';

const { parse, validate } = createRequire(import.meta.url)('graphql') as typeof import('graphql');

describe('FriendsResolver', () => {
  let resolver: FriendsResolver;
  let friendsService: Partial<FriendsService>;
  let neo4jService: Partial<Neo4jService>;

  beforeEach(() => {
    friendsService = {
      searchUsersWithRelation: vi.fn().mockResolvedValue({
        users: [
          {
            _id: 'u1',
            name: 'Nguyễn Văn A',
            avatar: 'a.jpg',
            bio: 'Xin chào',
            relationStatus: 'none',
          },
        ],
        hasMore: false,
      }),
      getFriendRecommendations: vi.fn().mockResolvedValue([
        {
          _id: 'u2',
          name: 'Trần Thị B',
          avatar: 'b.jpg',
          mutualFriendsCount: 3,
          score: 80,
          recommendationReason: 'Có 3 bạn chung',
        },
      ]),
      getFriendsList: vi.fn().mockResolvedValue([]),
      sendFriendRequest: vi.fn().mockResolvedValue({}),
      respondToRequest: vi.fn().mockResolvedValue({}),
    };

    neo4jService = {
      isAvailable: vi.fn().mockReturnValue(false),
      getFriendSuggestions: vi.fn().mockResolvedValue([]),
    };

    resolver = new FriendsResolver(
      friendsService as FriendsService,
      neo4jService as Neo4jService,
    );
  });

  it('suggestedFriends: dự phòng trả về gợi ý từ friendsService khi Neo4j chưa online', async () => {
    const ctx = { req: { user: { _id: 'me-123' } } };
    const suggestions = await resolver.suggestedFriends(ctx, 10);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].name).toBe('Trần Thị B');
    expect(suggestions[0].mutualFriendsCount).toBe(3);
  });

  it('suggestedFriends: ưu tiên kết quả từ Neo4j khi Neo4j online', async () => {
    (neo4jService.isAvailable as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (neo4jService.getFriendSuggestions as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 'neo-user-1',
        name: 'Neo User',
        avatar: 'neo.jpg',
        mutualFriendsCount: 5,
        mutualFriendNames: ['Bạn 1', 'Bạn 2'],
        score: 50,
        reason: 'Có 5 bạn chung (Bạn 1, Bạn 2)',
      },
    ]);

    const ctx = { req: { user: { _id: 'me-123' } } };
    const suggestions = await resolver.suggestedFriends(ctx, 10);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]._id).toBe('neo-user-1');
    expect(suggestions[0].mutualFriendNames).toEqual(['Bạn 1', 'Bạn 2']);
  });

  it('searchFriends: tìm kiếm theo tên và trả về kết quả không chứa email', async () => {
    const ctx = { req: { user: { _id: 'me-123' } } };
    const results = await resolver.searchFriends(ctx, 'Nguyễn', 10);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Nguyễn Văn A');
    expect((results[0] as unknown as Record<string, unknown>).email).toBeUndefined();
  });

  it('exposes a paginated search query', async () => {
    const module = await Test.createTestingModule({ imports: [GraphQLSchemaBuilderModule] }).compile();
    const schema = await module.get(GraphQLSchemaFactory).create([FriendsResolver]);
    expect(validate(schema, parse(`query SearchUsersPage($query: String!, $limit: Int, $after: String) {
      searchUsersPage(query: $query, limit: $limit, after: $after) {
        users { _id name avatar bio relationStatus requestId } hasMore nextCursor
      }
    }`))).toEqual([]);
    await module.close();
  });

  it('uses the viewer and cursor for paginated search and rejects repeated calls', async () => {
    const ctx = { req: { user: { _id: 'me-123' } } };
    const cursor = '507f1f77bcf86cd799439011';
    await resolver.searchUsersPage(ctx, 'Nguyễn', 20, cursor);
    expect(friendsService.searchUsersWithRelation).toHaveBeenCalledWith('Nguyễn', 'me-123', { limit: 20, after: cursor });
    await expect(resolver.searchUsersPage(ctx, 'Nguyễn', 20)).rejects.toThrow();
    await expect(resolver.searchUsersPage({ req: { user: { _id: 'me-123' } } }, 'Nguyễn', 51)).rejects.toThrow();
  });
});
