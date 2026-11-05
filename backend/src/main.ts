import 'dotenv/config';
import dns from 'dns';

// Tự động phân giải DNS SRV (Google / Cloudflare DNS) cho MongoDB Atlas trên các môi trường mạng hoặc Windows
if (process.env.MONGODB_URI?.includes('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Bỏ qua nếu môi trường không cho phép thay đổi DNS servers
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import { ErrorHandlerFilter } from './errorHandleer/index.js';
import { UPLOAD_ROOT } from './modules/posts/post-image.util.js';
import cookieParser from 'cookie-parser';
import { isTrustedProxyIp } from './common/utils/client-ip.util.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  // Chỉ tin X-Forwarded-* từ Cloudflare Edge hoặc proxy nội bộ (cloudflared tunnel / TRUSTED_PROXY_CIDRS),
  // tránh client kết nối thẳng giả mạo req.ip / req.protocol
  expressApp.set('trust proxy', (addr: string) => isTrustedProxyIp(addr));

  app.use(cookieParser());

  // Chỉ cho phép các giao thức và phương thức HTTP hợp lệ đi vào hệ thống
  const ALLOWED_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
  expressApp.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (!ALLOWED_HTTP_METHODS.has(req.method.toUpperCase())) {
      return res.status(405).json({
        statusCode: 405,
        message: `Phương thức ${req.method} không được phép`,
        error: 'Method Not Allowed',
      });
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      const proto = req.headers['x-forwarded-proto'];
      if (proto && proto === 'http') {
        const host = req.headers.host || '';
        return res.redirect(301, `https://${host}${req.url}`);
      }
    }

    next();
  });

  // Ảnh bài viết: tên file là UUID ngẫu nhiên, chỉ phục vụ ảnh raster đã kiểm tra magic bytes
  app.useStaticAssets(UPLOAD_ROOT, {
    prefix: '/uploads/',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  });

  const allowedOrigins: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    'http://127.0.0.1:3001',
    /^https:\/\/.*\.vercel\.app$/,
  ];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  if (process.env.ADMIN_URL) {
    allowedOrigins.push(process.env.ADMIN_URL);
  }
  if (process.env.CORS_ORIGIN) {
    const extraOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
    allowedOrigins.push(...extraOrigins);
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );

  app.useGlobalFilters(new ErrorHandlerFilter());

  const config = new DocumentBuilder()
    .setTitle('Chat API Documentation')
    .setDescription('Hệ thống tài liệu API cho dự án Chat NestJS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger Docs available at: http://localhost:${port}/api-docs`);
}

process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Bắt lỗi Unhandled Promise Rejection an toàn:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Bắt lỗi Uncaught Exception an toàn:', err);
});

void bootstrap();
