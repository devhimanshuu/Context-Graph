# Frontend Architecture — Enterprise Dashboard

Phase 9 delivers the production-grade Next.js frontend for ContextGraph. This document
describes how the app is structured, how it talks to the NestJS backend, and the
engineering decisions behind the implementation.

> Backend reference: [api.md](./api.md) · Pipeline: [context-pipeline.md](./context-pipeline.md)

---

## 1. App Architecture

```
apps/web  (Next.js 15, App Router, TypeScript, Tailwind v4, shadcn/ui)
├── app/
│   ├── page.tsx                 # Public marketing landing page
│   ├── login/                   # Clerk-hosted sign-in (catch-all [[...signin]])
│   ├── sign-up/                 # Clerk-hosted sign-up (catch-all [[...signup]])
│   ├── onboarding/              # Post-signup workspace setup
│   └── dashboard/               # Authenticated application shell
│       ├── layout.tsx           # Session gate → SidebarProvider → ApiProvider
│       ├── page.tsx             # Overview (real backend metrics)
│       ├── knowledge/           # Knowledge explorer + node editor (Phase 9)
│       ├── knowledge-graph/     # React Flow reachability explorer
│       ├── pipeline/            # Live trace, run history, run diff, benchmark
│       │   └── [executionId]/   # Deep-linkable immutable run detail (requestId)
│       │                        #   shared with history rows, overview activity
│       │                        #   and diff headers via pipeline-run-detail.tsx
│       ├── contexts/            # Context resolution → ranked package
│       ├── rules/               # Rule pipeline definition + live run
│       ├── permissions/         # Compiled auth context + evaluation playground
│       ├── users/               # Member management (ADMIN/HOD)
│       ├── departments/         # Department hierarchy tree
│       ├── organizations/       # Tenant profile + footprint (Phase 9)
│       ├── audit/               # Immutable audit log
│       ├── analytics/           # Usage aggregates from the audit store
│       └── configuration/       # Read-only engine configuration (ADMIN)
├── components/
│   ├── layout/                  # Shell: sidebar, header, breadcrumbs, command menu
│   ├── dashboard/               # Page-level feature components
│   ├── marketing/               # Landing page sections
│   └── ui/                      # shadcn/ui primitives
├── lib/
│   ├── api/                     # Typed API client + DTO contracts
│   └── auth/                    # Clerk session helpers + appearance
└── hooks/                       # use-api-query (TanStack Query), useApi, useSpring…
```

**The frontend is an adapter, not a source of truth.** All business logic — graph
traversal, authorization, rules, ranking, budgeting — lives in the NestJS backend
(`apps/api`, `/api/v1`). The Next.js app only renders, interacts, and manages client
state. This mirrors the backend rule in `api.md`: the reverse dependency (domain logic
depending on HTTP/frontend concerns) never happens.

## 2. Routing

- **Public**: `/`, `/login`, `/sign-up`, `/onboarding`.
- **Authenticated**: everything under `/dashboard`. The dashboard layout is a **server
  component** that resolves the Clerk session first and `redirect()`s to `/login` when
  unauthenticated.
- Every route is declared in `src/constants/routes.ts` (single source of truth for
  `ROUTES`, `ROUTE_TITLES`, and the `AppRoute` union). The sidebar and the ⌘K command
  menu both render from `src/components/layout/nav-config.ts` — adding a page means
  touching two files, and it appears everywhere.

```
HTTP → App Router → dashboard/layout (session gate) → page → API client → NestJS /api/v1
```

## 3. Component Architecture

Components are small and focused, composed per page:

- **Shell** (`layout/`): `AppSidebar` (spring-animated collapsible rail + mobile sheet),
  `AppHeader` (breadcrumbs, command-menu trigger, demo-user switcher, theme toggle,
  user menu), `ApiStatusBar`, `CommandMenu` (⌘K).
- **Design system** (`ui/` + `dashboard/`): shadcn/ui primitives plus product-level
  building blocks — `PageHeader`, `EmptyState`, `StatCard`, `Badge`, `Card`,
  `RuleExplanationPanel` ("why included/excluded?"), `ContextPackageSummary`,
  `TracePlayer`, `StageDurationHeatmap`, `KnowledgeGraphView`.
- **Pages** compose primitives; they hold request state, never business logic.

## 4. API Client

All network access goes through the centralized typed client
(`src/lib/api/client.ts`). Components never call `fetch()` directly.

- Base URL: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001/api/v1`).
- **Envelope handling**: every response is unwrapped from
  `{ success, data, requestId, timestamp }`; non-2xx or `success: false` becomes a
  typed `ApiError` with the stable `ERR_*` code, message, details, and status.
- **Authentication**: the demo flow is `bootstrap` (public) → `login` → JWT stored
  locally and attached as `Authorization: Bearer …`. `getStoredToken()` survives
  reloads.
- **Request IDs**: the backend generates/echoes `X-Request-ID`; the client surfaces
  errors with the code and message but never raw stack traces.
- DTO contracts live in `src/lib/api/types.ts`, mirroring the backend response DTOs.
  Domain enums (`Role`, `NodeType`, `NodeStatus`, `ComplianceTag`, …) are kept in one
  place and reused by every page.## 5. Server State — TanStack Query

Server state is managed by **TanStack Query** (`@tanstack/react-query` v5). The
`QueryProvider` (inside `ApiProvider` in the dashboard layout) configures sensible
conservative defaults: 30s stale time, one retry, no refetch-on-window-focus.

`src/hooks/use-api-query.ts` binds queries to the API connection:

- **`useApiQuery(queryKey, fetcher, options?)** — the generic wrapper. The query is
disabled until the API is `ready`, and the query key is **suffixed with the selected
  demo user id**, so switching users (which changes the compiled authorization
  context) always produces a fresh, permission-aware cache entry — the previous
  user's data is never served to the new one.
- **Shared typed hooks** for every backend resource: `useKnowledgeNodes`,
  `useGraphEdges`, `useWorkspaceRules`, `usePipelineRuns`, `useDepartments`, `useUsers`,
  `useCurrentOrganization`, `useAuditSummary`, `useAuditEntries`, `useAnalyticsSummary`,
  `useEngineConfiguration`, `useRuleEngineDefinition`.
- Mutations (create/edit/archive user, node, department) call `refetch()` on the
  affected query after the API call succeeds, so the UI reflects the persisted state.

Components consume the standard `UseQueryResult` shape: `data`, `isPending`, `isError`,
`error`, `refetch()`. There is deliberately no per-page local state duplication — the
cache is the single source of truth for server data.

## 6. Client State

Client-side state stays in React (`useState`/`useContext`):

- `SidebarProvider` — sidebar open/collapsed preference (persisted).
- `ApiProvider` — connection state, bootstrap, selected demo user, compiled
  authorization context.
- Per-page UI state (filters, selections, dialog forms) is local to the page.

No Zustand store is currently warranted: there is no shared client-only state that
changes frequently across unrelated components (the closest candidate, sidebar state,
is already served by context). The Zustand seam is documented here for when one
appears (e.g. a global graph-selection panel shared across routes).

## 7. Graph Visualization

`KnowledgeGraphView` wraps React Flow (`@xyflow/react`):

- Custom node components communicate type (FACT/CONSTRAINT/DECISION/ANTI_PATTERN),
  reachable state, and dimmed (filtered-out) state through styling — nodes never carry
  long text; the detail panel holds content.
- **Traversal replay**: the reachability result's discovery `order` drives a staggered
  "nodes light up in sequence" animation.
- **Edge inspection**: clicking an edge opens relationship type, weight, and
  source/target titles.
- **Performance**: nodes are memoized, layout is computed from graph distances rather
  than force simulation, and the explorer degrades gracefully on small screens.

## 8. Design System

Visual language: Linear/Vercel/Stripe-inspired — restrained, information-dense,
premium. No fake statistics, no gratuitous gradients (the one brand gradient —
indigo → sky → fuchsia — is reserved for the logo/wordmark and key CTAs).

Primitives: `StatusBadge` tones per node type/status/clearance, `MetricCard`/`StatCard`,
`PageHeader`, `EmptyState`, `FilterBar` (inline selects + search), `DetailPanel`,
`Timeline`/`TracePlayer`, `ScoreBadge`/compression-hint badges. Styling conventions
(rounded-lg borders, h-8 inputs, muted-foreground labels, monospace metadata) are
shared across all pages.

## 9. Authentication

- **Identity**: Clerk (`@clerk/nextjs`) owns login/signup/session; `getSession()`
  gates the dashboard server-side.
- **API auth**: after login, the app performs the **demo bootstrap** — it picks a
  seeded demo user, calls `POST /auth/login` for a platform JWT, and stores it. Every
  subsequent API call is bearer-authenticated.
- **Never trust the client**: role, permission level, organization, and clearance are
  always derived server-side from the JWT. The UI _hides_ actions the current demo
  user cannot perform (e.g. "Add node" without WRITE), but the backend re-validates
  every request. Frontend route protection is UX, not a security boundary.

## 10. Error Handling

- `ApiError` carries `code` + `message` + `status`; pages render
  `error instanceof Error ? error.message : '…'` — never raw stack traces.
- **States are deliberate**: skeletons while loading (no layout jumps), inline error
  banners with retry, `EmptyState` explaining _what happened_ and _what to do next_.
- The API status bar shows connection state; a `status === 'error'` banner appears on
  every data page with a clear "start the NestJS backend" hint.

## 11. Performance

- Debounced/derived filtering happens in-memory over the workspace dataset (bounded),
  not per-keystroke network calls.
- React Flow nodes are memoized; traversal results are replayed from server metadata.
- The pipeline trace, heatmap, and diff components derive from one response — no
  duplicated fetches.
- No global renders: `useApiData` scopes updates to the consuming page.

## 12. Testing

Unit and component tests run with **Vitest** + **React Testing Library** (`npm test`).

- `src/**/*.test.ts` — pure unit tests (graph utilities, helpers).
- `src/**/*.test.tsx` — component tests that render React components in jsdom, testing
  rendering, user interaction, and state changes.
- Playwright E2E tests (`npm run test:e2e`) verify page structure, navigation,
  auth guards, and theme support across the public and authenticated surfaces.

Key tested components: `PageHeader`, `EmptyState`, `StatCard`, `RuleExplanationPanel`
(the "why included/excluded?" signature feature), plus graph utility functions.

## 13. Accessibility

- Semantic HTML (`nav`, `main`, `table`, `dl`), `aria-label`s on icon-only controls,
  `aria-pressed` on toggle chips, `aria-current` on active nav.
- Focus-visible rings on every interactive element; keyboard navigation works for
  sidebar, command menu, dialogs, and tables.
- `prefers-reduced-motion` is respected by the CSS animation utilities (all
  `motion-safe:` / `cg-*` keyframes are gated).
- Color alone never conveys meaning — badges pair tone with text (e.g. status names).
- Both light and dark themes are fully supported and tested; the theme toggle is a
  single light↔dark button (no system mode).

---

## Final quality checklist (as implemented)

1. **No backend logic in the frontend** — pages call the API client; traversal,
   authorization, rules, and ranking all run in NestJS. ✅
2. **No raw `fetch()` in components** — everything goes through `ApiClient`. ✅
3. **Server state** — centralized in TanStack Query via `useApiQuery` + shared typed
   hooks; user switches invalidate the cache through the query key. ✅
4. **No fabricated metrics** — Overview numbers are computed from the persisted
   pipeline-run event store. ✅
5. **Sensitive data** — tokens live in `localStorage` behind the app's demo auth;
   API responses never include authorization internals. ✅
6. **Primary demo flow** — login → Context Resolution → run pipeline → watch trace →
   inspect ranked package → open "why included?" works end-to-end against the live
   API. ✅
