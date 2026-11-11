# syntax=docker/dockerfile:1

# ==============================================================================
# 0. Development Stage: Môi trường phát triển với Hot Reload (Watch mode)
# ==============================================================================
FROM node:22-alpine AS dev

WORKDIR /app

RUN apk add --no-cache python3 make g++ aws-cli libwebp-tools dumb-init ffmpeg

COPY package*.json ./
RUN npm install

ENV NODE_ENV=development
ENV PORT=3000
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true

RUN mkdir -p /app/uploads/posts /app/certs

EXPOSE 3000

CMD ["dumb-init", "npm", "run", "start:dev"]

# ==============================================================================
# 1. Build Stage: Biên dịch ứng dụng NestJS TypeScript
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Cài đặt công cụ biên dịch cho các module C++ native (như bcrypt)
RUN apk add --no-cache python3 make g++ aws-cli libwebp-tools

COPY package*.json ./
RUN npm install

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

RUN npm run build

# ==============================================================================
# 2. Production Dependencies Stage: Tách biệt chỉ giữ lại production node_modules
# ==============================================================================
FROM node:22-alpine AS prod-deps

WORKDIR /app

RUN apk add --no-cache python3 make g++ aws-cli libwebp-tools

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# ==============================================================================
# 3. Production Runner Stage: Image tối giản, nhẹ và bảo mật cao
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Cài đặt dumb-init để xử lý tín hiệu OS (SIGTERM, SIGINT) chuẩn xác
RUN apk add --no-cache dumb-init ffmpeg

# Sao chép các tệp thực thi từ các stage trước
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Tạo thư mục uploads và certs rỗng, gán quyền user node không root
RUN mkdir -p /app/uploads/posts /app/certs && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
