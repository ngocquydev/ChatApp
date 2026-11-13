import nextEnv from '@next/env';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const { loadEnvConfig } = nextEnv;
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const rootEnvDir = fs.existsSync(path.resolve(process.cwd(), '../.env.local'))
  ? path.resolve(process.cwd(), '..')
  : process.cwd();

loadEnvConfig(rootEnvDir);

const isDev = process.env.NODE_ENV !== 'production';
const hasLocalBackend =
  process.env.NEXT_PUBLIC_BACKEND_URL?.includes('localhost') ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.includes('127.0.0.1') ||
  !process.env.NEXT_PUBLIC_BACKEND_URL;

// Chỉ cho phép các giao thức và nguồn hợp lệ:
// 1. https: & wss: (Giao thức bảo mật mã hóa TLS bắt buộc)
// 2. data: & blob: (Giao thức dữ liệu nội tuyến cho Turnstile, Web Worker, Media preview)
// 3. 'self': Chính domain ứng dụng
// 4. Các endpoint Cloudflare Turnstile / Captcha chính thức
// 5. Môi trường phát triển cục bộ: Cho phép riêng biệt localhost / 127.0.0.1
// -> TUYỆT ĐỐI LOẠI BỎ wildcard "http:" và "ws:" để không cho phép giao thức không an toàn ra Internet.
const devLocalSources = isDev || hasLocalBackend || process.env.ALLOW_LOCAL_CONNECT === 'true'
  ? 'http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*'
  : '';

const cspHeader = `
  connect-src 'self' data: blob: https: wss: ${devLocalSources} https://*.challenges.cloudflare.com https://challenges.cloudflare.com https://*.cloudflarecaptcha.com;
  frame-src 'self' https://challenges.cloudflare.com https://*.challenges.cloudflare.com https://*.firebaseapp.com;
`.replace(/\s{2,}/g, ' ').trim();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(self)',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    cpus: 1,
    agentUpgrade: "security",
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "@mui/material-nextjs",
      "lucide-react",
      "date-fns",
    ],
  },
  transpilePackages: ["@mui/material", "@mui/icons-material", "@mui/material-nextjs"],
  turbopack: { root: appRoot },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.VITE_BACKEND_URL ||
      "http://localhost:3000",
    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      process.env.VITE_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      process.env.VITE_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.VITE_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID:
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
      process.env.VITE_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
      process.env.VITE_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_SITE_KEY:
      process.env.NEXT_PUBLIC_SITE_KEY ||
      process.env.VITE_SITE_KEY ||
      process.env.VITE_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
      process.env.VITE_TURNSTILE_SITE_KEY ||
      process.env.VITE_SITE_KEY,
  },
};

export default nextConfig;
