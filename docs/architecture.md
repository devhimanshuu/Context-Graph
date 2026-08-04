# ContextGraph — Architecture

## 1. High-level architecture

ContextGraph is a **layered, feature-first, clean architecture** application
built on Next.js 15. The application is organized into horizontal layers
(HTTP, orchestration, business logic, data access) with vertical **features**
emerging in later phases.

```
┌───────────────────────────────────────────────────────────────┐
│  Presentation (dashboard shell, pages, client components)      │
│  src/app/(dashboard) · src/components · src/hooks             │
├───────────────────────────────────────────────────────────────┤
│  HTTP boundary (route handlers + API helpers)                 │
│  src/app/api/** · src/utils/api-response · src/lib/http        │
├───────────────────────────────────────────────────────────────┤
│  Orchestration (controllers)                                  │
│  src/controllers/**                                           │
├───────────────────────────────────────────────────────────────┤
│  Business logic (services)                                    │
│  src/services/** · src/features/** (Phase 2+)                 │
├───────────────────────────────────────────────────────────────┤
│  Data access (repositories)                                   │
│  src/repositories/** → src/prisma/client.ts → Supabase/Prisma │
└───────────────────────────────────────────────────────────────┘
  Cross-cutting: config · constants · validations · types · dto · errors · logging
```

### Request flow (reference: `GET /api/health`)

```
route.ts (HTTP adapter)
  → health.controller.ts (orchestration)
    → health.service.ts (logic)
      → (Phase 2: node.repository.ts → Prisma)
  → api-response / error-handler (serialization)
```

## 2. Layer responsibilities

| Layer            | Location                        | Responsibility                                                       |
| ---------------- | ------------------------------- | -------------------------------------------------------------------- |
| Presentation     | `app/(dashboard)`, `components` | Renders UI, wires user intent to the API. Pages stay thin.           |
| HTTP boundary    | `app/api/**`                    | Translates HTTP ⇄ application calls. No business logic.              |
| Controllers      | `controllers/**`                | Orchestrates a single request: validate → call service → return DTO. |
| Services         | `services/**`                   | Holds business logic. Depends on interfaces, returns DTOs.           |
| Repositories     | `repositories/**`               | The only layer that touches the data store.                          |
| DTOs             | `dto/**`                        | Objects crossing the HTTP boundary (request/response contracts).     |
| Validations      | `validations/**`                | Zod schemas shared by API and UI.                                    |
| Errors           | `lib/errors/**`                 | Centralized error taxonomy and normalization.                        |
| Logging          | `services/logging/**`           | `Logger` interface + swappable backend.                              |
| Config/constants | `config/**`, `constants/**`     | Validated environment and app-wide values.                           |
| Utilities        | `utils/**`, `lib/**`            | Pure, framework-agnostic helpers.                                    |

## 3. Design principles

1. **Feature-first, technically clean.** Capabilities grow as features
   (`src/features`), but shared logic always lives in the technical layers so
   features stay decoupled and never import each other.
2. **Dependency inversion.** High-level modules (services) depend on
   abstractions — repository interfaces, the `Logger` interface, validated
   config — never on concrete infrastructure. Concrete bindings happen at
   composition roots (e.g. `health.service.ts`).
3. **Separation of concerns.** One responsibility per module. Route handlers
   parse HTTP; controllers orchestrate; services decide; repositories access
   data. No module spans layers.
4. **Stable public surfaces.** Every layer exposes a barrel (`index.ts`) as
   its public API. Internals can be refactored without breaking consumers.
5. **Fail fast.** Environment configuration is validated at boot; invalid
   config aborts startup with an actionable message instead of failing at
   runtime.
6. **Uniform contracts.** Every API response uses the same envelope
   (`{ success, data, meta }` / `{ success, error }`), every error maps to a
   stable machine-readable code, and every request carries a correlation id.
7. **Testability.** Interface-based services and repository contracts mean
   unit tests can inject fakes with zero infrastructure. The error handler
   and response helpers are pure functions over their inputs.
8. **Extensibility over brevity.** Code is written for senior engineers who
   will maintain it for years: explicit, documented, and never optimized for
   shortest length.

## 4. Why this architecture was chosen

- **Next.js 15 App Router + Route Handlers** eliminate a second backend
  service while keeping a strict layered discipline inside the framework —
  the framework remains an adapter, not the architecture.
- **Controllers vs. route handlers.** Route handlers in Next.js are
  filesystem-bound and awkward to unit test in isolation. Delegating to plain
  controller classes keeps orchestration testable and framework-agnostic.
- **Interface-based services** allow the domain layer to evolve without
  touching HTTP or data-access code, and make multi-team ownership safe:
  teams can change implementations behind stable contracts.
- **Repository pattern** isolates Prisma/Supabase specifics. If the data
  layer changes (direct SQL, another provider), business logic is untouched.
- **Centralized errors + logging** prevent the two most common enterprise
  failure modes — inconsistent API errors and untraceable failures — by
  construction rather than convention.
- **Domain-agnostic core.** The graph/rule/permission/context engines will be
  built as generic, pure modules (Phase 2+) on top of these layers, so the
  healthcare assessment remains one domain among many.

## 5. Phase 1 scope boundaries

Deliberately **not** implemented in Phase 1 (each is a future phase):

- Business APIs and data models (Prisma schema declares none).
- Graph traversal (BFS), the rule engine, and the permission engine.
- Authentication/authorization (Supabase Auth).
- Charts and graph visualization.
- Non-console logging backends (swappable by design).

## 6. Key architectural files

| File                            | Purpose                                            |
| ------------------------------- | -------------------------------------------------- |
| `src/config/env.ts`             | Boot-time validated environment singleton          |
| `src/lib/errors/*`              | Error taxonomy + normalization (`AppError` family) |
| `src/lib/http/error-handler.ts` | Centralized route error → response mapping         |
| `src/utils/api-response.ts`     | Uniform success/error response helpers             |
| `src/services/logging/*`        | Logger contract + console backend                  |
| `src/repositories/base/*`       | Generic repository contract                        |
| `src/app/api/health/route.ts`   | Reference implementation of the request flow       |
| `src/components/layout/*`       | Dashboard shell (sidebar, header, palette, ...)    |
