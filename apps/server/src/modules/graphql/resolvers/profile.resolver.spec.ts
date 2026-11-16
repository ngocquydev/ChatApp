import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { createRequire } from 'node:module';
import { FriendsService } from '../../friends/friends.service.js';
import { PostsService } from '../../posts/posts.service.js';
import { ProfileResolver } from './profile.resolver.js';

const { parse, validate } = createRequire(import.meta.url)('graphql') as typeof import('graphql');

describe('ProfileResolver', () => {
  it('exposes profile and paginated post queries', async () => {
    const module = await Test.createTestingModule({ imports: [GraphQLSchemaBuilderModule] }).compile();
    const schema = await module.get(GraphQLSchemaFactory).create([ProfileResolver]);
    const query = parse(`query Profile($userId: String!, $limit: Int, $after: String) {
      publicProfile(userId: $userId) { user { _id name avatar cover bio school relationshipStatus createdAt }
        relationStatus requestId friendCount friendsPreview { _id name avatar } }
      profilePosts(userId: $userId, limit: $limit, after: $after) { items { _id } hasMore nextCursor }
    }`);
    expect(validate(schema, query)).toEqual([]);
    await module.close();
  });

  it('uses the authenticated viewer for profile and post visibility', async () => {
    const getPublicProfile = vi.fn().mockResolvedValue({ user: { _id: 'target' } });
    const getUserPosts = vi.fn().mockResolvedValue({ items: [], hasMore: false, nextCursor: null });
    const resolver = new ProfileResolver({ getPublicProfile } as unknown as FriendsService, { getUserPosts } as unknown as PostsService);
    const context = { req: { user: { id: 'viewer' } } };
    const target = '507f1f77bcf86cd799439011';
    await resolver.publicProfile(context, target);
    await resolver.profilePosts(context, target, 10);
    expect(getPublicProfile).toHaveBeenCalledWith('viewer', target);
    expect(getUserPosts).toHaveBeenCalledWith('viewer', target, { limit: 10, after: undefined });
    await expect(resolver.profilePosts(context, target, 10)).rejects.toBeInstanceOf(BadRequestException);
    await expect(resolver.publicProfile({ req: {} }, target)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
