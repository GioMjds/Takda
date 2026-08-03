# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Source of truth.** `README.md` is the canonical project doc. Read it first, then the per-area `CLAUDE.md` for the workspace you're editing:
>
> - `mobile/CLAUDE.md` -- React Native (Expo) mobile app
> - `api/CLAUDE.md` -- NestJS API, Prisma, BullMQ, WebSockets
> - `api/ARCHITECTURE.md` -- backend feature-module layout, data access layers, validation, exceptions, barrels

## What this project is

**Takda** -- a queue and appointment booking platform for walk-in businesses in the informal service economy. Mobile app for customers and business owners; NestJS API for the queue, bookings, and live updates. See `README.md` for the full product vision and current vs. target data model.

## Repository layout

```folder
takda/
├── api/             NestJS 11 API (Prisma 7 + Postgres 17, BullMQ + Redis, Socket.IO)
├── mobile/          React Native (Expo SDK 57) + Expo Router + NativeWind 5
├── docker/          Local service Dockerfiles (postgres, redis, nginx)
├── docs/            activity log, tasks, to-dos, superpowers
├── scripts/         Repo-wide scripts (generate-barrels.mjs)
├── docker-compose.yml
└── README.md
```

**Folder naming gotcha.** The root `README.md` and `mobile/README.md` still refer to the mobile app folder as `app/`; on disk it is `mobile/`. Inside `mobile/src/`, Expo Router's file-based routes live under `mobile/src/app/` (route groups: `(auth)`, `(business)`, `(customer)`, `(public)`, `(shared)`).

**Workspaces.** `mobile/` and `api/` each have their own `pnpm-workspace.yaml` and own `package.json`. There is **no root `package.json` and no Turborepo.** Run all `pnpm` commands from inside the app folder you're editing; the root has no install step.

**Cross-app imports are forbidden.** Do not import across `mobile/` and `api/` directly. Shared types are duplicated in both apps and synced by hand.

## Common commands

Run these from inside each app folder unless stated otherwise.

### API (`api/`)

| Task               | Command                             |
| ------------------ | ----------------------------------- |
| Install deps       | `pnpm install`                      |
| Dev server (swc)   | `pnpm dev`                          |
| Production start   | `pnpm build` then `pnpm start:prod` |
| Lint (with --fix)  | `pnpm lint`                         |
| Unit tests         | `pnpm test`                         |
| Single unit test   | `pnpm test -- path/to/file.spec.ts` |
| Watch tests        | `pnpm test:watch`                   |
| Coverage           | `pnpm test:cov`                     |
| E2E tests          | `pnpm test:e2e`                     |
| Prisma generate    | `pnpm prisma generate`              |
| Regenerate barrels | `pnpm barrels`                      |

### Mobile (`mobile/`)

| Task                         | Command              |
| ---------------------------- | -------------------- |
| Install deps                 | `pnpm install`       |
| Dev server                   | `pnpm start`         |
| Open Android                 | `pnpm android`       |
| Open iOS                     | `pnpm ios`           |
| Open web                     | `pnpm web`           |
| Lint                         | `pnpm lint`          |
| Regenerate barrels           | `pnpm barrels`       |
| Reset scaffold (destructive) | `pnpm reset-project` |

Note: the mobile README still uses `npm install` / `npm run` snippets; the project itself uses `pnpm`.

### Local services

```bash
docker compose up -d postgres redis mailpit
```

Mailpit web UI: `http://localhost:8025`. API container: `docker compose up -d api`.

## High-level architecture

### Mobile (`mobile/src/`)

- **Routing**: Expo Router, file-based under `mobile/src/app/` (each route is a folder with `_layout.tsx` and `index.tsx`).
- **Root bootstrap**: `mobile/src/app/_layout.tsx` composes providers, storage, theme, and i18n.
- **Features**: `mobile/src/features/` -- each feature owns its hooks, API calls, sections, and UI. Cross-feature access goes through a feature's public barrel; features do not import from one another.
- **Layout folders** under `mobile/src/`: `components/`, `configs/`, `constants/`, `features/`, `hooks/`, `layouts/`, `lib/`, `locales/`, `providers/`, `services/`, `shared/`, `storage/`, `stores/`, `types/`, `utils/`, top-level `index.ts`.
- **State**: Zustand (`stores/`), TanStack Query (server state via `services/`), react-hook-form + Zod for forms.
- **Storage**: `expo-secure-store` for secrets, MMKV for app state.
- **Styling**: NativeWind 5 + Tailwind 4 (`global.css`, `nativewind-env.d.ts`). Fonts via `expo-font` (Manrope) registered in `app.json`.
- **Path alias**: `@/*` -> `./src/*` (`mobile/tsconfig.json`). Always use `@/...`, never relative `../../...`.
- **TS rules**: `strict: true`, no `any`, no `// @ts-ignore`.

### API (`api/src/`)

- **Bootstrap**: `api/src/main.ts` (CORS, cookies, versioning, global pipes). Root module `api/src/app.module.ts`. REPL at `api/src/repl.ts`.
- **Layout**: `app/`, `common/` (decorators/exceptions/filters/guards/pipes/services/utils, each with a barrel), `config/`, `shared/`, top-level `index.ts`.
- **Feature modules** under `api/src/modules/`: `appointments/`, `auth/`, `businesses/`, `health/`, `notifications/`, `prisma/`, `queues/`, `subscriptions/`, `users/`. Each follows the layout in `api/ARCHITECTURE.md`.
- **Layered data access** (strict, lower layers must not depend on upper): `Controller -> Service -> Repository -> PrismaService -> Postgres`.
- **Validation**: Zod schemas in `modules/<feature>/dto/<action>-<entity>.schema.ts`, executed by `ZodValidationPipe` in `common/pipes/`. Do not mix `class-validator` and Zod in the same DTO.
- **Errors**: `DomainException` hierarchy in `common/exceptions/`. `HttpExceptionFilter` in `common/filters/` returns standardized JSON. WebSocket errors go through `WsExceptionFilter`.
- **Auth**: `@nestjs/jwt` + bcrypt, guards in `common/guards/`. Roles via `@Roles` decorator.
- **Real-time**: `@nestjs/platform-socket.io`; gateways live next to their feature module.
- **Jobs**: BullMQ + `ioredis`; producers/processors live next to their feature module.
- **Eventing**: `@nestjs/event-emitter` for in-process events; payloads under `common/events/payloads/`.
- **Idempotency**: `@node-idempotency/nestjs` on write endpoints.
- **Hardening**: `helmet`, `compression`, `@nestjs/throttler` wired in the root module.
- **Prisma**: driver-adapter pattern with `@prisma/adapter-pg`. Generated client excluded from `tsconfig.json` (`exclude: ["node_modules", "dist", "src/generated"]`) -- regenerate with `pnpm prisma generate`.
- **Barrels**: every folder has a generated `index.ts` via `pnpm barrels` (script at `scripts/generate-barrels.mjs`). Import from barrels, not deep paths. Feature import path alias is `@/modules`.
- **Tests**: unit tests next to code (`*.spec.ts`); E2E in `api/test/` via `pnpm test:e2e`. Mock Redis, SMS, and DB in unit tests.

## Mobile routing conventions (Expo Router)

- File-based routes live in `mobile/src/app/`. Each route is a folder with `_layout.tsx` and an entry file (`index.tsx` or a named route).
- **Route groups** (parentheses, e.g. `(auth)/`, `(public)/`) organise routes by access role without showing up in the URL. Current groups: `(auth)`, `(business)`, `(customer)`, `(public)`, `(shared)`. Each group has its own `_layout.tsx` that gates the subtree on auth state.
- `+not-found.tsx` at the `app/` root is the global not-found route.
- `'use client'` is **not** used in Expo Router -- any file with hooks, state, or `expo-*` native APIs is implicitly client-side.

## Barrels and the generator

- Every folder in `mobile/src/` and `api/src/` has a generated `index.ts` (auto-managed by `scripts/generate-barrels.mjs`, run via `pnpm barrels`).
- Generated barrels start with `// Auto-generated barrel. Do not edit by hand.` -- do not hand-edit them.
- The generator **skips any directory named `app`** in the mobile tree, because that's an Expo Router subtree and barrels there would break routing. If you add a non-route folder inside `mobile/src/app/`, do not run barrels over it.
- The API's `src/modules/index.ts` is **hand-written** (the comment in the file explains why) -- when adding a new feature module, export it from there manually and update `app.module.ts`.

## Domain language (use these terms, not synonyms)

Defined in `README.md` section 6. The Prisma schema still models a clinic/doctor workflow -- `User`, `Patient`, `Doctor`, `Appointment`, `DoctorShift`, `QueueEntry`, `Notification`, `Feedback`, `AuditLog`, `ClinicSetting` -- and is converging toward the target model. The README tracks the target; the schema tracks where we are. When writing code, use the target terms in comments and identifiers only when they map cleanly to current schema fields.

## General principles

- Concise, short solutions. Watch for over-engineering and oversized files (300+ lines is the smell threshold).
- Match existing code style. Plain English in comments -- no technobabble.
- No emojis or special characters in code or comments.
- Right data structures for the job; least-privilege data exposure.
- No new top-level dependencies without checking each app's `package.json`. The stack is deliberately small -- surface new deps before adding them.
- `strict: true` everywhere. No `any`, no `// @ts-ignore`. Prefer `type` for data shapes, `interface` for classes and NestJS DI tokens.

## Task delegation

- Break large tasks into smaller pieces; track them as `/docs/to-dos/<task-name>.md`.
- Combine small tasks with other small tasks to make one substantive task.
- Always ask for user approval before starting a task and before committing.

## Version control

- Conventional commits, atomic, focused. Imperative mood, <=72-char subject, body explains _why_.
- Branch names: `<type>/<short-kebab-summary>` -- `feat/owner-dashboard`, `fix/sms-reminder-dedupe`.
- Do not auto-push any branch. Do not commit `.env*` files (they are gitignored). Review `pnpm-lock.yaml` churn before staging.

## Activity log

When the work is non-trivial or gets messy, write `docs/activity-log.md` so future sessions can resume without re-deriving context. Do not auto-commit `docs/` files. Reference related to-dos and tasks by path.

## AI restrictions

- No user personal data (names, contacts, account numbers, transactions) unless explicitly approved.
- No credentials (passwords, API keys, tokens, connection strings) in code or commits, except in local development mode.
