# Backend Architecture

This document describes the architectural patterns, directory structure, data access layer, validation rules, and design conventions used in the API backend (`api/src`).

## Architectural Overview

The backend is built with **NestJS** and structured around a **Feature-Based Modular Architecture**. Each domain entity or business domain is isolated in its own feature module under `src/modules/`.

```diagram
Client Request
      |
      v
Controller  (Routing, HTTP status, Zod Validation Pipe)
      |
      v
  Service   (Business logic, domain workflows, auditing, password hashing)
      |
      v
Repository  (Prisma query execution, soft delete filters, data transformations)
      |
      v
Prisma ORM  (Database client)
      |
      v
 PostgreSQL
```

## Core Architectural Rules

1. **Feature Isolation**: Each module is self-contained under `src/modules/<feature_name>/`.
2. **Layered Data Access**: Code follows the strict `Controller -> Service -> Repository -> Prisma` pipeline. Lower layers must not depend on upper layers.
3. **Domain Exception Isolation**: Repositories and services throw domain-specific exceptions (`DomainException` hierarchy). HTTP status mapping is handled globally by `HttpExceptionFilter`.
4. **Validation via Zod**: Input DTOs are validated using Zod schemas executed by `ZodValidationPipe`. NestJS `class-validator` DTOs are not used for request body validation.
5. **Clean Barrel Imports**: Every module exposes an `index.ts` barrel file that exports its components and DTOs for use across the application.

---

## Directory Structure

```folder
api/src/
├── app.module.ts              # Root module configuring global providers and infrastructure
├── main.ts                    # Application entry point (CORS, cookies, versioning, global pipes)
├── config/                    # Environment variable parsing and type-safe validation
├── common/                    # Shared cross-cutting concerns
│   ├── decorators/            # Custom NestJS decorators (e.g., @Roles, @CurrentUser)
│   ├── exceptions/            # Domain exception hierarchy (DomainException, UserNotFoundException)
│   ├── filters/               # Global exception filters (HttpExceptionFilter, WsExceptionFilter)
│   ├── guards/                # Authentication and authorization guards (JwtAuthGuard, RolesGuard)
│   ├── pipes/                 # Custom pipes (ZodValidationPipe)
│   ├── services/              # Common utility services (CustomLoggerService)
│   └── utils/                 # General helper functions (parseBool, parseQueryInt)
├── shared/                    # Application-wide shared module (SharedModule)
└── modules/                   # Feature modules
    ├── index.ts               # Master module barrel export
    ├── appointments/
    ├── auth/
    ├── businesses/
    ├── health/
    ├── notifications/
    ├── prisma/                # Prisma ORM database connection module
    ├── queues/
    ├── subscriptions/
    └── users/                 # Example fully-implemented feature module
        ├── dto/
        │   ├── create-user.schema.ts
        │   ├── update-user.schema.ts
        │   └── index.ts       # DTO barrel export
        ├── audit.service.ts
        ├── users.controller.ts
        ├── users.module.ts
        ├── users.repository.ts
        ├── users.service.ts
        └── index.ts           # Module barrel export
```

---

## Module File Layout

Each feature module located in `src/modules/<feature_name>/` follows a flat, consistent directory layout:

| File / Folder             | Purpose                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `<feature>.module.ts`     | Declares NestJS `@Module()`, registers controllers, services, repositories, and imports dependencies.                  |
| `<feature>.controller.ts` | Defines HTTP routes, applies route guards, and delegates request handling to the Service.                              |
| `<feature>.service.ts`    | Contains core business rules, coordinates repositories and auxiliary services.                                         |
| `<feature>.repository.ts` | Handles database queries using `PrismaService`. Maps database models to domain return types.                           |
| `dto/`                    | Subfolder containing Zod schemas (`<action>-<entity>.schema.ts`) and inferred TypeScript DTO types.                    |
| `dto/index.ts`            | DTO barrel re-exporting schema and type definitions.                                                                   |
| `index.ts`                | Module barrel exporting services, controllers, repository, module, and DTO namespace (`export * as dto from './dto'`). |

---

## Data Access Pattern: Service -> Repository -> Prisma

### 1. Controller Layer (`<feature>.controller.ts`)

- Responsible only for HTTP protocol concerns (routes, status codes, query parsing, applying guards and validation pipes).
- Injects and invokes the Service layer.
- Must not call repositories or Prisma directly.

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.BusinessOwner)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }
}
```

### 2. Service Layer (`<feature>.service.ts`)

- Orchestrates business workflows, domain checks, password hashing, and audit logs.
- Calls repository methods for database interaction.
- Throws `DomainException` sub-classes on business logic failures (e.g., `ConflictException`).

```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly audit: AuditService,
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserPublic> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(
        `User with email ${dto.email} already exists`,
      );
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.repo.create({ ...dto, password: hashedPassword });
    await this.audit.logAction('USER_CREATED', user.id);
    return user;
  }
}
```

### 3. Repository Layer (`<feature>.repository.ts`)

- Encapsulates database operations using `PrismaService`.
- Handles data transformations (e.g., stripping password hashes via `toUserPublic`).
- Implements standard query filters for soft deletion (`deletedAt`) and archiving (`archivedAt`).
- Catches Prisma database errors (e.g., `P2025` record not found) and translates them into domain exceptions (`UserNotFoundException`).

```typescript
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserPublic | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    return user ? toUserPublic(user) : null;
  }

  async create(data: CreateUserData): Promise<UserPublic> {
    const user = await this.prisma.user.create({ data });
    return toUserPublic(user);
  }
}
```

---

## Validation & DTO Pattern (Zod)

Validation is performed using **Zod** schemas defined in the `dto/` directory of each feature module.

**Schema Definition**: Schema files export both the Zod schema object and the inferred TypeScript type.

```typescript
// dto/create-user.schema.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  firstName: z.string().min(1, 'First name is required').max(200),
  lastName: z.string().min(1, 'Last name is required').max(200),
  role: z.enum(['Customer', 'BusinessOwner', 'Staff']).default('Customer'),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

**Validation Pipe Execution**: `ZodValidationPipe` validates inbound payload against the target schema and throws an HTTP 400 error with detailed issue fields on failure.

```typescript
// common/pipes/zod-validation.pipe.ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: result.error.issues,
      });
    }
    return result.data;
  }
}
```

---

## Domain Exceptions & Error Handling

Error handling uses dedicated domain exception classes located in `src/common/exceptions/domain.exception.ts`:

- `DomainException`: Base class for all domain errors.
- `NotFoundException` / `UserNotFoundException`: Maps to HTTP 404.
- `ConflictException`: Maps to HTTP 409.
- `UnauthorizedException`: Maps to HTTP 401.
- `InvalidStateException`: Maps to HTTP 400.
- `ValidationException`: Maps to HTTP 422.

The global filter `HttpExceptionFilter` (`src/common/filters/http-exception.filter.ts`) catches all exceptions and formats standardized JSON error responses:

```json
{
  "statusCode": 404,
  "timestamp": "2026-08-02T21:43:04.000Z",
  "path": "/v1/users/user_123",
  "message": "User with id user_123 not found",
  "error": "Not Found"
}
```

---

## Barrel Exports Strategy

To maintain clean import paths across modules and eliminate relative path confusion:

1. **Module Internal Barrel**: `src/modules/<feature>/index.ts` exports all services, controllers, repositories, module, and DTO namespace.
2. **Global Modules Barrel**: `src/modules/index.ts` exports all feature modules.
3. **App Imports**: Features are imported using path alias `@/modules` (configured in `tsconfig.json`).

Example import in `app.module.ts`:

```typescript
import { UsersModule, AuthModule, PrismaModule } from '@/modules';
```

---

## Creating a New Feature Module Checklist

When introducing a new domain entity or feature (e.g., `orders`):

1. Create directory `src/modules/orders/` and `src/modules/orders/dto/`.
2. Define Zod validation schemas in `dto/create-order.schema.ts` and `dto/update-order.schema.ts`.
3. Create `dto/index.ts` to export all DTOs and schemas.
4. Implement `orders.repository.ts` with database access methods via `PrismaService`.
5. Implement `orders.service.ts` with business logic and `OrdersRepository` injection.
6. Implement `orders.controller.ts` with route handlers, `@UsePipes(new ZodValidationPipe(...))`, and authorization guards.
7. Declare `orders.module.ts` registering the controller, service, repository, and imports.
8. Create `src/modules/orders/index.ts` exporting module contents and `export * as dto from './dto'`.
9. Export the new module from `src/modules/index.ts` and add `OrdersModule` to `app.module.ts`.
