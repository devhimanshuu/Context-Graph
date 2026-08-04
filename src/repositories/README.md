# Repository layer (`src/repositories`)

## Contract

- `base/base-repository.ts` defines the generic `BaseRepository` contract.
- Concrete repositories are added per feature in Phase 2 and extend
  `BaseRepository`, importing the Prisma client singleton from
  `src/prisma/client.ts`.

## Rules

1. Repositories are the **only** layer that touches the data store (Prisma).
2. Services depend on repository _interfaces_, never on Prisma directly
   (Dependency Inversion).
3. No business logic in repositories — no rule evaluation, no permission
   checks, no serialization of domain errors.
4. Each repository owns a single entity/aggregate. If a query spans
   aggregates, it lives in the repository of the aggregate it "reads as".

## Layout (from Phase 2)

```
src/repositories/
  base/base-repository.ts
  nodes/node.repository.ts
  nodes/node.repository.types.ts
  edges/edge.repository.ts
```
