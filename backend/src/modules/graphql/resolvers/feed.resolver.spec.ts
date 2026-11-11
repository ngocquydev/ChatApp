import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { createRequire } from 'node:module';
import { PostsService } from '../../posts/posts.service.js';
import { FeedResolver } from './feed.resolver.js';

const { parse, validate } = createRequire(import.meta.url)('graphql') as typeof import('graphql');

describe('FeedResolver', () => {
  it('exposes the feed fields needed by the client in the generated schema', async () => {
    const module = await Test.createTestingModule({ imports: [GraphQLSchemaBuilderModule] }).compile();
    const schema = await module.get(GraphQLSchemaFactory).create([FeedResolver]);
    const query = parse(`query Feed($limit: Int, $after: String) {
      feed(limit: $limit, after: $after) {
        items { _id author { _id name avatar } content images privacy createdAt
          likeCount commentCount shareCount likedByMe myReaction
          reactionsCount { like love care haha wow sad angry }
          sharedPost { unavailable _id author { _id name avatar } content images privacy createdAt shareCount }
          isSensitive moderationStatus moderationReason toxicityScore pageId groupId }
        hasMore nextCursor
      }
    }`);
    expect(validate(schema, query)).toEqual([]);
    await module.close();
  });

  it('uses the authenticated viewer and preserves the cursor page', async () => {
    const page = { items: [], hasMore: true, nextCursor: '507f1f77bcf86cd799439011' };
    const getFeed = vi.fn().mockResolvedValue(page);
    const resolver = new FeedResolver({ getFeed } as unknown as PostsService);
    const cursor = '507f1f77bcf86cd799439011';
    await expect(resolver.feed({ req: { user: { sub: 'viewer' } } }, 10, cursor)).resolves.toEqual(page);
    expect(getFeed).toHaveBeenCalledWith('viewer', { limit: 10, after: cursor });
  });

  it('rejects invalid pagination and missing identity', async () => {
    const getFeed = vi.fn();
    const resolver = new FeedResolver({ getFeed } as unknown as PostsService);
    await expect(resolver.feed({ req: {} }, 10)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(resolver.feed({ req: { user: { id: 'viewer' } } }, 31)).rejects.toBeInstanceOf(BadRequestException);
    await expect(resolver.feed({ req: { user: { id: 'viewer' } } }, 10, 'invalid')).rejects.toBeInstanceOf(BadRequestException);
    expect(getFeed).not.toHaveBeenCalled();
  });

  it('limits repeated feed fields in a single request', async () => {
    const getFeed = vi.fn().mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
    const resolver = new FeedResolver({ getFeed } as unknown as PostsService);
    const context = { req: { user: { id: 'viewer' } } };
    await resolver.feed(context, 10);
    await expect(resolver.feed(context, 10)).rejects.toBeInstanceOf(BadRequestException);
    expect(getFeed).toHaveBeenCalledTimes(1);
  });
});
