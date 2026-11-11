import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { FriendsModule } from '../friends/friends.module.js';
import { Neo4jModule } from '../neo4j/neo4j.module.js';
import { FriendsResolver } from './resolvers/friends.resolver.js';
import { FeedResolver } from './resolvers/feed.resolver.js';
import { ProfileResolver } from './resolvers/profile.resolver.js';
import { PostsModule } from '../posts/posts.module.js';
import { queryLimitsRule } from './query-limits.rule.js';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      validationRules: [queryLimitsRule],
      path: '/graphql',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    FriendsModule,
    Neo4jModule,
    PostsModule,
  ],
  providers: [FriendsResolver, FeedResolver, ProfileResolver],
})
export class AppGraphqlModule {}
