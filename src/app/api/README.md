# API layer (`src/app/api`)

Next.js Route Handlers are the HTTP adapter of the application. They are kept
deliberately thin — the equivalent of "controllers" in a traditional
MVC application — and delegate to `src/controllers`.

## Request flow

```
Route handler (HTTP adapter)          src/app/api/<feature>/route.ts
  → Controller (orchestration)        src/controllers/<feature>.controller.ts
  → Service (business logic)          src/services/<feature>/<feature>.service.ts
  → Repository (data access)          src/repositories/<feature>/<feature>.repository.ts
```

## Route handler contract

Every route handler MUST:

1. Parse and validate input with a Zod schema from `src/validations`; throw a
   `ValidationError` on failure.
2. Call exactly one controller method.
3. Return responses via the helpers in `src/utils/api-response` (`ok`,
   `created`, `noContent`).
4. Catch errors and delegate to `handleRouteError` from
   `src/lib/http/error-handler`.
5. Generate a `requestId` per request for log correlation.

## Conventions

- Business routes use the `/api/v1/<resource>` prefix (see `src/constants/api`).
- Public/infrastructure routes (like `/api/health`) stay outside the version
  prefix.
- No business logic in route files. If a route file grows past ~40 lines,
  extract a controller.
- Authentication and authorization guards are added in a later phase via a
  shared `withAuth` wrapper — do not add per-route auth logic.
