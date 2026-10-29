import dotenv from 'dotenv';
dotenv.config();

export const config = {
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'recommendation-speed-layer',
    groupId: process.env.KAFKA_GROUP_ID || 'recommendation-speed-group',
    topic: process.env.KAFKA_TOPIC || 'friend-events',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'rec:user:',
    friendKeyPrefix: process.env.REDIS_FRIEND_PREFIX || 'user:',
  },
};

