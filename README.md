# ContextGraph

**Enterprise Context Intelligence Platform**

ContextGraph is an enterprise knowledge infrastructure platform that retrieves
organization-specific knowledge using graph traversal, deterministic rule
engines, permission-aware filtering, and context assembly for AI systems.

Although the initial implementation is built around a healthcare assessment,
the architecture is **completely domain-agnostic** and will later support
hospitals, finance, legal firms, software companies, universities,
manufacturing, and other organizations.

> **Status: Phase 3 — Foundation + data layer + application layer.** The
> production-ready project foundation ships with a complete, domain-agnostic
> database layer (schema, migrations, seed, repository contracts) **and** the
> application-layer blueprint: service contracts, use-case contracts, pipeline
> contracts, DTOs, events, caching, configuration, logging and dependency
> injection. No business logic (graph traversal, rule engine, permissions,
> auth) has been implemented yet — see [Roadmap](#roadmap). The healthcare
> assessment is expressed purely as seed data.

---

## Table of contents

- [Project overview](#project-overview)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Development setup](#development-setup)
- [Available scripts](#available-scripts)
- [Coding standards](#coding-standards)
- [Environment variables](#environment-variables)
- [Roadmap](#roadmap)
- [Documentation](#documentation)

---

## Project overview

ContextGraph solves a recurring enterprise problem: AI systems need
organization-specific context, but that context lives in a web of connected,
permission-restricted knowledge. The platform builds and traverses a
**knowledge graph**, evaluates **deterministic rules**, applies
**permission-aware filtering**, and assembles the surviving knowledge into
**context packages** ready for LLM consumption.

Phase 1 delivers the foundation a company with millions of users and multiple
engineering teams would start from: a hardened Next.js application shell, a
clean layered architecture, standardized error handling, an extensible logging
system, validated configuration, and a professional enterprise dashboard.

## Tech stack

| Concern         | Choice                              |
| --------------- | ----------------------------------- |
| Frontend        | Next.js 15 (App Router), TypeScript |
| Styling         | Tailwind CSS v4, shadcn/ui          |
| Backend         | Next.js Route Handlers              |
| Database        | Supabase PostgreSQL                 |
| Database client | Prisma 6 (models, migrations, seed) |
| Validation      | Zod                                 |
| Authentication  | Supabase Auth (Phase 4+)            |
| Charts          | Recharts (Phase 4+)                 |
| Graph viz       | React Flow (Phase 4+)               |
| Deployment      | Vercel                              |

## Architecture

Layered, feature-first, clean architecture. The request flow is:

```
Route handler (HTTP adapter)        src/app/api/**
  → Controller (orchestration)      src/controllers/**
    → Service (business logic)      src/services/**
      → Repository (data access)    src/repositories/**
        → Prisma client             src/prisma/client.ts → Supabase
```

- Route handlers are thin HTTP adapters; all responses flow through
  standardized helpers (`src/utils/api-response`).
- Controllers orchestrate; they hold no business logic.
- Services hold business logic and depend on interfaces, never on the
  framework or the data store directly.
- Repositories are the only layer that talks to Prisma; Phase 2 ships the
  repository **contracts** (`src/repositories/**`), the canonical domain
  models (`src/domain/models/**`), validation schemas and DTOs, and the full
  Prisma schema (`src/prisma/schema.prisma`). See
  [docs/database.md](docs/database.md) for the data-layer design.
- Errors are centralized (`src/lib/errors`); every failure returns a uniform
  envelope and is logged by severity.
- Logging is interface-based (`src/services/logging`); the console backend can
  be swapped for Pino/Winston/Datadog/Sentry without touching business logic.

See [docs/architecture.md](docs/architecture.md) for the full design rationale.

## Folder structure

```
.
├── docs/                        # Architecture and design documents
├── public/                      # Static assets
├── src/
│   ├── app/                     # Next.js App Router (routes, layouts, API)
│   │   ├── (dashboard)/         #   Dashboard route group (shell + pages)
│   │   ├── api/                 #   Route handlers (HTTP adapter layer)
│   │   ├── layout.tsx           #   Root layout (fonts, providers)
│   │   ├── error.tsx            #   Global error boundary
│   │   └── not-found.tsx        #   404 page
│   ├── application/             # Application layer (Phase 3, contracts only)
│   │   ├── services/interfaces/ #   Replaceable service contracts
│   │   ├── use-cases/           #   Use-case contracts (I/O DTOs, deps)
│   │   ├── contracts/           #   Pipeline contracts (context, result)
│   │   ├── pipelines/           #   Stage interface + stage registry
│   │   ├── dto/                 #   Context and IO DTOs
│   │   ├── events/              #   Event contracts (pipeline lifecycle)
│   │   ├── mappers/             #   Mapper contracts
│   │   ├── caching/             #   Cache contracts + key builders
│   │   ├── config/              #   Typed application configuration
│   │   ├── logging/             #   ILogger / IAuditLogger / IMetricsLogger
│   │   ├── di/                  #   Container, registry, resolver, providers
│   │   ├── shared/              #   Re-exported generic types
│   │   ├── testing/             #   Builders, fixtures, mocks, helpers
│   │   └── errors/              #   Application error family
│   ├── components/              # Reusable UI
│   │   ├── ui/                  #   shadcn/ui primitives
│   │   ├── layout/              #   Dashboard shell (sidebar, header, ...)
│   │   └── dashboard/           #   Dashboard building blocks
│   ├── config/                  # Validated, centralized configuration
│   │   ├── env.ts               #   Application environment
│   │   └── database.ts          #   Database configuration (fail-fast)
│   ├── constants/               # App metadata, routes, API, domain enums
│   ├── controllers/             # Thin orchestration layer
│   ├── domain/                  # Domain layer (DDD)
│   │   ├── base.ts              #   Shared entity contracts
│   │   ├── enums.ts             #   Domain enum unions
│   │   └── models/              #   Canonical entity interfaces
│   ├── dto/                     # Request/response DTOs (API boundary)
│   ├── features/                # Feature-first modules (Phase 3+)
│   ├── hooks/                   # Reusable React hooks
│   ├── lib/                     # Framework-adjacent infrastructure
│   │   ├── errors/              #   Error architecture (+ database errors)
│   │   └── http/                #   HTTP helpers (error handler)
│   ├── prisma/                  # Prisma schema, migrations, client, seed
│   │   ├── migrations/          #   Versioned SQL migrations
│   │   ├── schema.prisma        #   Data model (Phase 2)
│   │   └── seed.ts              #   Idempotent seed (healthcare + finance)
│   ├── providers/               # App-wide providers (theme, ...)
│   ├── repositories/            # Repository contracts (data access)
│   ├── services/                # Business logic layer (logging, health)
│   ├── styles/                  # Global styles (via app/globals.css)
│   ├── types/                   # Generic types (pagination, utility, API)
│   ├── utils/                   # Pure, reusable helpers
│   └── validations/             # Zod schemas (env, database, entities)
```

## Development setup

Requirements: **Node.js ≥ 20** (`.nvmrc` pins 24).

```bash
# 1. Install dependencies
npm install

# 2. Create local environment from the template
cp .env.example .env.local   # adjust values as needed

# 3. Generate the Prisma client (Phase 2 needs models; generates now)
npm run prisma:generate

# 4. Start the development server
npm run dev
```

Open http://localhost:3000 — you should see the ContextGraph dashboard shell.
Verify the API layer at http://localhost:3000/api/health.

> Optional: `npx husky init` already configured the `prepare` script and
> `pre-commit` hook (lint-staged). On a fresh clone, `npm install` wires the
> hook automatically.

## Available scripts

| Script                 | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack)      |
| `npm run build`        | Production build                      |
| `npm run start`        | Serve the production build            |
| `npm run lint`         | Lint with ESLint                      |
| `npm run lint:fix`     | Lint and auto-fix                     |
| `npm run format`       | Format everything with Prettier       |
| `npm run format:check` | Verify formatting                     |
| `npm run typecheck`    | Type-check with `tsc --noEmit`        |
| `npm run db:generate`  | Generate the Prisma client            |
| `npm run db:validate`  | Validate the Prisma schema            |
| `npm run db:migrate`   | Dev migration (create + apply + seed) |
| `npm run db:deploy`    | Apply migrations (CI/CD, no prompts)  |
| `npm run db:reset`     | Reset DB, re-apply migrations + seed  |
| `npm run db:seed`      | Run the idempotent seed               |
| `npm run db:studio`    | Open Prisma Studio                    |

## Coding standards

- **Strict TypeScript.** `strict: true`; no `any` (enforced by ESLint).
- **ESLint + Prettier** with `eslint-config-prettier`; Prettier formats with
  `prettier-plugin-tailwindcss`.
- **Husky + lint-staged** run lint and format on every commit.
- **Path aliases.** `@/*` → `src/*` (see `tsconfig.json`).
- **Environment validation.** All env vars are Zod-validated at boot
  (`src/config/env.ts`); invalid configuration fails fast with a readable
  message.
- **Centralized configuration.** `src/config` + `src/constants` are the only
  places for app-wide values.
- **No monoliths.** One responsibility per module; barrel files
  (`index.ts`) define public surfaces.
- **Conventions by layer.** Each layer folder ships a `README.md` documenting
  its contract.

## Environment variables

| Variable       | Required | Description                                                                                                        |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`     | no       | `development` / `test` / `production`                                                                              |
| `APP_URL`      | no       | Public base URL of the app                                                                                         |
| `LOG_LEVEL`    | no       | `debug` / `info` / `warn` / `error`                                                                                |
| `DATABASE_URL` | no*      | Supabase PostgreSQL connection string (*required for migrations/seed/repositories; the app shell boots without it) |

See `.env.example` for the documented template.

## Roadmap

| Phase | Scope                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | **Foundation** — architecture, tooling, error handling, logging, dashboard shell _(done)_                                                                                |
| 2     | **Data layer** — Prisma schema (generic core: org/workspace/node/edge/profile/rule), migrations, seed, repository contracts, domain models, DTOs, database docs _(done)_ |
| 3     | **Application layer** — service contracts, use-case contracts, pipeline contracts, DTOs, events, caching, config, logging, DI, testing scaffolding _(done)_              |
| 4     | Graph traversal & BFS, rule engine, permission compiler, first business APIs                                                                                             |
| 5     | Authentication, React Flow visualization, context assembly for AI, node versioning, analytics, multi-tenant hardening, observability                                     |

## Documentation

- [docs/architecture.md](docs/architecture.md) — architecture, layers,
  principles and rationale.
- [docs/database.md](docs/database.md) — database design: ER diagram, entity
  purposes, index strategy, scaling, migrations, future extensibility.
- [docs/application-architecture.md](docs/application-architecture.md) —
  application layer: pipeline design, service contracts, use cases, DI flow,
  future extension strategy.
- Layer convention guides live as `README.md` files inside each `src/*`
  folder (`services`, `repositories`, `features`, `app/api`, ...).
