import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RedisModule } from './modules/redis/redis/redis.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { FriendsModule } from './modules/friends/friends.module.js';
import { PostsModule } from './modules/posts/posts.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { Neo4jModule } from './modules/neo4j/neo4j.module.js';
import { AppGraphqlModule } from './modules/graphql/app-graphql.module.js';
import { ModerationModule } from './modules/moderation/moderation.module.js';
import { WafModule } from './modules/waf/waf.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { BackupModule } from './modules/backup/backup.module.js';
import { GroqModule } from './modules/groq/groq.module.js';
import { PagesModule } from './modules/pages/pages.module.js';
import { CommunityGroupsModule } from './modules/community-groups/community-groups.module.js';
import { WafMiddleware } from './modules/waf/waf.middleware.js';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware.js';
import { CloudflareMiddleware } from './common/middlewares/cloudflare.middleware.js';
export const { ObserveModule, ObserveInstrument } = createObserveModule({
  skipInstrumentation: (instance: unknown) => {
    if (!instance || typeof instance !== 'object') return false;
    const name = instance.constructor?.name;
    return (
      name === 'ChatGateway' ||
      name === 'GroqService' ||
      name === 'AuraRagService' ||
      name === 'MqttBrokerService'
    );
  },
});

const currentDir = path.dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env.local'),
        path.resolve(process.cwd(), '../.env.local'),
        path.resolve(currentDir, '../../.env.local'),
        path.resolve(currentDir, '../.env.local'),
        '.env.local',
        '.env',
      ],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        if (uri?.includes('mongodb+srv://')) {
          try {
            const dns = await import('dns');
            dns.setServers(['8.8.8.8', '1.1.1.1']);
          } catch {
            // Giữ nguyên thiết lập DNS hệ thống
          }
        }
        return {
          uri,
          dbName: configService.get<string>('MONGODB_DB_NAME') || 'chatapp',
        };
      },
      inject: [ConfigService],
    }),

    // 3. Kết nối Redis toàn cục
    RedisModule,

    // 4. Theo dõi và Telemetry từ Observe
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
      outgoing: {
        http: {
          ignore: (url: string) => url.includes('api.groq.com'),
        },
      },
    }),

    // 5. Các module tính năng khác
    UsersModule,

    AuthModule,

    ChatModule,

    FriendsModule,

    PostsModule,

    NotificationsModule,

    CloudinaryModule,

    UploadModule,

    Neo4jModule,

    AppGraphqlModule,

    ModerationModule,

    WafModule,

    AdminModule,

    BackupModule,

    GroqModule,

    PagesModule,

    CommunityGroupsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 1. Áp dụng Cloudflare Origin Shield & Real IP extraction toàn cục cho mọi request
    consumer.apply(CloudflareMiddleware).forRoutes('*');

    // 2. Tường lửa ứng dụng (WAF): chặn IP/dò lỗ hổng/UA xấu, Under Attack Mode bắt xác minh Turnstile
    consumer.apply(WafMiddleware).forRoutes('*');

    // 3. Giới hạn tốc độ (Rate Limit) chống brute-force và DDoS cho các endpoint nhạy cảm
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('auth/login', 'auth/register', 'waf/clearance');
  }
}
