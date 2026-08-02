# Takda

> Queue and appointment booking for walk-in businesses. Mobile app on
> React Native (Expo); API on NestJS. This README is the source of truth.
> Read it first, then the workspace `CLAUDE.md`/`AGENTS.md` for the area
> you're editing.

---

## 1. What is Takda?

Takda is a **queue and appointment booking platform for walk-in
businesses** targeted at the informal service economy.

**Core flow:**

1. A business owner registers and configures their **capacity / slots**
   (e.g. "30 slots per day, 1 slot every 5 minutes, open 8am-5pm").
2. Customers **scan a QR code** at the storefront (or open a shared link).
3. The customer picks a slot, enters a name + phone number, and books.
4. The system sends a **SMS reminder** before the slot.
5. The owner sees a **live queue** for the day, can mark arrivals,
   no-shows, and walk-ins.

**Why this product, not Calendly / Square Appointments:** those tools are
designed for scheduled professional services in Western markets (one
booking = one paid appointment, far in advance). Takda targets high-volume,
low-friction, same-day, walk-in-heavy businesses where the queue itself
is the product.

**Non-goals (do not add without discussion):**

- A separate web PWA for customers (for v1, mobile is the only customer
  surface).
- Payments / tipping (out of scope for v1).
- Multi-tenant SaaS billing flows (we are a single-tenant-per-deployment
  product, multi-business per tenant).

> **Current model note.** The Prisma schema (`api/prisma/schema.prisma`)
> currently models a clinic/doctor workflow: `User`, `Patient`, `Doctor`,
> `Appointment`, `DoctorShift`, `QueueEntry`, `Notification`, `Feedback`,
> `AuditLog`, `ClinicSetting`. The queue/booking vision above is the end
> state; the schema will converge toward it. The README tracks the
> vision, not the in-progress schema.

---

## 2. Repository layout

```folder
takda/
├── app/          React Native (Expo) mobile app
├── api/          NestJS API
├── docker/       Dockerfiles for local services (postgres, redis, nginx)
├── docs/         Activity log, notes, decisions
├── scripts/      Repo-wide scripts (e.g. generate-barrels.mjs)
├── docker-compose.yml
└── README.md
```

There is no `packages/shared` workspace. Shared types live in each app
and are kept in sync by hand. Do not import across `app/` and `api/`
directly.

---

## 3. Tooling (use exactly these versions / commands)

| Concern           | Tool                                                 | Notes                               |
| ----------------- | ---------------------------------------------------- | ----------------------------------- |
| Package manager   | **pnpm** (workspaces, per-app)                       | `pnpm install` inside each app.     |
| Language          | **TypeScript** (`strict: true`)                      | No `any`, no `// @ts-ignore`.       |
| Format            | **Prettier** (per-app `.prettierrc`)                 | Run before committing.              |
| Lint              | **ESLint 9 (flat config)**                           | Per-app configs.                    |
| Mobile framework  | **React Native** + **Expo SDK 57** (Expo Router)     | `app/`                              |
| Mobile styling    | **NativeWind 5** + **Tailwind 4**                    | `app/`                              |
| Mobile state      | **Zustand**, **react-hook-form**, **TanStack Query** | `app/`                              |
| Mobile validation | **Zod 4**                                            | `app/`                              |
| Mobile storage    | **expo-secure-store**, **MMKV**                      | `app/`                              |
| API framework     | **NestJS 11**                                        | `api/`                              |
| ORM / DB          | **Prisma 7** + **Postgres 17** (driver adapter)      | Schema in `api/prisma/`.            |
| Queue / jobs      | **BullMQ** + **Redis 8**                             | SMS, no-show follow-ups.            |
| Real-time         | **Socket.IO** (`@nestjs/platform-socket.io`)         | Live queue updates.                 |
| Auth              | **JWT** (`@nestjs/jwt`) + bcrypt                     | `api/`                              |
| Validation        | **Zod 4**                                            | `api/`                              |
| API hardening     | **helmet**, **@nestjs/throttler**, compression       | `api/`                              |
| Email (dev)       | **Mailpit**                                          | Local SMTP catcher.                 |
| Codegen           | **scripts/generate-barrels.mjs**                     | Run via `pnpm barrels` in each app. |

---

## 4. Universal rules

### 4.1 TypeScript

- `strict: true` is on. No `any`, no `// @ts-ignore`. Use `unknown` and
  narrow.
- Prefer `type` over `interface` for plain data shapes; use `interface`
  for classes and NestJS DI tokens.
- Do not add new top-level dependencies without first checking the app's
  `package.json`. If the dependency is genuinely app-specific, add it
  there -- not to a root file (there is no root `package.json`).

### 4.2 Code style

- Prettier config is the source of truth. Don't fight it.
- 2-space indent, single quotes, trailing commas, LF line endings.
- File names: `kebab-case.ts` for regular files, `PascalCase.tsx` for
  React components, `kebab-case.spec.ts` for tests.
- One responsibility per file. If a file passes 300 lines, it almost
  certainly needs to be split.

### 4.3 Git

- Branch names: `<type>/<short-kebab-summary>` -- e.g.
  `feat/owner-dashboard`, `fix/sms-reminder-dedupe`.
- Commit messages: imperative mood, <=72-char subject, body explains
  _why_. Reference the issue / ticket ID when one exists.
- Don't commit `.env*` files. They are in `.gitignore`; keep them that way.
- Don't commit `pnpm-lock.yaml` churn from a one-off `pnpm add` you
  didn't mean to keep -- review the diff before staging.

### 4.4 Definition of done (any non-trivial change)

A change is "done" only when **all** of these are true:

1. It builds (the app's `build`/`start` script passes).
2. It typechecks (the app's `tsc` / typecheck script passes).
3. It lints (`pnpm lint` passes for the touched app).
4. It has tests for behavior it adds or changes (see section 5).
5. It does not regress an existing test, typecheck, or build.
6. It does not introduce a TODO without an owner and a target date.

### 4.5 Workspace execution rules

- Each app (`app/`, `api/`) has its own `pnpm-workspace.yaml`. Run
  commands from inside the app, or use
  `pnpm --filter <app-name> <command>` from that app's directory.
- The repo root has no Turborepo, no Turbo config, and no root
  `package.json`. Don't invent one.

### 4.6 React Native (Expo Router) -- mobile app architecture

- **File-based routing** lives in `app/src/app/`. Each route is a
  directory with `_layout.tsx` and `index.tsx` (or other entry files).
- **App-wide bootstrapping** lives in `app/src/app/_layout.tsx`. It
  composes the providers in `app/src/providers/`, the storage in
  `app/src/storage/`, the theme in `app/src/components/ThemeProvider.tsx`,
  and the i18n / locale setup in `app/src/locales/`.
- **`app/src/features/`** holds feature modules. Each feature owns its
  hooks, API calls, sections, and UI. Features do not import directly
  from one another; cross-feature access goes through a feature's
  public barrel.
- **`app/src/` layout:**
  - `app/` -- Expo Router routes (`_layout.tsx`, `index.tsx`).
  - `components/` -- shared UI primitives (e.g. `StyledText`,
    `ThemeProvider`).
  - `configs/` -- runtime config (e.g. `fetch.ts`).
  - `constants/` -- app-wide constants.
  - `features/` -- feature modules.
  - `hooks/` -- shared custom hooks.
  - `layouts/` -- shared layouts (e.g. `BottomTabs`, `Header`).
  - `lib/` -- third-party integration glue.
  - `locales/` -- i18n message catalogs.
  - `providers/` -- React context providers composed at the root.
  - `services/` -- cross-feature services (e.g. push notifications).
  - `shared/` -- app-local shared utils, types, and constants.
  - `storage/` -- secure storage (expo-secure-store) and MMKV.
  - `stores/` -- Zustand stores.
  - `types/` -- ambient types.
  - `utils/` -- pure util functions.
  - `index.ts` -- top-level barrel.
- **TS path alias** is `@/*` -> `./src/*` (set in `app/tsconfig.json`).
  Use `@/...` everywhere, never relative `../../...` for cross-folder
  imports.
- **Directives:**
  - `'use client'` is not used in Expo Router. Mark interactive files
    by where they live (any file that uses hooks, state, refs, or
    `expo-*` browser/native APIs is implicitly client-side).
  - Server-only modules go in `*.server.ts`; web/native-only modules go
    in `*.client.ts` only when the bundler actually needs to split.
- **Barrels**: every app folder has a generated `index.ts` via
  `pnpm barrels`. Keep imports flowing through the local barrel.
- **Image, font, and asset handling** uses
  `expo-image`, `expo-font`, and the `assets/` folder wired through
  `app.json` (`expo-font` plugin currently registers the Manrope family).
- **Notifications and permissions** (`expo-notifications`, `expo-camera`,
  `expo-image-picker`) are configured per-feature; request lazily.

### 4.7 NestJS -- API architecture

- **Bootstrap** is `api/src/main.ts`. The root module is
  `api/src/app/app.module.ts`. A REPL entry is exposed at
  `api/src/repl.ts`.
- **`api/src/` layout:**
  - `app/` -- `app.module.ts` and any app-level wiring.
  - `common/` -- cross-cutting concerns: `decorators/`, `exceptions/`,
    `filters/`, `guards/`, `pipes/`, `services/`, `utils/`. Each has a
    barrel.
  - `config/` -- typed config (`env.ts`, `index.ts`).
  - `prisma/` -- `PrismaModule` and `PrismaService`.
  - `index.ts` -- top-level barrel.
- **Feature modules** (e.g. `auth/`, `appointments/`, `queue/`) live
  under `api/src/` and follow the NestJS feature-module pattern:
  `module`, `controller`, `service`, `dto/`, `entities/`, `*.spec.ts`.
- **Prisma** uses the driver-adapter pattern with `@prisma/adapter-pg`
  (see `api/prisma/schema.prisma`). The generated client is intentionally
  excluded from `tsconfig.json` (`exclude: ["node_modules", "dist",
"src/generated"]`); regenerate with `pnpm prisma generate`.
- **Real-time** uses `@nestjs/platform-socket.io` and `socket.io`. Web
  socket gateways live next to their feature module.
- **Jobs** use BullMQ with Redis (`ioredis`). Queue producers and
  processors live next to their feature module.
- **Auth** uses `@nestjs/jwt` with bcrypt-hashed passwords. Tokens are
  issued by the auth feature and validated by guards in `api/src/common/`.
- **Hardening** is on by default: `helmet`, `compression`, and
  `@nestjs/throttler` (rate limiting) are wired in the root module.
- **Validation** uses Zod schemas. Wrap them in a `ZodValidationPipe`
  in `api/src/common/pipes/`. Don't mix `class-validator` and Zod in
  the same DTO.
- **Eventing** uses `@nestjs/event-emitter` for in-process events.
- **Idempotency** for write endpoints uses `@node-idempotency/nestjs`.
- **Tests** unit tests live next to code (`*.spec.ts`). E2E tests live
  in `api/test/` and run via `pnpm test:e2e`. Mock Redis, the SMS
  provider, and the DB in unit tests.

---

## 5. Testing

- **Unit tests** live next to the code: `*.spec.ts` for Nest, `*.test.ts`
  for shared/utility code, `*.test.tsx` for React components.
- **Integration / E2E tests** for the API live in `api/test/`.
- Tests must run in CI without network calls. Mock SMS, Redis, Mailpit,
  and the DB in unit tests. Use the test DB only in `test:e2e`.
- A change without a test for new behavior will be sent back. The test
  does not need to be elaborate; even a "happy path + one failure mode"
  is enough for a first pass.

---

## 6. Domain model (the language we use)

These terms mean the same thing across both apps. Don't invent synonyms.

- **Tenant** -- one deployment of Takda. (For v1, we ship one tenant
  per deployment; later this becomes "organization".)
- **Business** -- a single walk-in business inside a tenant. The owner
  logs in here, the QR code points here.
- **Service** -- a bookable offering of the business (e.g. "Haircut",
  "Stall #3 dry goods pickup"). A business has 1..N services.
- **Slot** -- a single bookable unit of capacity for a service at a time.
- **Booking** -- a customer's reservation of one slot. Status:
  `pending` -> `confirmed` -> `checked_in` / `no_show` / `cancelled`.
- **Queue position** -- derived: the customer's ordinal position among
  today's `confirmed` bookings for a business, sorted by slot start time.
- **Reminder** -- a scheduled SMS job tied to a booking, sent T-X minutes
  before the slot.
- **Walk-in** -- a customer served without a booking; the owner adds
  them to the queue manually so capacity tracking stays honest.

The Prisma schema in `api/prisma/schema.prisma` is the storage contract.
Mobile and API both speak the same terms; mismatches surface in code
review, not in production.

---

## 7. Local development

### 7.1 One-time setup

```bash
# 1. Bring up Postgres, Redis, and Mailpit (and the API container)
docker compose up -d postgres redis mailpit

# 2. Install API deps and generate the Prisma client
cd api
pnpm install
pnpm prisma generate

# 3. Install mobile deps
cd ../app
pnpm install
```

### 7.2 Running

- **API**: `cd api && pnpm dev` (Nest in watch mode, swc).
- **Mobile**: `cd app && pnpm start` (Expo Dev Server). Then press
  `a` (Android), `i` (iOS), or `w` (web) to open a target. Use
  `pnpm android`, `pnpm ios`, `pnpm web` for direct launch.
- **Reset the mobile scaffold** (destructive): `cd app && pnpm reset-project`.

### 7.3 Environment & secrets

- Each app has its own `.env`. Copy from `.env.example` if present. Real
  secrets never go in the repo.
- Required services in dev: Postgres, Redis, an SMS provider key.
- The API reads `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and the SMS
  provider key from `process.env`. The mobile app reads `EXPO_PUBLIC_*`
  variables for anything that reaches the device. Anything else stays
  in the API.
- Mailpit catches local email at `localhost:1025` (SMTP) and
  `localhost:8025` (web UI).

---

## 8. When you're stuck

- Read the workspace `CLAUDE.md` / `AGENTS.md` for the app you're
  editing -- most area-specific rules live there, not here.
- Search before you ask: a quick `Grep` for the symbol often surfaces
  the pattern we already use.
- If you find yourself wanting to add a new dependency, framework, or
  pattern that isn't already in the repo, surface it before writing
  code. Takda's stack is deliberately small.

---

## 9. Pointers to workspace docs

- [app/CLAUDE.md](./app/CLAUDE.md) -- React Native (Expo) mobile app
- [api/CLAUDE.md](./api/CLAUDE.md) -- NestJS API, Prisma, BullMQ, WebSockets
- [docs/](./docs/) -- activity log, notes, decisions
