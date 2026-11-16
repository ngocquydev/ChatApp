import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { INestApplication, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GqlExecutionContext, GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ErrorHandlerFilter } from '../../../errorHandleer/errorHandler.filter.js';
import { PostsService } from '../../posts/posts.service.js';
import { FriendsService } from '../../friends/friends.service.js';
import { Neo4jService } from '../../neo4j/neo4j.service.js';
import { RedisService } from '../../redis/redis/redis.service.js';
import { GqlAuthGuard } from '../guards/gql-auth.guard.js';
import { FeedResolver } from './feed.resolver.js';
import { ProfileResolver } from './profile.resolver.js';
import { FriendsResolver } from './friends.resolver.js';

describe('GraphQL feed integration', () => {
  let app: INestApplication;
  const getFeed = vi.fn().mockResolvedValue({
    items: [{
      _id: 'post-1', author: { _id: 'author-1', name: 'Author' }, content: 'Hello', images: [],
      privacy: 'public', likeCount: 0, commentCount: 0, shareCount: 0, likedByMe: false,
      sharedPost: { unavailable: true },
    }],
    hasMore: false,
    nextCursor: null,
  });
  const getPublicProfile = vi.fn().mockRejectedValue(new NotFoundException('User not found'));
  const getUserPosts = vi.fn().mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
  const searchUsersWithRelation = vi.fn().mockResolvedValue({
    users: [{ _id: 'user-1', name: 'Alice', relationStatus: 'none' }], hasMore: true,
    nextCursor: '507f1f77bcf86cd799439011',
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLModule.forRoot<ApolloDriverConfig>({ driver: ApolloDriver, autoSchemaFile: true, context: ({ req }: { req: unknown }) => ({ req }) })],
      providers: [FeedResolver, ProfileResolver, FriendsResolver, GqlAuthGuard, { provide: RedisService, useValue: {} }, { provide: Neo4jService, useValue: {} }, { provide: PostsService, useValue: { getFeed, getUserPosts } }, { provide: FriendsService, useValue: { getPublicProfile, searchUsersWithRelation } }],
    }).overrideGuard(GqlAuthGuard).useValue({
      canActivate(context: Parameters<typeof GqlExecutionContext.create>[0]) {
        const { req } = GqlExecutionContext.create(context).getContext<{ req: { headers: Record<string, string>; user?: { id: string } } }>();
        if (!req.headers['x-test-user']) throw new UnauthorizedException();
        req.user = { id: req.headers['x-test-user'] };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.useGlobalFilters(new ErrorHandlerFilter());
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it('returns an authentication error for an anonymous request', async () => {
    const response = await request(app.getHttpServer()).post('/graphql').send({ query: '{ feed { hasMore } }' });
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(getFeed).not.toHaveBeenCalled();
  });

  it('returns the viewer-scoped page and unavailable shared post', async () => {
    const response = await request(app.getHttpServer()).post('/graphql').set('x-test-user', 'viewer').send({
      query: '{ feed(limit: 10) { items { _id sharedPost { unavailable } } hasMore nextCursor } }',
    });
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.feed.items[0].sharedPost.unavailable).toBe(true);
    expect(getFeed).toHaveBeenCalledWith('viewer', { limit: 10, after: undefined });
  });

  it('does not execute multiple feed aliases in one request', async () => {
    getFeed.mockClear();
    const response = await request(app.getHttpServer()).post('/graphql').set('x-test-user', 'viewer').send({
      query: '{ first: feed { hasMore } second: feed { hasMore } }',
    });
    expect(response.body.errors).toBeDefined();
    expect(getFeed).toHaveBeenCalledTimes(1);
  });

  it('preserves not-found status for profiles', async () => {
    const response = await request(app.getHttpServer()).post('/graphql').set('x-test-user', 'viewer').send({
      query: '{ publicProfile(userId: "missing") { user { name } } }',
    });
    expect(response.body.errors[0].extensions.originalError.statusCode).toBe(404);
    expect(getPublicProfile).toHaveBeenCalledWith('viewer', 'missing');
  });

  it('preserves cursor pagination for friend search', async () => {
    const cursor = '507f1f77bcf86cd799439011';
    const response = await request(app.getHttpServer()).post('/graphql').set('x-test-user', 'viewer').send({
      query: 'query($after: String) { searchUsersPage(query: "Alice", limit: 20, after: $after) { users { _id name relationStatus } hasMore nextCursor } }',
      variables: { after: cursor },
    });
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.searchUsersPage).toMatchObject({ hasMore: true, nextCursor: cursor, users: [{ name: 'Alice' }] });
    expect(searchUsersWithRelation).toHaveBeenCalledWith('Alice', 'viewer', { limit: 20, after: cursor });
  });
});
