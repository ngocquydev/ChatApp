# Agent Instructions

Read file skills AGENTS WORKS
This file is the entry point for agents working in this repository. Read it before making changes. Product context lives in [PRODUCT.md](./PRODUCT.md), and UI/design constraints live in [DESIGN.md](./DESIGN.md).

## Project layout and commands

| Area           | Stack                                                                                   | Development command                      |
| -------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| `apps/web/`    | Next.js 16 App Router, React 19, MUI v9, Zustand, Socket.IO, Protobuf, React Hook Form, Zod | `npm run dev` (port 5173)                |
| `apps/admin/`  | React 19, Vite, React Router v7, MUI v9, Zustand, Lucide                                | `npm run dev` (port 5174)                |
| `apps/server/` | NestJS, MongoDB, Redis, Socket.IO, Swagger                                              | `npm run start:dev` (port 3000)          |
| Infrastructure | Docker Compose, MongoDB, Redis, Neo4j                                                   | `docker compose up -d` (repository root) |

Quality scripts: `.github/scripts/check.ps1` (Windows), `.github/scripts/check.sh`; the repository security/RAM/N+1 inspection is `node .github/scripts/ci-inspect.mjs`.

## Working rules

1. Before work, consult `.agents/skills/using-agent-skills/SKILL.md` and read the applicable skill in `.agents/skills/*/SKILL.md`. Use `incremental-implementation` for changes spanning two or more files. For new behavior, use `test-driven-development` and `planning-and-task-breakdown` as applicable.
2. Keep changes within the requested scope. Preserve unrelated edits, comments, and docstrings; do not change product behavior without a requirement.
3. Validate all user input (Zod on the frontend; DTO/class-validator on the backend). Do not commit real `.env` files, log tokens or personal data, or store authentication tokens in `localStorage`; tokens belong in HttpOnly cookies.
4. When changing visible UI copy, use the translation system and update all six supported locales (`vi`, `en`, `zh-CN`, `zh-TW`, `ko`, `th`) wherever that UI is translated. Never hard-code static user-facing strings in JSX/TSX. See [PRODUCT.md](./PRODUCT.md) for locale policy and [DESIGN.md](./DESIGN.md) for UI rules.
5. For a user-facing feature or substantial UI/module change, update the relevant README/docs and provide a demo screenshot where the environment supports it. Do not claim browser verification if a browser could not be run; report the limitation.
6. For frontend changes, run `npm run typecheck` and `npm run lint` from `frontend/`. For routing, metadata, configuration, or broad frontend changes, also run `npm run build`. For backend changes, run backend typecheck, lint, and tests using the scripts defined in `backend/package.json`. Run broader repository quality gates when they apply and can be run in the environment.
7. Do not lower quality gates to make a change pass: do not add `@ts-ignore`, blanket lint disables, skip/delete tests, or use `any` broadly. Diagnose failures and fix the underlying issue when it is in scope.
8. Use English Conventional Commit messages if a commit is requested or otherwise authorized: `<type>(<scope>): <imperative summary>`. Do not commit or push unless the user explicitly requests it or the current task clearly authorizes it. Never force-push.

## Skills by task

| Task                                               | Skills                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Frontend UI/UX                                     | `chatapp-design-system` → `chatapp-ux-patterns` → `mui-nextjs-conventions` → `frontend-ui-verification` |
| Components, layout, accessibility, responsive UI   | `frontend-ui-engineering` and `.agents/references/accessibility-checklist.md`                           |
| Browser runtime verification                       | `browser-testing-with-devtools`                                                                         |
| API or frontend/backend contract                   | `api-and-interface-design`                                                                              |
| Bugs, failed checks, build errors                  | `debugging-and-error-recovery`                                                                          |
| New behavior or logic changes                      | `test-driven-development`, `planning-and-task-breakdown`                                                |
| Authentication, user input, cookies, personal data | `security-and-hardening`                                                                                |
| Performance                                        | `performance-optimization`                                                                              |
| Logging, metrics, tracing                          | `observability-and-instrumentation`                                                                     |
| Review                                             | `code-review-and-quality`, optionally `code-simplification`                                             |
| Git changes                                        | `git-workflow-and-versioning`                                                                           |
| Documentation or ADRs                              | `documentation-and-adrs`                                                                                |
| Framework/library APIs                             | `source-driven-development`                                                                             |

## Frontend completion checks

At minimum, run in `frontend/`:

```powershell
npm run typecheck
npm run lint
```

Run `npm run build` for routing, metadata, configuration, or broad changes. For UI changes, follow `frontend-ui-verification`, including the 320, 390, 768, 1024, and 1440 px viewports when browser access is available. State any unverified runtime/browser checks in the report.

## Documentation and demo expectations

For a user-facing feature or substantial UI/module change, update `README.md` and the relevant documentation under `docs/` (including `docs/features/` or `docs/demo.md` when applicable). Capture a screenshot under `docs/assets/screenshots/` when the app and browser can be run. Start required local dependencies with `scripts/ensure-docker.ps1` only when needed and available. Do not claim a screenshot or runtime check that was not produced.
