# NestJS Modules & Full Users/Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full working Users and Auth modules with Prisma database access, bcrypt password hashing, JWT authentication, Zod DTO validation, Audit logging, and unit tests first, while scaffolding skeleton contracts for remaining feature modules.

**Architecture:** NestJS Feature Modules with strict flat file layout (`controller` -> `service` -> `repository` -> `PrismaService`), Zod DTO validation, explicit repository boundary DTO transformations (`toUserPublic`), JWT strategy, and DomainExceptions mapped by `HttpExceptionFilter`.

**Tech Stack:** NestJS v11, Prisma v7, Zod v4, `@nestjs/jwt`, `bcrypt`, TypeScript v6, Jest, pnpm

## Global Constraints

- Scope: `api/` workspace root directory (`D:\giomj\Projects\takda\api`).
- File names must be kebab-case (e.g. `create-user.schema.ts`).
- No emojis in code or comments.
- Controller layer never imports `PrismaService`; only injects module Service.
- Service layer never imports `PrismaService`; only injects module Repository and exported module services.
- Repository layer is the ONLY file allowed to import `PrismaService`.
- Repository methods return plain objects (`BigInt` converted to string via `toXPublic` mapper).
- Validation via Zod schemas only (`z.infer` for types); no `class-validator` decorators.
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
- Produces: `DomainException`, `NotFoundException`, `ConflictException`, `UnauthorizedException`, `ValidationException`

- [ ] **Step 1: Write failing test for exception hierarchy and HTTP filter mapping**

Create `api/src/common/exceptions/domain.exception.spec.ts`:

```typescript
import {
  DomainException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
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

  it("should instantiate UnauthorizedException with custom message", () => {
    const exc = new UnauthorizedException("Invalid credentials");
    expect(exc).toBeInstanceOf(DomainException);
    expect(exc.message).toBe("Invalid credentials");
    expect(exc.name).toBe("UnauthorizedException");
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
Expected: FAIL with `NotFoundException / ConflictException / UnauthorizedException not exported`.

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

export class UnauthorizedException extends DomainException {
  constructor(message: string = "Unauthorized access") {
    super(message);
    this.name = "UnauthorizedException";
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
  UnauthorizedException,
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
    } else if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      responseBody = { message: exception.message, error: "Unauthorized" };
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

### Task 6: Users Module Full Implementation (Soft Delete & Archiving)

**Files:**

- Modify: `api/prisma/schema.prisma`
- Modify: `api/src/modules/users/users.module.ts`
- Modify: `api/src/modules/users/users.controller.ts`
- Modify: `api/src/modules/users/users.service.ts`
- Modify: `api/src/modules/users/audit.service.ts`
- Modify: `api/src/modules/users/users.repository.ts`
- Create: `api/src/modules/users/dto/create-user.schema.ts`
- Create: `api/src/modules/users/dto/update-user.schema.ts`
- Create: `api/src/modules/users/dto/index.ts`
- Modify: `api/src/modules/users/index.ts`
- Create: `api/src/modules/users/users.service.spec.ts`
- Create: `api/src/modules/users/users.module.spec.ts`

**Interfaces:**

- Consumes: `PrismaService`, `SharedModule`
- Produces: `UsersModule`, `UsersService` (CRUD + soft deletion/archiving/restoration + password hashing), `AuditService` (logs to `AuditLog` table), `UsersRepository` (Prisma queries with `deletedAt`/`archivedAt` filtering + DTO mapping)

- [ ] **Step 1: Write failing unit test for UsersService and UsersRepository**

Create `api/src/modules/users/users.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { AuditService } from "./audit.service";
import { ConflictException, NotFoundException } from "../../common/exceptions";

describe("UsersService", () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findRawByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const mockAudit = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(UsersRepository);
    audit = module.get(AuditService);
  });

  it("should throw ConflictException when creating user with existing email", async () => {
    repo.findByEmail.mockResolvedValue({
      id: "usr_1",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: "Customer",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await expect(
      service.createUser({
        email: "test@example.com",
        password: "Password123!",
        firstName: "Test",
        lastName: "User",
        role: "Customer",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("should create user and hash password when email is unique", async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockImplementation(async (data) => ({
      id: "usr_new",
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const result = await service.createUser({
      email: "new@example.com",
      password: "Password123!",
      firstName: "New",
      lastName: "User",
      role: "Customer",
    });

    expect(result.id).toBe("usr_new");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        password: expect.any(String),
      }),
    );
    expect(audit.logAction).toHaveBeenCalledWith("USER_CREATED", "usr_new");
  });

  it("should throw NotFoundException when finding non-existent user", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById("non-existent")).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/users/users.service.spec.ts`
Expected: FAIL with `UsersService.createUser is not a function` or missing DTOs.

- [ ] **Step 3: Implement Users DTOs, Repository, AuditService, UsersService, and Controller**

Create `api/src/modules/users/dto/create-user.schema.ts`:

```typescript
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  role: z.enum(["Customer", "BusinessOwner", "Staff"]).default("Customer"),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

Create `api/src/modules/users/dto/update-user.schema.ts`:

```typescript
import { z } from "zod";

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(["Customer", "BusinessOwner", "Staff"]).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
```

Create `api/src/modules/users/dto/index.ts`:

```typescript
export * from "./create-user.schema";
export * from "./update-user.schema";
```

Update `api/src/modules/users/users.repository.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User, Prisma } from "@prisma/client";

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "Customer" | "BusinessOwner" | "Staff";
  isActive: boolean;
  deletedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UsersFindAll = {
  skip?: number;
  take?: number;
  includeDeleted?: boolean;
  includeArchived?: boolean;
  onlyDeleted?: boolean;
  onlyArchived?: boolean;
};

export function toUserPublic(row: User): UserPublic {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role as "Customer" | "BusinessOwner" | "Staff",
    isActive: row.isActive,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
  };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    const where: Prisma.UserWhereInput = { id };
    if (!options?.includeDeleted) {
      where.deletedAt = null;
    }
    const user = await this.prisma.user.findFirst({ where });
    return user ? toUserPublic(user) : null;
  }

  async findByEmail(
    email: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    const where: Prisma.UserWhereInput = { email };
    if (!options?.includeDeleted) {
      where.deletedAt = null;
    }
    const user = await this.prisma.user.findFirst({ where });
    return user ? toUserPublic(user) : null;
  }

  async findRawByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findRawById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(params?: UsersFindAll): Promise<UserPublic[]> {
    const where: Prisma.UserWhereInput = {};

    if (params?.onlyDeleted) {
      where.deletedAt = { not: null };
    } else if (!params?.includeDeleted) {
      where.deletedAt = null;
    }

    if (params?.onlyArchived) {
      where.archivedAt = { not: null };
    } else if (!params?.includeArchived) {
      where.archivedAt = null;
    }

    const users = await this.prisma.user.findMany({
      where,
      skip: params?.skip,
      take: params?.take ?? 50,
      orderBy: { createdAt: "desc" },
    });
    return users.map(toUserPublic);
  }

  async create(data: Prisma.UserCreateInput): Promise<UserPublic> {
    const user = await this.prisma.user.create({ data });
    return toUserPublic(user);
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<UserPublic> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    });
    return toUserPublic(user);
  }

  async softDelete(id: string): Promise<UserPublic> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
    return toUserPublic(user);
  }

  async archive(id: string): Promise<UserPublic> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        isActive: false,
      },
    });
    return toUserPublic(user);
  }

  async restore(id: string): Promise<UserPublic> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        archivedAt: null,
        isActive: true,
      },
    });
    return toUserPublic(user);
  }

  async delete(id: string): Promise<UserPublic> {
    return this.softDelete(id);
  }
}
```

Update `api/src/modules/users/audit.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    action: string,
    entityId?: string | bigint,
    actorUserId?: string,
    payload?: Record<string, unknown>,
  ) {
    let parsedEntityId: bigint | undefined;
    if (entityId !== undefined) {
      parsedEntityId =
        typeof entityId === "bigint" ? entityId : BigInt(entityId);
    }

    return this.prisma.auditLog.create({
      data: {
        action,
        entity: "User",
        entityId: parsedEntityId,
        actorUserId: actorUserId ?? null,
        payload: payload ? (payload as any) : undefined,
      },
    });
  }
}
```

Update `api/src/modules/users/users.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { UsersRepository, UserPublic, UsersFindAll } from "./users.repository";
import { AuditService } from "./audit.service";
import { CreateUserDto } from "./dto/create-user.schema";
import { UpdateUserDto } from "./dto/update-user.schema";
import {
  NotFoundException,
  ConflictException,
} from "../../common/exceptions";

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async findById(
    id: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic> {
    const user = await this.repo.findById(id, options);
    if (!user) {
      throw new NotFoundException("User", id);
    }
    return user;
  }

  async findByEmail(
    email: string,
    options?: { includeDeleted?: boolean },
  ): Promise<UserPublic | null> {
    return this.repo.findByEmail(email, options);
  }

  async findRawByEmail(email: string) {
    return this.repo.findRawByEmail(email);
  }

  async findAll(params?: UsersFindAll): Promise<UserPublic[]> {
    return this.repo.findAll(params);
  }

  async createUser(dto: CreateUserDto): Promise<UserPublic> {
    const existing = await this.repo.findByEmail(dto.email, { includeDeleted: true });
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.repo.create({
      email: dto.email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
    });

    await this.audit.logAction("USER_CREATED", user.id);
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserPublic> {
    await this.findById(id);
    const updated = await this.repo.update(id, dto);
    await this.audit.logAction("USER_UPDATED", id);
    return updated;
  }

  async softDeleteUser(id: string): Promise<UserPublic> {
    await this.findById(id, { includeDeleted: true });
    const deleted = await this.repo.softDelete(id);
    await this.audit.logAction("USER_DELETED", id);
    return deleted;
  }

  async archiveUser(id: string): Promise<UserPublic> {
    await this.findById(id, { includeDeleted: true });
    const archived = await this.repo.archive(id);
    await this.audit.logAction("USER_ARCHIVED", id);
    return archived;
  }

  async restoreUser(id: string): Promise<UserPublic> {
    await this.findById(id, { includeDeleted: true });
    const restored = await this.repo.restore(id);
    await this.audit.logAction("USER_RESTORED", id);
    return restored;
  }
}
```

Update `api/src/modules/users/users.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserSchema, CreateUserDto } from "./dto/create-user.schema";
import { UpdateUserSchema, UpdateUserDto } from "./dto/update-user.schema";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    @Query("includeDeleted") includeDeleted?: string,
    @Query("includeArchived") includeArchived?: string,
  ) {
    return this.usersService.findAll({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      includeDeleted: includeDeleted === "true",
      includeArchived: includeArchived === "true",
    });
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  async create(@Body() body: unknown) {
    const dto: CreateUserDto = CreateUserSchema.parse(body);
    return this.usersService.createUser(dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    const dto: UpdateUserDto = UpdateUserSchema.parse(body);
    return this.usersService.updateUser(id, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.usersService.softDeleteUser(id);
  }

  @Patch(":id/archive")
  async archive(@Param("id") id: string) {
    return this.usersService.archiveUser(id);
  }

  @Patch(":id/restore")
  async restore(@Param("id") id: string) {
    return this.usersService.restoreUser(id);
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
  exports: [UsersService, AuditService, UsersRepository],
})
export class UsersModule {}
```

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

Update `api/src/modules/users/index.ts`:

```typescript
export * from "./users.module";
export * from "./users.service";
export * from "./audit.service";
export * from "./users.repository";
export * from "./dto";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && pnpm test src/modules/users/users.service.spec.ts src/modules/users/users.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/users/
git commit -m "feat(users): implement full UsersModule CRUD, Prisma repository, Zod DTOs, Audit logging, and unit tests"
```

---

### Task 7: Auth Module Full Implementation

**Files:**

- Modify: `api/src/modules/auth/auth.module.ts`
- Modify: `api/src/modules/auth/auth.controller.ts`
- Modify: `api/src/modules/auth/auth.service.ts`
- Create: `api/src/modules/auth/jwt.strategy.ts`
- Create: `api/src/modules/auth/jwt-auth.guard.ts`
- Create: `api/src/modules/auth/public.decorator.ts`
- Create: `api/src/modules/auth/dto/login.schema.ts`
- Create: `api/src/modules/auth/dto/register.schema.ts`
- Create: `api/src/modules/auth/dto/refresh-token.schema.ts`
- Create: `api/src/modules/auth/dto/index.ts`
- Modify: `api/src/modules/auth/index.ts`
- Create: `api/src/modules/auth/auth.service.spec.ts`
- Create: `api/src/modules/auth/auth.module.spec.ts`

**Interfaces:**

- Consumes: `UsersModule`, `@nestjs/jwt`, `ENV.JWT_SECRET`
- Produces: `AuthModule`, `AuthService` (login, register, validateUser, generateTokens, refresh), `JwtAuthGuard`, `Public` decorator

- [ ] **Step 1: Write failing unit test for AuthService**

Create `api/src/modules/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { UnauthorizedException } from "../../common/exceptions";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const mockUsersService = {
      findRawByEmail: jest.fn(),
      createUser: jest.fn(),
      findById: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue("mock-token"),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it("should throw UnauthorizedException when password does not match during login", async () => {
    const hashedPassword = await bcrypt.hash("correct-password", 10);
    usersService.findRawByEmail.mockResolvedValue({
      id: "usr_1",
      email: "test@example.com",
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
      role: "Customer",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.login({
        email: "test@example.com",
        password: "wrong-password",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("should return access and refresh tokens on valid login", async () => {
    const hashedPassword = await bcrypt.hash("correct-password", 10);
    usersService.findRawByEmail.mockResolvedValue({
      id: "usr_1",
      email: "test@example.com",
      password: hashedPassword,
      firstName: "Test",
      lastName: "User",
      role: "Customer",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.login({
      email: "test@example.com",
      password: "correct-password",
    });

    expect(result.accessToken).toBe("mock-token");
    expect(result.refreshToken).toBe("mock-token");
    expect(result.user.email).toBe("test@example.com");
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd api && pnpm test src/modules/auth/auth.service.spec.ts`
Expected: FAIL with `AuthService.login is not a function` or missing DTOs.

- [ ] **Step 3: Implement Auth DTOs, Guards, Decorators, JwtStrategy, AuthService, Controller, and Module**

Create `api/src/modules/auth/dto/login.schema.ts`:

```typescript
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof LoginSchema>;
```

Create `api/src/modules/auth/dto/register.schema.ts`:

```typescript
import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["Customer", "BusinessOwner", "Staff"]).default("Customer"),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
```

Create `api/src/modules/auth/dto/refresh-token.schema.ts`:

```typescript
import { z } from "zod";

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;
```

Create `api/src/modules/auth/dto/index.ts`:

```typescript
export * from "./login.schema";
export * from "./register.schema";
export * from "./refresh-token.schema";
```

Create `api/src/modules/auth/public.decorator.ts`:

```typescript
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Create `api/src/modules/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ENV } from "../../config/env";
import { UsersService } from "../users/users.service";
import { UnauthorizedException } from "../../common/exceptions";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type?: "access" | "refresh";
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ENV.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type && payload.type !== "access") {
      throw new UnauthorizedException("Invalid token type");
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("User inactive or missing");
    }
    return user;
  }
}
```

Create `api/src/modules/auth/jwt-auth.guard.ts`:

```typescript
import { Injectable, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

Update `api/src/modules/auth/auth.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.schema";
import { RegisterDto } from "./dto/register.schema";
import { RefreshTokenDto } from "./dto/refresh-token.schema";
import { UnauthorizedException } from "../../common/exceptions";
import { ENV } from "../../config/env";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findRawByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const user = await this.usersService.createUser(dto);
    return this.generateTokens(user.id, user.email, user.role);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: ENV.JWT_SECRET,
      });

      if (payload.type !== "refresh") {
        throw new UnauthorizedException("Invalid refresh token type");
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user.isActive) {
        throw new UnauthorizedException("User account disabled");
      }

      return this.generateTokens(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role, type: "access" },
      { expiresIn: ENV.JWT_ACCESS_TTL_SECONDS },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role, type: "refresh" },
      { expiresIn: ENV.JWT_REFRESH_TTL_SECONDS },
    );

    const user = await this.usersService.findById(userId);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }
}
```

Update `api/src/modules/auth/auth.controller.ts`:

```typescript
import { Controller, Post, Get, Body, Request, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginSchema, LoginDto } from "./dto/login.schema";
import { RegisterSchema, RegisterDto } from "./dto/register.schema";
import { RefreshTokenSchema, RefreshTokenDto } from "./dto/refresh-token.schema";
import { Public } from "./public.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  async login(@Body() body: unknown) {
    const dto: LoginDto = LoginSchema.parse(body);
    return this.authService.login(dto);
  }

  @Public()
  @Post("register")
  async register(@Body() body: unknown) {
    const dto: RegisterDto = RegisterSchema.parse(body);
    return this.authService.register(dto);
  }

  @Public()
  @Post("refresh")
  async refresh(@Body() body: unknown) {
    const dto: RefreshTokenDto = RefreshTokenSchema.parse(body);
    return this.authService.refreshToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getProfile(@Request() req: any) {
    return req.user;
  }
}
```

Update `api/src/modules/auth/auth.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { UsersModule } from "../users/users.module";
import { ENV } from "../../config/env";

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: ENV.JWT_SECRET,
      signOptions: { expiresIn: ENV.JWT_ACCESS_TTL_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
```

Create `api/src/modules/auth/auth.module.spec.ts`:

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { AuthModule } from "./auth.module";
import { AuthService } from "./auth.service";
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

Update `api/src/modules/auth/index.ts`:

```typescript
export * from "./auth.module";
export * from "./auth.service";
export * from "./jwt.strategy";
export * from "./jwt-auth.guard";
export * from "./public.decorator";
export * from "./dto";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd api && pnpm test src/modules/auth/auth.service.spec.ts src/modules/auth/auth.module.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd api
git add src/modules/auth/
git commit -m "feat(auth): implement full AuthModule with JWT strategy, passport guard, login/register/refresh endpoints, and unit tests"
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
export class BusinessesService {}
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
export class SubscriptionsService {}
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
    throw new NotImplementedException(
      "AppointmentsService.findById skeleton",
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
    throw new NotImplementedException(
      "DoctorsService.findDoctorShifts skeleton",
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
    throw new NotImplementedException("GET /appointments/:id skeleton");
  }

  @Post()
  async createAppointment() {
    throw new NotImplementedException("POST /appointments skeleton");
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
}
```

Create `api/src/modules/notifications/notifications.gateway.ts`:

```typescript
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server } from "socket.io";

@WebSocketGateway({ namespace: "notifications", cors: { origin: "*" } })
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;
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
    throw new NotImplementedException(
      "NotificationsService.sendNotification skeleton",
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
    throw new NotImplementedException(
      "GET /notifications/:userId skeleton",
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
    throw new NotImplementedException(
      "QueuesService.getQueueStatus skeleton",
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
    throw new NotImplementedException("GET /queues/:doctorId skeleton");
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
git commit -m "chore(modules): complete NestJS full Users/Auth module implementation and module contract scaffolding"
```
