# Feature-first architecture (`src/features`)

ContextGraph is organized around **features**, not technical layers. A feature
is a cohesive slice of business capability (e.g. `knowledge-graph`, `rules`,
`permissions`, `contexts`). Technical layers that span features — services,
repositories, constants, validations — live in their sibling folders.

## When a module belongs in `src/features`

- It is a UI + logic unit for one business capability (page composition,
  feature-specific components, feature-specific hooks/state).
- It is only meaningful within one feature.

## When it does NOT

- Generic, reusable UI → `src/components`
- Data access → `src/repositories`
- Business logic → `src/services`
- Cross-feature validation → `src/validations`
- App-wide state/providers → `src/providers`

## Layout (from Phase 2)

```
src/features/
  knowledge-graph/
    components/         # feature-specific UI (e.g. graph canvas)
    hooks/              # feature-specific hooks
    api/                # feature API client functions
    index.ts            # public surface of the feature
  rules/
  permissions/
  contexts/
```

## Rules

1. Features must not import from other features; share through the technical
   layers (services, repositories, types).
2. Each feature exports a public surface (`index.ts`) that is the only allowed
   entry point for other modules.
3. Pages in `src/app` stay thin: compose feature components, no business logic.
