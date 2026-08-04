# ContextGraph

**Enterprise Context Intelligence Platform**

ContextGraph is an enterprise knowledge infrastructure platform that retrieves
organization-specific knowledge using graph traversal, deterministic rule
engines, permission-aware filtering, and context assembly for AI systems.

Although the initial implementation is built around a healthcare assessment,
the architecture is **completely domain-agnostic** and will later support
hospitals, finance, legal firms, software companies, universities,
manufacturing, and other organizations.

> **Status: Phase 1 — Foundation.** This repository is the production-ready
> project foundation. No business logic (graph traversal, rule engine,
> permissions, auth, data models) has been implemented yet — see
> [Roadmap](#roadmap).

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

| Concern         | Choice                                 |
| --------------- | -------------------------------------- |
| Frontend        | Next.js 15 (App Router), TypeScript    |
| Styling         | Tailwind CSS v4, shadcn/ui             |
| Backend         | Next.js Route Handlers                 |
| Database        | Supabase PostgreSQL (Phase 2)          |
| Database client | Prisma 6 (client wired, no models yet) |
| Validation      | Zod                                    |
| Authentication  | Supabase Auth (Phase 2)                |
| Charts          | Recharts (Phase 2+)                    |
| Graph viz       | React Flow (Phase 2+)                  |
| Deployment      | Vercel                                 |

## Architecture

Layered, feature-first, clean architecture. The request flow is:

```
Route handler (HTTP adapter)        src/app/api/**
  → Controller (orchestration)      src/controllers/**
    → Service (business logic)      src/services/**
      → Repository (data access)    src/repositories/**
```

- Route handlers are thin HTTP adapters; all responses flow through
  standardized helpers (`src/utils/api-response`).
- Controllers orchestrate; they hold no business logic.
- Services hold business logic and depend on interfaces, never on the
  framework or the data store directly.
- Repositories are the only layer that talks to Prisma.
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
│   ├── components/              # Reusable UI
│   │   ├── ui/                  #   shadcn/ui primitives
│   │   ├── layout/              #   Dashboard shell (sidebar, header, ...)
│   │   └── dashboard/           #   Dashboard building blocks
│   ├── config/                  # Validated, centralized configuration
│   ├── constants/               # App metadata, routes, API constants
│   ├── controllers/             # Thin orchestration layer
│   ├── dto/                     # Data-transfer objects (API boundary)
│   ├── features/                # Feature-first modules (Phase 2+)
│   ├── hooks/                   # Reusable React hooks
│   ├── lib/                     # Framework-adjacent infrastructure
│   │   ├── errors/              #   Centralized error architecture
│   │   └── http/                #   HTTP helpers (error handler)
│   ├── prisma/                  # Prisma schema + client singleton
│   ├── providers/               # App-wide providers (theme, ...)
│   ├── repositories/            # Data access layer
│   ├── services/                # Business logic layer (logging, health)
│   ├── styles/                  # Global styles (via app/globals.css)
│   ├── types/                   # Shared domain-agnostic types
│   ├── utils/                   # Pure, reusable helpers
│   └── validations/             # Zod schemas (env, common)
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
| `npm run prisma:*`     | Prisma tooling (`generate`, `studio`) |

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

| Variable       | Required | Description                                      |
| -------------- | -------- | ------------------------------------------------ |
| `NODE_ENV`     | no       | `development` / `test` / `production`            |
| `APP_URL`      | no       | Public base URL of the app                       |
| `LOG_LEVEL`    | no       | `debug` / `info` / `warn` / `error`              |
| `DATABASE_URL` | no*      | Supabase PostgreSQL connection string (*Phase 2) |

See `.env.example` for the documented template.

## Roadmap

| Phase | Scope                                                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Foundation** — architecture, tooling, error handling, logging, dashboard shell _(this phase)_                                                            |
| 2     | Data models, Supabase + Prisma wiring, authentication, knowledge graph schema & traversal (BFS), React Flow visualization, organization/workspace settings |
| 3     | Deterministic rule engine, permission-aware filtering, context assembly, charts (Recharts)                                                                 |
| 4     | AI integrations (context payloads for LLMs), audit/compliance, multi-tenant hardening, observability (Sentry/Datadog)                                      |

## Documentation

- [docs/architecture.md](docs/architecture.md) — architecture, layers,
  principles and rationale.
- Layer convention guides live as `README.md` files inside each `src/*`
  folder (`services`, `repositories`, `features`, `app/api`, ...).
