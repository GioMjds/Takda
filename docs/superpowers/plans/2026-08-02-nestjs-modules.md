# NestJS Module Skeleton & Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete skeleton structure, file layout, Zod schemas, repository boundary wrappers, and stub controllers/services across all NestJS modules in `api/` without writing business logic.

**Architecture:** NestJS Feature Modules with strict flat file layout (`controller` -> `service` -> `repository` -> `PrismaService`), Zod DTO validation, explicit repository boundary DTO transformations (`toXPublic`), and DomainExceptions mapped by HttpExceptionFilter.

**Tech Stack:** NestJS v11, Prisma v7, Zod v4, TypeScript v6, Jest, pnpm

## Global Constraints

- Scope: `api/` workspace root directory (`D:\giomj\Projects\takda\api`).
- File names must be kebab-case (e.g. `create-appointment.schema.ts`).
- No emojis in code or comments.
- Controller layer never imports `PrismaService`; only injects module Service.
- Service layer never imports `PrismaService`; only injects module Repository and exported module services.
- Repository layer is the ONLY file allowed to import `PrismaService`.
- Repository methods return plain objects (`BigInt` converted to string via `toXPublic` mapper).
- Validation via Zod schemas only (`z.infer` for types); no `class-validator` decorators.
- Controller routes resolve and throw `NotImplementedException` with TODO comments.
- Cross-module access only through module's root `index.ts` exported public service.

---

### Task 1: Prisma Infrastructure & Verification

**Files:**

- Modify: `api/src/modules/prisma/prisma.module.ts`
- Modify: `api/src/modules/prisma/prisma.service.ts`
- Modify: `api/src/modules/prisma/index.ts`
- Create: `api/src/modules/prisma/prisma.module.spec.ts`

**Interfaces:**

- Consumes: `@prisma/client`
- Produces: `PrismaService` (global provider)

- [ ] **Step 1: Write the failing module test**

Create `api/src/modules/prisma/prisma.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaModule } from "./prisma.module";
import { PrismaService } from "./prisma.service";

describe("PrismaModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
  });

  it("should compile and provide PrismaService", () => {
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure or success**

Run: `cd api && pnpm test src/modules/prisma/prisma.module.spec.ts`
Expected: PASS (or fail if imports/types are missing).

- [ ] **Step 3: Ensure Global module annotation and barrel re-export**

Verify `api/src/modules/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Verify `api/src/modules/prisma/index.ts`:

```typescript
export * from "./prisma.module";
export * from "./prisma.service";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/modules/prisma/prisma.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/prisma/
git commit -m "feat(prisma): verify global PrismaModule and PrismaService exports"
```

---

### Task 2: Environment Schema Update

**Files:**

- Modify: `api/src/config/env.ts`
- Modify: `api/src/config/index.ts`
- Create: `api/src/config/env.spec.ts`

**Interfaces:**

- Consumes: `process.env`, `zod`
- Produces: `ENV` constants object with `REDIS_URL`, `DATABASE_URL`, `JWT_SECRET`, `PORT`

- [ ] **Step 1: Write the failing test for REDIS_URL configuration**

Create `api/src/config/env.spec.ts`:

```typescript
import { envSchema } from "./env";

describe("Env Schema", () => {
  it("should validate and parse environment variables including REDIS_URL", () => {
    const parsed = envSchema.parse({
      NODE_ENV: "test",
      PORT: "5000",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      REDIS_URL: "redis://localhost:6379",
      JWT_SECRET: "super-secret-key-that-is-at-least-32-chars-long",
    });

    expect(parsed.REDIS_URL).toBe("redis://localhost:6379");
    expect(parsed.PORT).toBe(5000);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/config/env.spec.ts`
Expected: FAIL with `REDIS_URL is not recognized` or invalid schema.

- [ ] **Step 3: Update env.ts to export envSchema and include REDIS_URL**

Update `api/src/config/env.ts`:

```typescript
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be >= 32 chars"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  JWT_REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),

  SMS_PROVIDER: z.enum(["semaphore", "twilio"]).default("semaphore"),
  SMS_API_KEY: z.string().optional(),
  SMS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMS_SENDER_NAME: z.string().optional(),
  SMS_SEMAPHORE_BASE_URL: z
    .string()
    .url()
    .default("https://api.semaphore.co/api/v4"),
  SMS_TWILIO_ACCOUNT_SID: z.string().optional(),
  SMS_TWILIO_AUTH_TOKEN: z.string().optional(),
  SMS_TWILIO_FROM: z.string().optional(),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

export const ENV: Env = envSchema.parse(process.env);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/config/env.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/config/
git commit -m "feat(config): add REDIS_URL to envSchema and export envSchema for testing"
```

---

### Task 3: Common Domain Exception Layer & HTTP Exception Mapping

**Files:**

- Modify: `api/src/common/exceptions/domain.exception.ts`
- Modify: `api/src/common/exceptions/index.ts`
- Modify: `api/src/common/filters/http-exception.filter.ts`
- Create: `api/src/common/exceptions/domain.exception.spec.ts`

**Interfaces:**

- Consumes: `@nestjs/common`
- Produces: `DomainException`, `NotFoundException`, `ConflictException`, `ValidationException`

- [ ] **Step 1: Write failing test for exception hierarchy and HTTP filter mapping**

Create `api/src/common/exceptions/domain.exception.spec.ts`:

```typescript
import {
  DomainException,
  NotFoundException,
  ConflictException,
  ValidationException,
} from "./domain.exception";

describe("DomainExceptions", () => {
  it("should instantiate NotFoundException with entity name and ID", () => {
    const exc = new NotFoundException("User", "123");
    expect(exc).toBeInstanceOf(DomainException);
    expect(exc.message).toBe("User with id 123 not found");
    expect(exc.name).toBe("NotFoundException");
  });

  it("should instantiate ConflictException with custom message", () => {
    const exc = new ConflictException("Email already exists");
    expect(exc).toBeInstanceOf(DomainException);
    expect(exc.message).toBe("Email already exists");
    expect(exc.name).toBe("ConflictException");
  });

  it("should instantiate ValidationException with field errors", () => {
    const exc = new ValidationException("Validation failed", [
      { field: "email", message: "Invalid email" },
    ]);
    expect(exc).toBeInstanceOf(DomainException);
    expect(exc.errors).toHaveLength(1);
    expect(exc.errors[0].field).toBe("email");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/common/exceptions/domain.exception.spec.ts`
Expected: FAIL with `NotFoundException / ConflictException not exported`.

- [ ] **Step 3: Update domain.exception.ts and http-exception.filter.ts**

Update `api/src/common/exceptions/domain.exception.ts`:

```typescript
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainException";
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id ${id} not found`);
    this.name = "NotFoundException";
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = "ConflictException";
  }
}

export class InvalidStateException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStateException";
  }
}

export interface ValidationErrorItem {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationException extends DomainException {
  constructor(
    message: string,
    public readonly errors: ValidationErrorItem[],
  ) {
    super(message);
    this.name = "ValidationException";
  }
}
```

Update `api/src/common/exceptions/index.ts`:

```typescript
export * from "./domain.exception";
```

Update `api/src/common/filters/http-exception.filter.ts`:

```typescript
import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import {
  DomainException,
  NotFoundException,
  ConflictException,
  ValidationException,
} from "../exceptions/domain.exception";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let responseBody: Record<string, unknown> = {
      message: "Internal server error",
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse();
      responseBody =
        typeof resContent === "string"
          ? { message: resContent }
          : (resContent as Record<string, unknown>);
    } else if (exception instanceof NotFoundException) {
      status = HttpStatus.NOT_FOUND;
      responseBody = { message: exception.message, error: "Not Found" };
    } else if (exception instanceof ConflictException) {
      status = HttpStatus.CONFLICT;
      responseBody = { message: exception.message, error: "Conflict" };
    } else if (exception instanceof ValidationException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      responseBody = {
        message: exception.message,
        errors: exception.errors,
        error: "Unprocessable Entity",
      };
    } else if (exception instanceof DomainException) {
      status = HttpStatus.BAD_REQUEST;
      responseBody = { message: exception.message, error: "Bad Request" };
    }

    this.logger.error(`${req.method} ${req.url} -> ${status}`);

    res.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      ...responseBody,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/common/exceptions/domain.exception.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/common/exceptions/ src/common/filters/
git commit -m "feat(common): implement DomainException hierarchy and HTTP status mapping filter"
```

---

### Task 4: Shared Module Scaffold

**Files:**

- Create: `api/src/shared/shared.module.ts`
- Create: `api/src/shared/index.ts`
- Create: `api/src/shared/shared.module.spec.ts`

**Interfaces:**

- Consumes: `@/common`
- Produces: `SharedModule`

- [ ] **Step 1: Write failing test for SharedModule**

Create `api/src/shared/shared.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { SharedModule } from "./shared.module";

describe("SharedModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [SharedModule],
    }).compile();
  });

  it("should compile successfully", () => {
    expect(module).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/shared/shared.module.spec.ts`
Expected: FAIL with `Cannot find module './shared.module'`.

- [ ] **Step 3: Create SharedModule and barrel re-exports**

Create `api/src/shared/shared.module.ts`:

```typescript
import { Module } from "@nestjs/common";

@Module({
  providers: [],
  exports: [],
})
export class SharedModule {}
```

Create `api/src/shared/index.ts`:

```typescript
export * from "./shared.module";
export * from "../common";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/shared/shared.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/shared/
git commit -m "feat(shared): scaffold SharedModule and barrel export"
```

---

### Task 5: Health Module Scaffold

**Files:**

- Modify: `api/src/modules/health/health.module.ts`
- Create: `api/src/modules/health/health.controller.ts`
- Create: `api/src/modules/health/health.service.ts`
- Modify: `api/src/modules/health/index.ts`
- Create: `api/src/modules/health/health.module.spec.ts`

**Interfaces:**

- Consumes: none
- Produces: `HealthModule`, `HealthController`, `GET /health`

- [ ] **Step 1: Write failing test for HealthModule**

Create `api/src/modules/health/health.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { HealthModule } from "./health.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthModule", () => {
  let module: TestingModule;
  let controller: HealthController;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should compile and return status ok from controller", () => {
    expect(controller).toBeDefined();
    expect(controller.check()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/health/health.module.spec.ts`
Expected: FAIL with `Cannot find module './health.controller'`.

- [ ] **Step 3: Implement HealthService, HealthController, and HealthModule**

Create `api/src/modules/health/health.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  check() {
    return { status: "ok" };
  }
}
```

Create `api/src/modules/health/health.controller.ts`:

```typescript
import { Controller, Get } from "@nestjs/common";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.check();
  }
}
```

Update `api/src/modules/health/health.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
```

Update `api/src/modules/health/index.ts`:

```typescript
export * from "./health.module";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/modules/health/health.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/health/
git commit -m "feat(health): implement HealthModule, controller, and health check service"
```

---

### Task 6: Users Module Skeleton & Contracts

**Files:**

- Modify: `api/src/modules/users/users.module.ts`
- Create: `api/src/modules/users/users.controller.ts`
- Create: `api/src/modules/users/users.service.ts`
- Create: `api/src/modules/users/audit.service.ts`
- Create: `api/src/modules/users/users.repository.ts`
- Create: `api/src/modules/users/dto/create-user.schema.ts`
- Create: `api/src/modules/users/dto/update-user.schema.ts`
- Create: `api/src/modules/users/dto/index.ts`
- Modify: `api/src/modules/users/index.ts`
- Create: `api/src/modules/users/users.module.spec.ts`

**Interfaces:**

- Consumes: `PrismaService`, `SharedModule`
- Produces: `UsersModule`, `UsersService`, `AuditService` (exported)

- [ ] **Step 1: Write failing test for UsersModule**

Create `api/src/modules/users/users.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { UsersModule } from "./users.module";
import { UsersService } from "./users.service";
import { AuditService } from "./audit.service";
import { PrismaService } from "../prisma/prisma.service";

describe("UsersModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it("should compile and export UsersService and AuditService", () => {
    expect(module.get<UsersService>(UsersService)).toBeDefined();
    expect(module.get<AuditService>(AuditService)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/users/users.module.spec.ts`
Expected: FAIL with `UsersService not exported` or missing files.

- [ ] **Step 3: Implement Users DTOs, Repository, Services, Controller, and Module**

Create `api/src/modules/users/dto/create-user.schema.ts`:

```typescript
// Keep in sync with prisma/schema.prisma -> User
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["Admin", "Doctor", "Staff", "Patient"]).default("Patient"),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

Create `api/src/modules/users/dto/update-user.schema.ts`:

```typescript
// Keep in sync with prisma/schema.prisma -> User
import { z } from "zod";
import { CreateUserSchema } from "./create-user.schema";

export const UpdateUserSchema = CreateUserSchema.partial();

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
```

Create `api/src/modules/users/dto/index.ts`:

```typescript
export * from "./create-user.schema";
export * from "./update-user.schema";
```

Create `api/src/modules/users/users.repository.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export function toUserPublic(row: any): UserPublic {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement per feature plan
}
```

Create `api/src/modules/users/users.service.ts`:

```typescript
import { Injectable, NotImplementedException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async findById(id: string) {
    // TODO: implement per feature plan
    throw new NotImplementedException("UsersService.findById not implemented");
  }
}
```

Create `api/src/modules/users/audit.service.ts`:

```typescript
import { Injectable, NotImplementedException } from "@nestjs/common";
import { UsersRepository } from "./users.repository";

@Injectable()
export class AuditService {
  constructor(private readonly repo: UsersRepository) {}

  async logAction(action: string, entityId: bigint | string) {
    // TODO: implement per feature plan
    throw new NotImplementedException("AuditService.logAction not implemented");
  }
}
```

Create `api/src/modules/users/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Param,
  NotImplementedException,
} from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  async getUser(@Param("id") id: string) {
    // TODO: implement per feature plan
    throw new NotImplementedException("GET /users/:id not implemented");
  }
}
```

Update `api/src/modules/users/users.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuditService } from "./audit.service";
import { UsersRepository } from "./users.repository";

@Module({
  controllers: [UsersController],
  providers: [UsersService, AuditService, UsersRepository],
  exports: [UsersService, AuditService],
})
export class UsersModule {}
```

Update `api/src/modules/users/index.ts`:

```typescript
export * from "./users.module";
export * from "./users.service";
export * from "./audit.service";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/modules/users/users.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/users/
git commit -m "feat(users): implement UsersModule skeleton, repository boundary, DTOs, and services"
```

---

### Task 7: Auth Module Skeleton Refactoring

**Files:**

- Modify: `api/src/modules/auth/auth.module.ts`
- Modify: `api/src/modules/auth/auth.controller.ts`
- Modify: `api/src/modules/auth/auth.service.ts`
- Create: `api/src/modules/auth/dto/login.schema.ts`
- Create: `api/src/modules/auth/dto/register.schema.ts`
- Create: `api/src/modules/auth/dto/index.ts`
- Modify: `api/src/modules/auth/index.ts`
- Create: `api/src/modules/auth/auth.module.spec.ts`

**Interfaces:**

- Consumes: `UsersModule`, `ConfigModule`
- Produces: `AuthModule`, `AuthService` (exported)

- [ ] **Step 1: Write failing test for AuthModule**

Create `api/src/modules/auth/auth.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it("should compile and export AuthService", () => {
    expect(module.get<AuthService>(AuthService)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/auth/auth.module.spec.ts`
Expected: FAIL with missing provider or dependency resolution failure.

- [ ] **Step 3: Implement Auth DTOs, AuthService, AuthController, and AuthModule**

Create `api/src/modules/auth/dto/login.schema.ts`:

```typescript
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;
```

Create `api/src/modules/auth/dto/register.schema.ts`:

```typescript
import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
```

Create `api/src/modules/auth/dto/index.ts`:

```typescript
export * from "./login.schema";
export * from "./register.schema";
```

Update `api/src/modules/auth/auth.service.ts`:

```typescript
import { Injectable, NotImplementedException } from "@nestjs/common";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async login() {
    // TODO: implement per feature plan
    throw new NotImplementedException("AuthService.login not implemented");
  }

  async register() {
    // TODO: implement per feature plan
    throw new NotImplementedException("AuthService.register not implemented");
  }
}
```

Update `api/src/modules/auth/auth.controller.ts`:

```typescript
import { Controller, Post, NotImplementedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login() {
    // TODO: implement per feature plan
    throw new NotImplementedException("POST /auth/login not implemented");
  }

  @Post("register")
  async register() {
    // TODO: implement per feature plan
    throw new NotImplementedException("POST /auth/register not implemented");
  }
}
```

Update `api/src/modules/auth/auth.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

Update `api/src/modules/auth/index.ts`:

```typescript
export * from "./auth.module";
export * from "./auth.service";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/modules/auth/auth.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/auth/
git commit -m "feat(auth): refactor AuthModule skeleton with DTOs, AuthService, and AuthController stubs"
```

---

### Task 8: Businesses & Subscriptions Placeholder Modules

**Files:**

- Modify: `api/src/modules/businesses/businesses.module.ts`
- Create: `api/src/modules/businesses/businesses.service.ts`
- Modify: `api/src/modules/businesses/index.ts`
- Create: `api/src/modules/businesses/businesses.module.spec.ts`
- Modify: `api/src/modules/subscriptions/subscriptions.module.ts`
- Create: `api/src/modules/subscriptions/subscriptions.service.ts`
- Modify: `api/src/modules/subscriptions/index.ts`
- Create: `api/src/modules/subscriptions/subscriptions.module.spec.ts`

**Interfaces:**

- Consumes: none
- Produces: `BusinessesModule`, `BusinessesService`, `SubscriptionsModule`, `SubscriptionsService`

- [ ] **Step 1: Write failing tests for BusinessesModule and SubscriptionsModule**

Create `api/src/modules/businesses/businesses.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { BusinessesModule } from "./businesses.module";
import { BusinessesService } from "./businesses.service";

describe("BusinessesModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [BusinessesModule],
    }).compile();
  });

  it("should compile and export BusinessesService", () => {
    expect(module.get<BusinessesService>(BusinessesService)).toBeDefined();
  });
});
```

Create `api/src/modules/subscriptions/subscriptions.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { SubscriptionsModule } from "./subscriptions.module";
import { SubscriptionsService } from "./subscriptions.service";

describe("SubscriptionsModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [SubscriptionsModule],
    }).compile();
  });

  it("should compile and export SubscriptionsService", () => {
    expect(
      module.get<SubscriptionsService>(SubscriptionsService),
    ).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd api && pnpm test src/modules/businesses/businesses.module.spec.ts src/modules/subscriptions/subscriptions.module.spec.ts`
Expected: FAIL with missing services or modules.

- [ ] **Step 3: Implement placeholder services and module wiring**

Create `api/src/modules/businesses/businesses.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";

@Injectable()
export class BusinessesService {
  // TODO: placeholder until business models are owned
}
```

Update `api/src/modules/businesses/businesses.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { BusinessesService } from "./businesses.service";

@Module({
  providers: [BusinessesService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
```

Update `api/src/modules/businesses/index.ts`:

```typescript
export * from "./businesses.module";
export * from "./businesses.service";
```

Create `api/src/modules/subscriptions/subscriptions.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";

@Injectable()
export class SubscriptionsService {
  // TODO: placeholder until subscription models are owned
}
```

Update `api/src/modules/subscriptions/subscriptions.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
```

Update `api/src/modules/subscriptions/index.ts`:

```typescript
export * from "./subscriptions.module";
export * from "./subscriptions.service";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && pnpm test src/modules/businesses/businesses.module.spec.ts src/modules/subscriptions/subscriptions.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/businesses/ src/modules/subscriptions/
git commit -m "feat(placeholders): scaffold BusinessesModule and SubscriptionsModule placeholders"
```

---

### Task 9: Appointments Module Skeleton & Contracts

**Files:**

- Modify: `api/src/modules/appointments/appointments.module.ts`
- Create: `api/src/modules/appointments/appointments.controller.ts`
- Create: `api/src/modules/appointments/appointments.service.ts`
- Create: `api/src/modules/appointments/doctors.service.ts`
- Create: `api/src/modules/appointments/appointments.repository.ts`
- Create: `api/src/modules/appointments/dto/create-appointment.schema.ts`
- Create: `api/src/modules/appointments/dto/update-appointment.schema.ts`
- Create: `api/src/modules/appointments/dto/index.ts`
- Modify: `api/src/modules/appointments/index.ts`
- Create: `api/src/modules/appointments/appointments.module.spec.ts`

**Interfaces:**

- Consumes: `UsersModule`, `PrismaService`
- Produces: `AppointmentsModule`, `AppointmentsService`, `DoctorsService` (exported)

- [ ] **Step 1: Write failing test for AppointmentsModule**

Create `api/src/modules/appointments/appointments.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { AppointmentsModule } from "./appointments.module";
import { AppointmentsService } from "./appointments.service";
import { DoctorsService } from "./doctors.service";
import { UsersModule } from "../users/users.module";
import { PrismaService } from "../prisma/prisma.service";

describe("AppointmentsModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppointmentsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it("should compile and export AppointmentsService and DoctorsService", () => {
    expect(module.get<AppointmentsService>(AppointmentsService)).toBeDefined();
    expect(module.get<DoctorsService>(DoctorsService)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/appointments/appointments.module.spec.ts`
Expected: FAIL with missing exports or providers.

- [ ] **Step 3: Implement Appointments DTOs, Repository boundary, Services, Controller, and Module**

Create `api/src/modules/appointments/dto/create-appointment.schema.ts`:

```typescript
// Keep in sync with prisma/schema.prisma -> Appointment
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

Create `api/src/modules/appointments/dto/update-appointment.schema.ts`:

```typescript
// Keep in sync with prisma/schema.prisma -> Appointment
import { z } from "zod";
import { CreateAppointmentSchema } from "./create-appointment.schema";

export const UpdateAppointmentSchema = CreateAppointmentSchema.partial();

export type UpdateAppointmentDto = z.infer<typeof UpdateAppointmentSchema>;
```

Create `api/src/modules/appointments/dto/index.ts`:

```typescript
export * from "./create-appointment.schema";
export * from "./update-appointment.schema";
```

Create `api/src/modules/appointments/appointments.repository.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AppointmentPublic {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentStart: string;
  appointmentEnd: string;
  source: string;
  reason?: string;
  notes?: string;
  createdAt: string;
}

export function toAppointmentPublic(row: any): AppointmentPublic {
  return {
    id: row.id.toString(),
    patientId: row.patientId.toString(),
    doctorId: row.doctorId.toString(),
    appointmentStart:
      row.appointmentStart instanceof Date
        ? row.appointmentStart.toISOString()
        : row.appointmentStart,
    appointmentEnd:
      row.appointmentEnd instanceof Date
        ? row.appointmentEnd.toISOString()
        : row.appointmentEnd,
    source: row.source,
    reason: row.reason,
    notes: row.notes,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement per feature plan
}
```

Create `api/src/modules/appointments/appointments.service.ts`:

```typescript
import { Injectable, NotImplementedException } from "@nestjs/common";
import { AppointmentsRepository } from "./appointments.repository";

@Injectable()
export class AppointmentsService {
  constructor(private readonly repo: AppointmentsRepository) {}

  async findById(id: bigint | string) {
    // TODO: implement per feature plan
    throw new NotImplementedException(
      "AppointmentsService.findById not implemented",
    );
  }
}
```

Create `api/src/modules/appointments/doctors.service.ts`:

```typescript
import { Injectable, NotImplementedException } from "@nestjs/common";
import { AppointmentsRepository } from "./appointments.repository";

@Injectable()
export class DoctorsService {
  constructor(private readonly repo: AppointmentsRepository) {}

  async findDoctorShifts(doctorId: bigint | string) {
    // TODO: implement per feature plan
    throw new NotImplementedException(
      "DoctorsService.findDoctorShifts not implemented",
    );
  }
}
```

Create `api/src/modules/appointments/appointments.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Param,
  Post,
  NotImplementedException,
} from "@nestjs/common";
import { AppointmentsService } from "./appointments.service";

@Controller("appointments")
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get(":id")
  async getAppointment(@Param("id") id: string) {
    // TODO: implement per feature plan
    throw new NotImplementedException("GET /appointments/:id not implemented");
  }

  @Post()
  async createAppointment() {
    // Note: @node-idempotency/nestjs will be applied here in future feature implementations
    // TODO: implement per feature plan
    throw new NotImplementedException("POST /appointments not implemented");
  }
}
```

Update `api/src/modules/appointments/appointments.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { AppointmentsController } from "./appointments.controller";
import { AppointmentsService } from "./appointments.service";
import { DoctorsService } from "./doctors.service";
import { AppointmentsRepository } from "./appointments.repository";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, DoctorsService, AppointmentsRepository],
  exports: [AppointmentsService, DoctorsService],
})
export class AppointmentsModule {}
```

Update `api/src/modules/appointments/index.ts`:

```typescript
export * from "./appointments.module";
export * from "./appointments.service";
export * from "./doctors.service";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/modules/appointments/appointments.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/appointments/
git commit -m "feat(appointments): implement AppointmentsModule skeleton, repository boundary DTOs, and services"
```

---

### Task 10: Notifications Module Skeleton & Contracts

**Files:**

- Modify: `api/src/modules/notifications/notifications.module.ts`
- Create: `api/src/modules/notifications/notifications.controller.ts`
- Create: `api/src/modules/notifications/notifications.service.ts`
- Create: `api/src/modules/notifications/notifications.repository.ts`
- Create: `api/src/modules/notifications/notifications.gateway.ts`
- Create: `api/src/modules/notifications/dto/create-notification.schema.ts`
- Create: `api/src/modules/notifications/dto/index.ts`
- Modify: `api/src/modules/notifications/index.ts`
- Create: `api/src/modules/notifications/notifications.module.spec.ts`

**Interfaces:**

- Consumes: `UsersModule`, `PrismaService`
- Produces: `NotificationsModule`, `NotificationsService` (exported)

- [ ] **Step 1: Write failing test for NotificationsModule**

Create `api/src/modules/notifications/notifications.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsModule } from "./notifications.module";
import { NotificationsService } from "./notifications.service";
import { UsersModule } from "../users/users.module";
import { PrismaService } from "../prisma/prisma.service";

describe("NotificationsModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [NotificationsModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it("should compile and export NotificationsService", () => {
    expect(
      module.get<NotificationsService>(NotificationsService),
    ).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/notifications/notifications.module.spec.ts`
Expected: FAIL with missing providers or exports.

- [ ] **Step 3: Implement Notifications DTO, Repository, Socket.IO gateway stub, Service, Controller, and Module**

Create `api/src/modules/notifications/dto/create-notification.schema.ts`:

```typescript
// Keep in sync with prisma/schema.prisma -> Notification
import { z } from "zod";

export const CreateNotificationSchema = z.object({
  userId: z.string().cuid(),
  type: z.enum([
    "AppointmentReminder",
    "QueueUpdate",
    "SystemNotice",
    "General",
  ]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
```

Create `api/src/modules/notifications/dto/index.ts`:

```typescript
export * from "./create-notification.schema";
```

Create `api/src/modules/notifications/notifications.repository.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface NotificationPublic {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function toNotificationPublic(row: any): NotificationPublic {
  return {
    id: row.id.toString(),
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    isRead: row.isRead ?? false,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement per feature plan
}
```

Create `api/src/modules/notifications/notifications.gateway.ts`:

```typescript
// Extension point: Socket.IO Gateway Skeleton (Unregistered in module)
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ namespace: "notifications", cors: { origin: "*" } })
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;

  // TODO: implement realtime notifications delivery in feature plan
}
```

Create `api/src/modules/notifications/notifications.service.ts`:

```typescript
import { Injectable, NotImplementedException } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async sendNotification(userId: string, title: string, body: string) {
    // TODO: implement per feature plan
    throw new NotImplementedException(
      "NotificationsService.sendNotification not implemented",
    );
  }
}
```

Create `api/src/modules/notifications/notifications.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Param,
  NotImplementedException,
} from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(":userId")
  async getUserNotifications(@Param("userId") userId: string) {
    // TODO: implement per feature plan
    throw new NotImplementedException(
      "GET /notifications/:userId not implemented",
    );
  }
}
```

Update `api/src/modules/notifications/notifications.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./notifications.repository";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

Update `api/src/modules/notifications/index.ts`:

```typescript
export * from "./notifications.module";
export * from "./notifications.service";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/modules/notifications/notifications.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/notifications/
git commit -m "feat(notifications): implement NotificationsModule skeleton, repository boundary, DTOs, and Socket.IO gateway stub"
```

---

### Task 11: Queues Module Skeleton & Contracts

**Files:**

- Modify: `api/src/modules/queues/queues.module.ts`
- Create: `api/src/modules/queues/queues.controller.ts`
- Create: `api/src/modules/queues/queues.service.ts`
- Create: `api/src/modules/queues/queues.repository.ts`
- Create: `api/src/modules/queues/dto/create-queue-entry.schema.ts`
- Create: `api/src/modules/queues/dto/update-queue-entry.schema.ts`
- Create: `api/src/modules/queues/dto/index.ts`
- Modify: `api/src/modules/queues/index.ts`
- Create: `api/src/modules/queues/queues.module.spec.ts`

**Interfaces:**

- Consumes: `AppointmentsModule`, `NotificationsModule`, `UsersModule`, `PrismaService`
- Produces: `QueuesModule`, `QueuesService` (exported)

- [ ] **Step 1: Write failing test for QueuesModule**

Create `api/src/modules/queues/queues.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { QueuesModule } from "./queues.module";
import { QueuesService } from "./queues.service";
import { PrismaService } from "../prisma/prisma.service";

describe("QueuesModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [QueuesModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it("should compile and export QueuesService", () => {
    expect(module.get<QueuesService>(QueuesService)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/queues/queues.module.spec.ts`
Expected: FAIL with missing module exports or dependencies.

- [ ] **Step 3: Implement Queues DTOs, Repository, Service, Controller, and Module**

Create `api/src/modules/queues/dto/create-queue-entry.schema.ts`:

```typescript
// Keep in sync with prisma/schema.prisma -> QueueEntry
import { z } from "zod";

export const CreateQueueEntrySchema = z.object({
  appointmentId: z.coerce.bigint().positive().optional(),
  patientId: z.coerce.bigint().positive(),
  doctorId: z.coerce.bigint().positive(),
  queueNumber: z.number().int().positive(),
  status: z
    .enum(["Waiting", "InConsultation", "Completed", "Cancelled", "NoShow"])
    .default("Waiting"),
});

export type CreateQueueEntryDto = z.infer<typeof CreateQueueEntrySchema>;
```

Create `api/src/modules/queues/dto/update-queue-entry.schema.ts`:

```typescript
// Keep in sync with prisma/schema.prisma -> QueueEntry
import { z } from "zod";
import { CreateQueueEntrySchema } from "./create-queue-entry.schema";

export const UpdateQueueEntrySchema = CreateQueueEntrySchema.partial();

export type UpdateQueueEntryDto = z.infer<typeof UpdateQueueEntrySchema>;
```

Create `api/src/modules/queues/dto/index.ts`:

```typescript
export * from "./create-queue-entry.schema";
export * from "./update-queue-entry.schema";
```

Create `api/src/modules/queues/queues.repository.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface QueueEntryPublic {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  queueNumber: number;
  status: string;
  createdAt: string;
}

export function toQueueEntryPublic(row: any): QueueEntryPublic {
  return {
    id: row.id.toString(),
    appointmentId: row.appointmentId ? row.appointmentId.toString() : undefined,
    patientId: row.patientId.toString(),
    doctorId: row.doctorId.toString(),
    queueNumber: row.queueNumber,
    status: row.status,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

@Injectable()
export class QueuesRepository {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: implement per feature plan
}
```

Create `api/src/modules/queues/queues.service.ts`:

```typescript
import { Injectable, NotImplementedException } from "@nestjs/common";
import { QueuesRepository } from "./queues.repository";
import { AppointmentsService } from "../appointments/appointments.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class QueuesService {
  constructor(
    private readonly repo: QueuesRepository,
    private readonly appointmentsService: AppointmentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getQueueStatus(doctorId: bigint | string) {
    // TODO: implement per feature plan
    throw new NotImplementedException(
      "QueuesService.getQueueStatus not implemented",
    );
  }
}
```

Create `api/src/modules/queues/queues.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Param,
  NotImplementedException,
} from "@nestjs/common";
import { QueuesService } from "./queues.service";

@Controller("queues")
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get(":doctorId")
  async getQueueStatus(@Param("doctorId") doctorId: string) {
    // TODO: implement per feature plan
    throw new NotImplementedException("GET /queues/:doctorId not implemented");
  }
}
```

Update `api/src/modules/queues/queues.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";
import { QueuesRepository } from "./queues.repository";
import { AppointmentsModule } from "../appointments/appointments.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [AppointmentsModule, NotificationsModule, UsersModule],
  controllers: [QueuesController],
  providers: [QueuesService, QueuesRepository],
  exports: [QueuesService],
})
export class QueuesModule {}
```

Update `api/src/modules/queues/index.ts`:

```typescript
export * from "./queues.module";
export * from "./queues.service";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && pnpm test src/modules/queues/queues.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/queues/
git commit -m "feat(queues): implement QueuesModule skeleton, repository boundary DTOs, and services"
```

---

### Task 12: End-to-End Build, Lint & Smoke Verification

**Files:**

- Modify: `api/src/app.module.ts` (if required to align imports)
- Test: All tests across project

- [ ] **Step 1: Run full unit test suite**

Run: `cd api && pnpm test`
Expected: All per-module spec files pass cleanly.

- [ ] **Step 2: Run linter**

Run: `cd api && pnpm lint`
Expected: Zero linting errors.

- [ ] **Step 3: Run TypeScript build**

Run: `cd api && pnpm build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Final verification commit**

```bash
cd api
git add .
git commit -m "chore(skeleton): complete NestJS module skeleton structure, contracts, and boundary wiring"
```
