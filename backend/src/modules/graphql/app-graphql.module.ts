import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { FriendsModule } from '../friends/friends.module.js';
import { Neo4jModule } from '../neo4j/neo4j.module.js';
import { FriendsResolver } from './resolvers/friends.resolver.js';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: true,
      path: '/graphql',
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
    }),
    FriendsModule,
    Neo4jModule,
  ],
  providers: [FriendsResolver],
})
export class AppGraphqlModule {}
