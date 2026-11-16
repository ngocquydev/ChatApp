# Self-Hosting Guide (`apps/web`, `apps/server`, `apps/admin`)

## 1. Prerequisites
- **Node.js**: 20+ (LTS)
- **Docker & Docker Compose**: Required for local/self-hosted MongoDB, Redis, and Neo4j (or use managed MongoDB Atlas, Upstash Redis, and Neo4j Aura).

## 2. Environment Configuration
Copy `.env.example` to `.env.local` at the repository root:

```bash
cp .env.example .env.local
```

All three applications (`apps/server`, `apps/web`, `apps/admin`) automatically load variables from the root `.env.local`.

## 3. Running with Docker Compose
To start all databases and services (`redis`, `mongo`, `neo4j`, `backend`, `frontend`, `admin`):

```bash
docker compose up -d --build
```

To start only the databases for local development:

```bash
docker compose up -d mongo redis neo4j
```

## 4. Running Services Locally (Monorepo)
From the repository root:

```bash
# Start Backend API (NestJS - Port 3000)
npm run dev:server

# Start Web Frontend (Next.js 16 - Port 5173)
npm run dev:web

# Start Admin Portal (React 19 + Vite - Port 5174)
npm run dev:admin
```

## 5. Production Builds & Quality Checks
```bash
# Run static security/RAM/N+1 inspection, lint, typecheck, and unit tests
npm run check

# Build all three applications
npm run build
```

