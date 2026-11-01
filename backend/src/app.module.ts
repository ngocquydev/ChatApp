import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
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
import { WafMiddleware } from './modules/waf/waf.middleware.js';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware.js';
import { CloudflareMiddleware } from './common/middlewares/cloudflare.middleware.js';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // 1. Cấu hình biến môi trường toàn cục từ tệp .env (reload on update)
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Kết nối MongoDB sử dụng Mongoose (đọc qua ConfigService)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // 3. Kết nối Redis toàn cục
    RedisModule,

    // 4. Theo dõi và Telemetry từ Observe
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
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
