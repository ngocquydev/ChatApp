# syntax=docker/dockerfile:1

# ==============================================================================
# 0. Development Stage: Môi trường phát triển Next.js với Hot Reload / Fast Refresh
# ==============================================================================
FROM node:22-alpine AS dev

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm install

ENV NODE_ENV=development
ENV PORT=5173
ENV WATCHPACK_POLLING=true

EXPOSE 5173

CMD ["dumb-init", "npm", "run", "dev"]

# ==============================================================================
# 1. Dependencies Stage: Cài đặt node_modules đầy đủ
# ==============================================================================
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install

# ==============================================================================
# 2. Builder Stage: Build Next.js 16 App Router
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Các biến môi trường client nhúng vào bundle lúc build
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
ARG NEXT_PUBLIC_SITE_KEY=0x4AAAAAAFUR2RRMbBht62MJ
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAFUR2RRMbBht62MJ

ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_SITE_KEY=${NEXT_PUBLIC_SITE_KEY}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}

RUN npm run build

# ==============================================================================
# 3. Runner Stage: Image chạy production tối ưu
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5173
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache dumb-init

# Sao chép public assets, bản build .next và node_modules với quyền sở hữu node:node
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Đảm bảo thư mục cache tồn tại và toàn bộ quyền ghi/sở hữu thuộc về user node
RUN mkdir -p /app/.next/cache/images && chown -R node:node /app/.next

USER node

EXPOSE 5173

CMD ["dumb-init", "npx", "next", "start", "-p", "5173", "-H", "0.0.0.0"]
