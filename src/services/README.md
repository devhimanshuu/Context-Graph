# Service layer (`src/services`)

Services hold business logic. They are the most important layer of the
application and must stay free of framework concerns.

## Conventions

1. **One module per responsibility.** `src/services/<feature>/<feature>.service.ts`.
2. **Program against an interface.** Each service exposes an interface and an
   implementation; the composition root binds them (see `health.service.ts`).
   This makes services trivially fakeable in tests.
3. **Depend on abstractions.** Services use repositories (interfaces),
   the `Logger` interface, and `env` from `@/config` — never Prisma directly
   and never `process.env` ad hoc.
4. **Return DTOs, not framework types.** Services never import `NextResponse`
   or other Next.js HTTP types.
5. **Domain-agnostic.** No feature-specific code lives outside its service
   module; cross-feature logic is composed via interfaces.

## Layout

```
src/services/
  logging/          # cross-cutting infrastructure service
  health/           # example feature service (Phase 1 reference)
  <feature>/        # Phase 2+ domain services
```
