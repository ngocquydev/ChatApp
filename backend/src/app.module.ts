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
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware.js';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      // Áp dụng riêng cho đường dẫn đăng nhập hoặc toàn bộ api
      .forRoutes('auth/login', 'auth/register');
    // Hoặc dùng .forRoutes('*') nếu muốn áp dụng cho toàn bộ server
  }
}
