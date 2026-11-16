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
import { isAllowedCookieRequest, isAllowedOrigin } from './common/utils/origin-policy.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');
  // Chỉ tin X-Forwarded-* từ Cloudflare Edge hoặc proxy nội bộ (cloudflared tunnel / TRUSTED_PROXY_CIDRS),
  // tránh client kết nối thẳng giả mạo req.ip / req.protocol
  expressApp.set('trust proxy', (addr: string) => isTrustedProxyIp(addr));

  app.use(cookieParser());
  expressApp.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const hasSessionCookie = Boolean(req.cookies?.accessToken || req.cookies?.refreshToken);
    if (!isAllowedCookieRequest(req.method, req.headers.origin, hasSessionCookie)) {
      return res.status(403).json({ statusCode: 403, message: 'Origin không được phép' });
    }
    next();
  });

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

  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
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

  const isProduction = process.env.NODE_ENV === 'production';
  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';

  if (!isProduction || enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Chat API Documentation')
      .setDescription('Hệ thống tài liệu API cho dự án Chat NestJS')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  } else {
    // Vô hiệu hóa và chặn hoàn toàn Swagger API Docs trên môi trường production
    expressApp.use(/^\/api-docs.*/, (_req: import('express').Request, res: import('express').Response) => {
      res.status(404).json({
        statusCode: 404,
        message: 'Endpoint không tồn tại hoặc đã bị vô hiệu hóa trên môi trường Production',
        error: 'Not Found',
      });
    });
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://0.0.0.0:${port}`);
  if (!isProduction || enableSwagger) {
    console.log(`Swagger Docs available at: http://localhost:${port}/api-docs`);
  }
}

process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Bắt lỗi Unhandled Promise Rejection an toàn:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Bắt lỗi Uncaught Exception an toàn:', err);
});

void bootstrap();
