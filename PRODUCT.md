# Product Overview

ChatApp is a real-time chat and social application with content moderation and bot-abuse prevention. Agent workflow is in [AGENTS.md](./AGENTS.md), and UI constraints are in [DESIGN.md](./DESIGN.md).

## Product areas

| Area | Stack / responsibility |
|---|---|
| `frontend/` | Next.js 16 App Router, React 19, MUI v9, Zustand, Socket.IO, Protobuf, React Hook Form, Zod; user application on port 5173 |
| `admin/` | React 19, Vite, React Router v7, MUI v9, Zustand, Lucide; administration interface on port 5174 |
| `backend/` | NestJS, MongoDB, Redis, Socket.IO, Swagger; API and realtime services on port 3000 |
| Infrastructure | Docker Compose with MongoDB, Redis, and Neo4j |

Moderation and trust capabilities include NLP, vision, Isolation Forest, and autoencoder-based components.

## Localization

Supported locales are Vietnamese (`vi`, default), English (`en`), Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Korean (`ko`), and Thai (`th`). When visible UI text changes, update translation types and dictionaries for all six locales in each affected app (`frontend/` and/or `admin/`). Use translation keys rather than hard-coded JSX/TSX copy.

## Posts

- The posts module is in `backend/src/modules/posts/`. It supports creating posts, soft deletion, reactions, comments, sharing, `public | friends | only_me` privacy, and cursor pagination.
- Post media is stored by the upload service; post image/video paths are validated, and uploads are gitignored.
- The frontend shares `components/posts/PostFeed` between the main feed, profile posts, and user timelines. Cursor lists use `hooks/usePagedList` and `hooks/useInfiniteSentinel`; deletion uses `components/common/ConfirmDialog`.
- When resetting test data, use `deleteMany`; do not drop a database while the app is running because that removes indexes and can invalidate test results.

## Local development

Start local services from the repository root with `docker compose up -d`. Run each application from its own directory using the commands listed in [AGENTS.md](./AGENTS.md).
