import { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it } from 'vitest';
import { Neo4jService } from './neo4j.service.js';

describe('Neo4jService', () => {
  let service: Neo4jService;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      NEO4J_URI: 'bolt://localhost:7687',
      NEO4J_USER: 'neo4j',
      NEO4J_PASSWORD: 'password123',
    });
    service = new Neo4jService(configService);
  });

  it('xác định đúng trạng thái kết nối khi chưa init', () => {
    expect(service.isAvailable()).toBe(false);
  });

  it('trả về mảng rỗng khi Neo4j chưa kết nối', async () => {
    const suggestions = await service.getFriendSuggestions('test-user-id');
    expect(suggestions).toEqual([]);
  });
});
