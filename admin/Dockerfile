# syntax=docker/dockerfile:1

# ==============================================================================
# 1. Build Stage: Biên dịch ứng dụng Vite React SPA
# ==============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_BACKEND_URL=http://localhost:3000
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

RUN npm run build

# ==============================================================================
# 2. Production Stage: Phục vụ qua Nginx Alpine siêu nhẹ
# ==============================================================================
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5174

CMD ["nginx", "-g", "daemon off;"]
