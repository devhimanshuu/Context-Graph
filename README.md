# ContextGraph

**Enterprise Context Intelligence Platform** — retrieve, organize, filter,
secure, and assemble organizational knowledge before it is provided to AI
systems. Domain-agnostic: healthcare, finance, legal, education,
manufacturing, software and government use the same architecture — the
hospital assessment ships purely as seed data.

## Tech stack

| Layer         | Technology                                                  |
| ------------- | ----------------------------------------------------------- |
| Web           | Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui |
| Backend       | **NestJS** (modular monolith) · TypeScript                  |
| Database      | PostgreSQL · Prisma                                         |
| Validation    | Zod                                                         |
| Auth          | JWT + Passport (web signs in via Clerk)                     |
| Cache / Queue | Redis · BullMQ (ready; memory binding by default)           |
| API docs      | Swagger (`/docs`)                                           |
| Logging       | Pino (structured)                                           |
| Observability | Health checks, request/correlation ids, OpenTelemetry-ready |
| Testing       | Vitest · Supertest                                          |

## Repository layout

```
apps/
  web/        Next.js frontend (dashboard, marketing, Clerk auth)
  api/        NestJS backend — see docs/backend-nestjs.md
packages/
  types/      @contextgraph/types    domain contracts, enums, primitives
  shared/     @contextgraph/shared   Result<T>, pagination, API envelopes, constants
  config/     @contextgraph/config   validated environment schema (Zod)
  ui/         @contextgraph/ui       design system (placeholder)
docs/         architecture, database, application, graph-engine, backend
```

## Development setup

Prerequisites: Node 20+, Docker (for Postgres + Redis) — or bring your own
PostgreSQL/Redis.

```bash
# 1. Dependencies (npm workspaces: packages + API + web)
npm install

# 2. Infrastructure (PostgreSQL with pgvector + Redis)
docker compose up -d

# 3. Environment files (never commit real secrets)
cp apps/api/.env.example apps/api/.env    # fill DATABASE_URL, JWT secrets
cp apps/web/.env.example apps/web/.env.local   # fill Clerk keys (web)

# 4. Database (point DATABASE_URL at your local PostgreSQL or Supabase)
npm run db:migrate     # apply migrations (incl. pgvector extension)
npm run db:seed        # idempotent seed (healthcare + finance tenants)

# 5. Run
npm run dev:api        # NestJS on http://localhost:3001  (swagger at /docs)
npm run dev:web        # Next.js on http://localhost:3000
```

### Demo login

The seeded demo tenant (`meridian-health`) ships with one user per role, all
sharing the password from `SEED_USER_PASSWORD` (default
`ContextGraph-demo-2026!`, must match `NEXT_PUBLIC_DEMO_PASSWORD` on the web).
The dashboard picks a seeded user and signs in through the API with verified
bcrypt credentials — every engine then renders permission-aware output for
that role.

### Useful scripts (root)

```bash
npm run build          # packages → api → web
npm run typecheck      # api + web
npm run lint           # api + web
npm test               # api + web unit tests
npm run test:e2e       # api e2e (supertest)
npm run db:migrate     # prisma migrate dev (api workspace)
npm run db:seed        # prisma db seed
```

## API conventions

- Versioned REST under `/api/v1` (Swagger UI at `/docs`).
- Uniform envelopes: `{ success, data, requestId, timestamp }` /
  `{ success: false, error: { code, message, details }, requestId, timestamp }`.
- Stable error codes (`ERR_*`) from `@contextgraph/shared`.
- Guards run in order: throttle → JWT → roles → permissions → tenant isolation.
- Everything is dependency-injected; repositories are the only Prisma boundary.

## Completed roadmap

1. **Foundation** — enterprise monorepo shell, error architecture, dashboard UI
2. **Data layer** — Prisma schema, migrations, idempotent multi-tenant seed
3. **Application layer** — service contracts, pipeline contracts, DI, events
4. **Graph engine** — BFS traversal, cycle detection, metrics (69 unit tests)
5. **Auth** — Clerk on the web, verified credentials + JWT on the API
6. **NestJS backend** — modular monolith, 28 feature modules
7. **Retrieval** — hybrid graph/semantic/lexical search (pgvector + RRF)
8. **AI context layer** — grounded chat with citations, provider gateways
9. **Agents & MCP** — governed agent runtime, tool authorization, MCP server

## Next phases

- Rule engine + permission compiler (plug into the existing contracts)
- Server-side BFS binding to `IGraphService`, BullMQ workers, Redis cache
- React Flow visualization (web) consuming the Graph API
- Node versioning, event sourcing, realtime updates, multi-tenant hardening

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — overall architecture
- [`docs/database.md`](docs/database.md) — schema, indexes, scaling
- [`docs/application-architecture.md`](docs/application-architecture.md) — application contracts
- [`docs/graph-engine.md`](docs/graph-engine.md) — traversal engine
- [`docs/backend-nestjs.md`](docs/backend-nestjs.md) — NestJS backend
