import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { RedisModule } from './modules/redis/redis/redis.module.js';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware.js';
export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // 1. Cấu hình biến môi trường toàn cục từ tệp .env
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
