# NestJS Module Skeleton & Contracts — Design Spec

Date: 2026-08-02
Scope: `api/` (NestJS backend)
Status: approved (skeleton + contracts only, no business logic)

## 1. Purpose

The `api/` repo is currently scaffolded: dependencies installed, Prisma schema defined, infrastructure folders in place (`prisma/`, `config/`, `common/`, `shared/`), and most domain modules exist as single empty files (`appointments.module.ts`, `businesses.module.ts`, etc.). Only `auth/` has a controller and service stub.

This spec defines a complete **skeleton structure and contract layer** for every module so that future implementation work has clear boundaries, predictable file layouts, and typed entry points. No business logic is implemented here. No DTO-to-Prisma mapping logic is written. Methods are stubs.

## 2. Decisions Locked

| Decision               | Choice                                                           |
| ---------------------- | ---------------------------------------------------------------- |
| Architecture           | Feature modules (NestJS)                                         |
| Module set             | Mirror current folder names                                      |
| Data access pattern    | Service -> Repository -> Prisma                                  |
| File layout per module | Flat: controller, service, repository, `dto/`, `index.ts` barrel |
| Validation             | Zod only (no class-validator)                                    |
| Cross-module imports   | Public service only (exported via module's `exports`)            |
| Design doc location    | `docs/superpowers/specs/` (repo root)                            |

## 3. Module Map

### 3.1 Modules

| Module          | Folder               | Owns (Prisma models)                               | Exports                                                                     |
| --------------- | -------------------- | -------------------------------------------------- | --------------------------------------------------------------------------- |
| `auth`          | `src/auth/`          | none                                               | `AuthService`                                                               |
| `users`         | `src/users/`         | `User`, `AuditLog`                                 | `UsersService`, `AuditService`                                              |
| `businesses`    | `src/businesses/`    | (placeholder)                                      | reserved                                                                    |
| `appointments`  | `src/appointments/`  | `Appointment`, `Feedback`, `Doctor`, `DoctorShift` | `AppointmentsService`, `DoctorsService`                                     |
| `queues`        | `src/queues/`        | `QueueEntry`                                       | `QueuesService`                                                             |
| `notifications` | `src/notifications/` | `Notification`                                     | `NotificationsService`                                                      |
| `subscriptions` | `src/subscriptions/` | (placeholder)                                      | reserved                                                                    |
| `health`        | `src/health/`        | none                                               | none                                                                        |
| `prisma`        | `src/prisma/`        | n/a                                                | `PrismaService` (global)                                                    |
| `config`        | `src/config/`        | n/a                                                | `ENV` constants                                                             |
| `shared`        | `src/shared/`        | n/a                                                | re-exports selected `common/*` pieces                                       |
| `common`        | `src/common/`        | n/a                                                | decorators, guards, pipes, filters, exceptions, services (no NestJS module) |

### 3.2 Wiring rules

- `PrismaModule` is `@Global()`. Every module can inject `PrismaService` without re-importing.
- `SharedModule` re-exports common pieces so domain modules import one symbol instead of many.
- Domain modules (`appointments`, `queues`, `notifications`) depend on `users` and `auth` only when they need them.
- `auth` depends on `users` and `config`.
- Dependency direction is one-way: infrastructure (`prisma`, `config`, `common`, `shared`) -> domain. Domain modules never depend on each other circularly.
- `health/` depends on nothing domain-specific.

### 3.3 Module dependency table

| Module          | Imports                                                      |
| --------------- | ------------------------------------------------------------ |
| `prisma`        | (none)                                                       |
| `config`        | (none)                                                       |
| `common`        | (none)                                                       |
| `shared`        | `common`                                                     |
| `health`        | (none)                                                       |
| `users`         | `prisma`, `shared`                                           |
| `auth`          | `users`, `config`, `shared`, `prisma`                        |
| `appointments`  | `users`, `prisma`, `shared`                                  |
| `queues`        | `appointments`, `notifications`, `users`, `prisma`, `shared` |
| `notifications` | `users`, `prisma`, `shared`                                  |
| `businesses`    | `prisma`, `shared` (placeholder)                             |
| `subscriptions` | `prisma`, `shared` (placeholder)                             |

## 4. Per-Module File Layout

Applied to every domain module (`auth`, `users`, `appointments`, `queues`, `notifications`):

```
src/<module>/
  <module>.module.ts          # @Module wiring (controllers, providers, exports)
  <module>.controller.ts      # thin: route -> service
  <module>.service.ts         # business rules; orchestrates repositories + other services
  <module>.repository.ts      # the only file allowed to import PrismaService
  dto/
    <entity>.schema.ts        # one Zod schema per CRUD verb or entity
    index.ts                  # barrel: schemas + z.infer types
  index.ts                    # barrel: exports <Module>Module + public types only
```

Placeholder modules (`businesses`, `subscriptions`) keep only `<module>.module.ts`, `<module>.service.ts`, and `index.ts`. They have no controller, repository, or `dto/` folder until they own models.

`health/` keeps only `health.module.ts`, `health.controller.ts`, and a stub `HealthService`.

### 4.1 Layering rules

1. **Controller** never imports `PrismaService`. Only injects the module's `Service`.
2. **Service** never imports `PrismaService`. Only injects the module's `Repository` and other modules' services.
3. **Repository** is the only file allowed to import `PrismaService`. It exposes typed methods that return plain objects (see 4.3).
4. **DTOs** are Zod schemas. Types come from `z.infer`. No `class-validator` decorators anywhere.
5. **Module root barrel** (`index.ts`) re-exports the NestJS module class and any public-facing types. The controller, service, and repository stay module-private.
6. **DTO barrel** (`dto/index.ts`) re-exports schemas and inferred types.

### 4.2 Skeleton snippets

Service:

```ts
import { Injectable } from "@nestjs/common";
import { AppointmentsRepository } from "./appointments.repository";

@Injectable()
export class AppointmentsService {
  constructor(private readonly repo: AppointmentsRepository) {}

  // TODO: implement per feature plan
}
```

Repository:

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement per feature plan
}
```

Module:

```ts
import { Module } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { AppointmentsRepository } from "./appointments.repository";

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
```

Controller routes resolve and return 501 / `NotImplementedException` until methods are filled in.

### 4.3 Repository boundary: Prisma types do not leak

Repositories convert Prisma's return types into plain objects before returning. In particular:

- `BigInt` IDs become **strings** on the way out (via `.toString()`).
- `Date` values pass through as ISO strings where they leave the module boundary; internal repository code keeps `Date` and `bigint`.
- Nested relations are explicitly selected; `include` calls are owned by the repository so consumers never see `Prisma.AppointmentGetPayload<...>`.

A single helper `toAppointmentPublic(row: PrismaAppointment): AppointmentPublic` lives next to each repository.

## 5. Contracts (DTOs, Errors)

### 5.1 DTO style

```ts
// dto/create-appointment.schema.ts
import { z } from "zod";

export const CreateAppointmentSchema = z
  .object({
    patientId: z.coerce.bigint().positive(),
    doctorId: z.coerce.bigint().positive(),
    appointmentStart: z.coerce.date(),
    appointmentEnd: z.coerce.date(),
    source: z.enum(["Online", "Phone", "Walk_in", "Staff"]).default("Online"),
    reason: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.appointmentEnd > d.appointmentStart, {
    message: "appointmentEnd must be after appointmentStart",
    path: ["appointmentEnd"],
  });

export type CreateAppointmentDto = z.infer<typeof CreateAppointmentSchema>;
```

Conventions:

- File name: kebab-case + `.schema.ts`. Matches project CLAUDE.md.
- One schema per CRUD verb or entity. Larger modules get multiple schema files.
- Each schema file exports both the schema and the inferred type.
- Refinements live in the schema (`.refine(...)`); the service trusts validated input.

### 5.2 BigInt vs cuid

Prisma uses `BigInt` for IDs on `Patient`, `Doctor`, `Appointment`, `Notification`, `QueueEntry`, `Feedback`, `AuditLog` (entityId), and `DoctorShift`. `User.id` is `String` (cuid).

- Zod schemas mirror this: `z.coerce.bigint().positive()` for BigInt IDs; `z.string().cuid()` for cuid IDs.
- At the repository boundary, BigInt IDs become string IDs in any object leaving the module. Internal repository code may use `bigint`.
- `JSON.stringify` of a `bigint` throws — the `toXPublic` helpers at the repository boundary prevent that.

### 5.3 Enum drift protection

Zod enums mirror Prisma enums 1:1. After scaffold, the Zod enums are frozen and a comment at the top of each schema file points to the corresponding Prisma model:

```ts
// Keep in sync with prisma/schema.prisma -> AppointmentSource
```

A future task (not in this scaffold) could codegen the Zod enums from Prisma; for now, the comment is the contract.

### 5.4 Error contract

Extend `common/exceptions/domain.exception.ts`:

- `DomainException` (base, already exists)
- `NotFoundException extends DomainException`
- `ConflictException extends DomainException`
- `ValidationException extends DomainException`

Services throw `DomainException` subclasses. The existing `http-exception.filter.ts` maps them to HTTP status codes (404, 409, 422). Repositories throw `NotFoundException` when `findUnique` returns `null`.

### 5.5 Cross-module contract rule

A module's public surface is exactly what its root `index.ts` re-exports. Consumers import the service via the module's exported provider and inject it by class token:

```ts
constructor(private readonly appointments: AppointmentsService) {}
```

`appointments.repository.ts` is module-private. Other modules cannot reach it even by accident because it is not in the module's `exports` array.

## 6. Conventions

Codify in the implementation plan and in code review:

- File names kebab-case. Matches CLAUDE.md.
- No emojis in code or comments. Matches CLAUDE.md.
- Imports:
  - within a module: relative (`./appointments.repository`)
  - across modules: barrel (`../appointments`)
- No business logic in controllers, even in the skeleton. Stub methods throw `NotImplementedException` with a `TODO` comment so the scaffold compiles and routes resolve.
- Each module file <= 150 lines. If it grows, split. Aligns with CLAUDE.md "watch for oversized files".
- No barrel re-exports of internals. Controller, service, repository stay module-private.
- No new external libraries. The scaffold uses what is already in `package.json` (NestJS, Prisma, Zod, BullMQ, Socket.IO, class-transformer, helmet, throttler, etc.).

## 7. Implementation Order

The order files appear in the plan. Each step must compile before moving on.

1. `prisma/` — verify `PrismaModule` is `@Global()`.
2. `config/` — confirm `ENV` covers JWT secret, DB url, Redis url, port.
3. `common/` — verify barrels; document barrel pattern.
4. `shared/` — re-export selected `common/*` pieces.
5. `health/` — minimal smoke test for the scaffold.
6. `users/` — base; `auth` depends on it.
7. `auth/` — refactor existing minimal scaffold into full skeleton.
8. `businesses/`, `subscriptions/` — placeholders.
9. `appointments/` — full skeleton; biggest module.
10. `queues/` — full skeleton; depends on `appointments` and `notifications`.
11. `notifications/` — full skeleton.

## 8. Extension Points (Stubbed, Not Implemented)

These are left as explicit placeholders, not built:

- `notifications/notifications.gateway.ts` — Socket.IO gateway skeleton, not registered.
- `queues/` — BullMQ queue names exported as constants in `common/utils/queue.ts` (file already exists per scaffold). Producer/consumer code is not written.
- `@node-idempotency/nestjs` integration — a comment in `appointments.controller.ts` marks where idempotency keys would be applied. No implementation.

## 9. Explicitly Out of Scope

Listed so the implementation plan knows where to stop:

- No real CRUD implementations. Service methods are stubs that throw `NotImplementedException`.
- No tests beyond one per module verifying the module instantiates via `Test.createTestingModule(...)`.
- No DTO -> Prisma mapping logic. The repository boundary helpers are stubbed.
- No migrations, no Prisma client generation. Handled separately.
- No auth flow (login, register, password reset). Existing minimal `auth.controller.ts` and `auth.service.ts` stay as-is and are wrapped in the new skeleton shape only where it does not add behavior.
- No WebSocket gateway wiring.
- No BullMQ producer or consumer code.
- No idempotency key handling.
- No rate limiting, helmet, or throttler configuration beyond what `main.ts` already does.

## 10. Verification at End of Implementation

- `pnpm build` succeeds.
- `pnpm lint` succeeds.
- `pnpm test` runs the per-module smoke tests.
- Boot the app with `pnpm dev`. Hit `GET /v1/health` and get `200`.
- Hit `GET /v1/<any-other-route>` and get `404`. Proves routes resolve but no business logic runs.

## 11. Risks and Open Questions

- **BigInt on the wire.** All cross-module values stringify BigInt IDs. Client apps must use string IDs consistently. Document in any client-facing types.
- **Mixed ID types in the schema.** `User.id` (cuid string) vs `Patient.id` (BigInt). Repositories must take both types in their public method signatures. No implicit conversion.
- **Enum drift.** Zod enums and Prisma enums must stay in sync. The "keep in sync" comment is a placeholder until a codegen step exists.
- **Subscriptions and businesses placeholders.** Folders exist; model ownership is not decided. Future brainstorm when these modules grow real models.

## 12. References

- `api/prisma/schema.prisma` — source of truth for model ownership.
- `api/package.json` — locked dependency versions.
- `api/src/main.ts` — bootstrap and global pipes.
- `api/src/common/` — existing decorators, guards, pipes, filters, exceptions, services.
- `api/src/common/pipes/zod-validation.pipe.ts` — already wired; scaffold relies on it.
- `api/src/common/filters/http-exception.filter.ts` — already wired; relies on it.
- Project `CLAUDE.md` — kebab-case file names, no emojis, concise solutions.
