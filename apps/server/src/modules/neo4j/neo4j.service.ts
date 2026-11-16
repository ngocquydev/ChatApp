import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

export interface Neo4jFriendSuggestion {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  mutualFriendsCount: number;
  mutualFriendNames: string[];
  friendsCount?: number;
  score: number;
  reason: string;
}

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver | null = null;
  private connected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const uri = this.configService.get<string>('NEO4J_URI') || 'bolt://localhost:7687';
    const user =
      this.configService.get<string>('NEO4J_USERNAME') ||
      this.configService.get<string>('NEO4J_USER') ||
      'neo4j';
    const password = this.configService.get<string>('NEO4J_PASSWORD') || 'password123';

    try {
      const isSecure = uri.startsWith('neo4j+s://') || uri.startsWith('bolt+s://');
      const driverConfig: Parameters<typeof neo4j.driver>[2] = {
        maxConnectionLifetime: 3 * 60 * 60 * 1000,
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 10000,
      };

      if (!isSecure && (uri.startsWith('bolt://') || uri.startsWith('neo4j://'))) {
        driverConfig.encrypted = 'ENCRYPTION_OFF';
      }

      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), driverConfig);

      await this.driver.verifyConnectivity();
      this.connected = true;
      this.logger.log(`Kết nối Neo4j thành công tại ${uri}`);

      // Tạo ràng buộc unique cho User.id
      await this.initSchema();
    } catch (err: unknown) {
      this.connected = false;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không thể kết nối tới Neo4j (${msg}). Hệ thống sẽ chuyển sang chế độ dự phòng.`);
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
    }
  }

  isAvailable(): boolean {
    return this.connected && this.driver !== null;
  }

  private async initSchema() {
    if (!this.isAvailable()) return;
    const session = this.getSession();
    try {
      await session.run(`
        CREATE CONSTRAINT user_id_unique IF NOT EXISTS
        FOR (u:User) REQUIRE u.id IS UNIQUE
      `);
    } catch (err) {
      this.logger.debug(`Khởi tạo schema Neo4j: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await session.close();
    }
  }

  getSession(): Session {
    if (!this.driver) {
      throw new Error('Neo4j driver chưa được khởi tạo');
    }
    const database = this.configService.get<string>('NEO4J_DATABASE');
    return database ? this.driver.session({ database }) : this.driver.session();
  }

  async syncUser(user: { id: string; name: string; avatar?: string }): Promise<void> {
    if (!this.isAvailable()) return;
    const session = this.getSession();
    try {
      await session.run(
        `
        MERGE (u:User {id: $id})
        SET u.name = $name,
            u.avatar = $avatar
        `,
        {
          id: user.id,
          name: user.name,
          avatar: user.avatar || '',
        },
      );
    } catch (err) {
      this.logger.warn(`Lỗi syncUser Neo4j: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await session.close();
    }
  }

  async addFriendship(userId1: string, userId2: string): Promise<void> {
    if (!this.isAvailable()) return;
    const session = this.getSession();
    try {
      await session.run(
        `
        MERGE (u1:User {id: $u1})
        MERGE (u2:User {id: $u2})
        MERGE (u1)-[:FRIEND]-(u2)
        `,
        { u1: userId1, u2: userId2 },
      );
    } catch (err) {
      this.logger.warn(`Lỗi addFriendship Neo4j: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await session.close();
    }
  }

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    if (!this.isAvailable()) return;
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (u1:User {id: $u1})-[r:FRIEND]-(u2:User {id: $u2})
        DELETE r
        `,
        { u1: userId1, u2: userId2 },
      );
    } catch (err) {
      this.logger.warn(`Lỗi removeFriendship Neo4j: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await session.close();
    }
  }

  async blockUser(userId: string, targetId: string): Promise<void> {
    if (!this.isAvailable()) return;
    const session = this.getSession();
    try {
      await session.run(
        `
        MERGE (u1:User {id: $u1})
        MERGE (u2:User {id: $u2})
        MERGE (u1)-[:BLOCK]->(u2)
        `,
        { u1: userId, u2: targetId },
      );
    } catch (err) {
      this.logger.warn(`Lỗi blockUser Neo4j: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await session.close();
    }
  }

  async getFriendSuggestions(userId: string, limit = 10): Promise<Neo4jFriendSuggestion[]> {
    if (!this.isAvailable()) return [];
    const session = this.getSession();
    try {
      // 1. Tier 1: Bạn của bạn (Friends of Friends - 2 hops)
      const fofResult = await session.run(
        `
        MATCH (u:User {id: $userId})-[:FRIEND]-(mutual:User)-[:FRIEND]-(suggested:User)
        WHERE NOT (u)-[:FRIEND]-(suggested)
          AND NOT (u)-[:BLOCK]-(suggested)
          AND u.id <> suggested.id
        WITH suggested, count(DISTINCT mutual) AS mutualCount, collect(DISTINCT mutual.name) AS mutualNames
        RETURN suggested.id AS id,
               suggested.name AS name,
               suggested.avatar AS avatar,
               mutualCount AS mutualFriendsCount,
               mutualNames[0..3] AS mutualFriendNames
        ORDER BY mutualCount DESC, suggested.name ASC
        LIMIT $limit
        `,
        { userId, limit: neo4j.int(limit) },
      );

      const suggestions: Neo4jFriendSuggestion[] = fofResult.records.map((record) => {
        const mutualCount =
          typeof record.get('mutualFriendsCount').toInt === 'function'
            ? record.get('mutualFriendsCount').toInt()
            : Number(record.get('mutualFriendsCount'));

        const mutualNames: string[] = record.get('mutualFriendNames') || [];
        const reason =
          mutualCount > 0
            ? `Có ${mutualCount} bạn chung (${mutualNames.join(', ')})`
            : 'Gợi ý từ đồ thị bạn bè';

        return {
          id: record.get('id'),
          name: record.get('name') || 'Người dùng',
          avatar: record.get('avatar') || undefined,
          mutualFriendsCount: mutualCount,
          mutualFriendNames: mutualNames,
          score: Math.min(100, mutualCount * 25 + 50),
          reason,
        };
      });

      // 2. Tier 2: Nếu chưa đủ số lượng limit, mở rộng lấy người dùng có nhiều kết nối nhất trong mạng lưới (Centrality)
      if (suggestions.length < limit) {
        const existingIds = [userId, ...suggestions.map((s) => s.id)];
        const remaining = limit - suggestions.length;

        const networkResult = await session.run(
          `
          MATCH (suggested:User)
          WHERE NOT (suggested.id IN $existingIds)
            AND NOT (suggested)-[:FRIEND]-(:User {id: $userId})
            AND NOT (suggested)-[:BLOCK]-(:User {id: $userId})
          OPTIONAL MATCH (suggested)-[:FRIEND]-(other:User)
          WITH suggested, count(other) AS totalFriends
          RETURN suggested.id AS id,
                 suggested.name AS name,
                 suggested.avatar AS avatar,
                 totalFriends AS friendsCount
          ORDER BY totalFriends DESC, suggested.name ASC
          LIMIT $remaining
          `,
          {
            userId,
            existingIds,
            remaining: neo4j.int(remaining),
          },
        );

        for (const record of networkResult.records) {
          const totalFriends =
            typeof record.get('friendsCount').toInt === 'function'
              ? record.get('friendsCount').toInt()
              : Number(record.get('friendsCount'));

          const reason =
            totalFriends > 0
              ? `Có ${totalFriends} kết nối trong cộng đồng`
              : 'Gợi ý từ mạng lưới kết nối';

          suggestions.push({
            id: record.get('id'),
            name: record.get('name') || 'Người dùng',
            avatar: record.get('avatar') || undefined,
            mutualFriendsCount: 0,
            mutualFriendNames: [],
            friendsCount: totalFriends,
            score: Math.min(100, totalFriends * 10 + 20),
            reason,
          });
        }
      }

      return suggestions;
    } catch (err) {
      this.logger.warn(`Lỗi getFriendSuggestions Neo4j: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    } finally {
      await session.close();
    }
  }
}
