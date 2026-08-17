# ContextGraph REST API

The ContextGraph backend is consumed exclusively through a versioned, secured,
documented REST API. This document is the contract for v1.

- Base path: `/api/v1`
- Swagger UI: `/docs` (interactive, generated from the actual DTOs)
- Content type: `application/json` (request and response)

---

## 1. Architecture

```
HTTP Request
    ↓
RequestId / CorrelationId middleware  (x-request-id, x-correlation-id)
    ↓
Rate limiter (ThrottlerGuard)          (configurable per endpoint class)
    ↓
JwtAuthGuard                           (JWT → trusted AuthenticatedUser)
    ↓
AuthorizationGuard                     (@Roles / @RequirePermissions / clearance / level)
    ↓
OrganizationGuard                      (tenant isolation on :organizationId params)
    ↓
Controller                             (thin adapter: validate → delegate → map)
    ↓
Application use case / service         (engine composition — all business logic)
    ↓
Repository / Infrastructure            (Prisma, cache, audit)
```

Rules that never change:

- **Controllers are adapters.** They validate input, extract the trusted
  principal, call one use case, and return. No BFS, no authorization logic, no
  Prisma access, no filtering logic lives in a controller.
- **Trusted context is server-derived.** `role`, `permissionLevel`,
  `complianceClearance`, `organizationId`, and `userId` are read from the JWT /
  database — never from the request body. Client-supplied authorization fields
  are ignored.
- **Every response is wrapped** in the platform envelope (see §4).
- **Every error** carries a stable machine-readable code (see §6).

## 2. Versioning

- All business endpoints live under `/api/v1` (URI versioning, `VersioningType.URI`).
- v1 is a compatibility contract: additive changes (new fields, new endpoints)
  are preferred; breaking changes require `/api/v2`.
- Health and Swagger are intentionally unversioned infrastructure surfaces.

## 3. Authentication

Most endpoints require a bearer JWT:

```
Authorization: Bearer <accessToken>
```

- Tokens are issued by `POST /api/v1/auth/login` (demo) and validated by the
  Passport-JWT strategy, which reloads the principal from the database on every
  request (revocation-safe: disabled users are rejected immediately).
- Public endpoints are marked `@Public()`: health probes, demo bootstrap,
  organization slug lookup, and auth.
- Missing/invalid/expired tokens → `401 ERR_UNAUTHORIZED`.

## 4. Response envelopes

Every response uses the platform envelope.

**Success (2xx):**

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 137,
    "totalPages": 7,
    "hasNext": true,
    "hasPrevious": false
  },
  "requestId": "9f1c2e3d-…",
  "timestamp": "2026-08-06T12:00:00.000Z"
}
```

**Error (non-2xx):**

```json
{
  "success": false,
  "error": {
    "code": "ERR_NOT_FOUND",
    "message": "Resource not found",
    "details": []
  },
  "requestId": "9f1c2e3d-…",
  "timestamp": "2026-08-06T12:00:00.000Z"
}
```

Internal stack traces are never exposed; 5xx responses carry a generic message.

## 5. Request IDs & correlation

- Every request receives a `requestId` (generated unless the client supplies a
  valid `X-Request-ID`). The same id is echoed in the response envelope, the
  `x-request-id` response header, structured logs, and error bodies.
- A separate `x-correlation-id` is propagated for cross-service tracing
  (OpenTelemetry-ready).

## 6. Error codes

Stable, machine-readable codes — never couple client logic to message text:

| Status | Code                    | Meaning                                                         |
| ------ | ----------------------- | --------------------------------------------------------------- |
| 400    | `ERR_VALIDATION`        | Malformed input / invalid fields (details carry Zod issues)     |
| 401    | `ERR_UNAUTHORIZED`      | Missing or invalid authentication                               |
| 403    | `ERR_FORBIDDEN`         | Authenticated but not allowed                                   |
| 404    | `ERR_NOT_FOUND`         | Resource not found (also used to hide other tenants' existence) |
| 409    | `ERR_CONFLICT`          | State conflict (e.g. duplicate unique key)                      |
| 413    | `ERR_PAYLOAD_TOO_LARGE` | Request body exceeded the 256 kb limit                          |
| 429    | `ERR_TOO_MANY_REQUESTS` | Rate limited                                                    |
| 500    | `ERR_INTERNAL`          | Unexpected failure (generic message only)                       |

Engine-level codes (`ERR_PIPELINE`, `ERR_GRAPH_CYCLE_DETECTED`,
`ERR_RULE_ENGINE`, …) surface through the same envelope with their mapped
status.

## 7. Rate limiting

- Global default: 300 requests / 60 s per client (in-memory fixed window via
  `@nestjs/throttler`, plus a middleware limiter).
- Endpoint-class overrides:
  - `POST /context/resolve` and `POST /pipeline/context/resolve`: **60 / 60 s**
    (expensive, should be strictly budgeted).
  - Health probes: **exempt** (`@SkipThrottle`) — orchestrators must never be
    throttled into false negatives.
- A `429 ERR_TOO_MANY_REQUESTS` is returned when a limit is hit.

## 8. Request size limits

- JSON request bodies are capped at **256 kb** (rejected with
  `413 ERR_PAYLOAD_TOO_LARGE` before any handler runs).
- Query params and pagination values are validated (see §9).

## 9. Pagination

Collection endpoints use page/limit pagination with sensible caps:

```
GET /api/v1/users?page=1&limit=20
```

- `page` ≥ 1 (default 1), `limit` 1–100 (default 20).
- The envelope's `meta` block carries `page`, `limit`, `total`, `totalPages`,
  `hasNext`, `hasPrevious`.

## 10. Idempotency (context resolution)

`POST /context/resolve` (and `POST /pipeline/context/resolve`) accept an
`Idempotency-Key` header:

```
Idempotency-Key: resolve-acme-0001
```

- Format: 8–64 chars of `[A-Za-z0-9._-]` (malformed → `400 ERR_VALIDATION`).
- A **completed** run recorded under the same key (same organization) is
  returned verbatim without re-execution — safe for agent/client retries.
- Failed runs are NOT short-circuited; the caller retries until success.
- A concurrent duplicate insert races onto a unique index and is rejected with
  `409 ERR_CONFLICT` — retry the same key to obtain the stored result.
- The stored run records the key; it appears as `idempotencyKey` on the run.

## 11. Endpoint catalog

### Health (public)

| Method | Path            | Description                       |
| ------ | --------------- | --------------------------------- |
| GET    | `/health`       | Liveness — process is up          |
| GET    | `/health/live`  | Liveness alias                    |
| GET    | `/health/ready` | Readiness — DB connectivity check |

### Auth (public)

| Method | Path              | Description                                   |
| ------ | ----------------- | --------------------------------------------- |
| POST   | `/auth/login`     | Demo login → `{ accessToken, user }`          |
| GET    | `/demo/bootstrap` | Demo tenant bootstrap (org, workspace, users) |

### Context (the primary surface)

| Method | Path                  | Description                                                     |
| ------ | --------------------- | --------------------------------------------------------------- |
| GET    | `/context/definition` | Pipeline version + stage order                                  |
| POST   | `/context/resolve`    | Run the pipeline → `ContextPackage` (Idempotency-Key supported) |

### Users

| Method | Path         | Access           | Description                               |
| ------ | ------------ | ---------------- | ----------------------------------------- |
| GET    | `/users`     | any (org-scoped) | Paginated member list                     |
| GET    | `/users/me`  | any              | Current principal (trusted, from the JWT) |
| GET    | `/users/:id` | any (org-scoped) | One user                                  |
| POST   | `/users`     | ADMIN/HOD        | Create                                    |
| PATCH  | `/users/:id` | ADMIN/HOD        | Update                                    |
| DELETE | `/users/:id` | ADMIN            | Soft-delete                               |

### Organizations

| Method            | Path                           | Access     | Description                          |
| ----------------- | ------------------------------ | ---------- | ------------------------------------ |
| GET               | `/organizations`               | ADMIN      | Multi-tenant index                   |
| GET               | `/organizations/current`       | any        | Caller organization (trusted)        |
| GET               | `/organizations/by-slug/:slug` | public     | Tenant selection pre-auth            |
| GET               | `/organizations/:id`           | org-scoped | Own organization only (others → 404) |
| POST/PATCH/DELETE | `/organizations(/:id)`         | ADMIN      | Lifecycle                            |

### Departments

| Method           | Path                                         | Description                    |
| ---------------- | -------------------------------------------- | ------------------------------ |
| GET              | `/organizations/:organizationId/departments` | Hierarchy (tenant-guarded)     |
| POST             | `/organizations/:organizationId/departments` | Create (ADMIN/HOD)             |
| GET/PATCH/DELETE | `/departments/:id`                           | CRUD (ADMIN/HOD; DELETE ADMIN) |

### Knowledge

| Method | Path                             | Access        | Description                             |
| ------ | -------------------------------- | ------------- | --------------------------------------- |
| GET    | `/workspaces/:workspaceId/nodes` | any           | Permission-filtered node list           |
| POST   | `/workspaces/:workspaceId/nodes` | write         | Create (permission-aware)               |
| GET    | `/nodes/:id`                     | any           | One node (org-scoped, permission-aware) |
| PATCH  | `/nodes/:id`                     | write         | Update (permission-aware)               |
| DELETE | `/nodes/:id`                     | ADMIN/QUALITY | Soft-delete                             |

### Graph

| Method | Path                                          | Description                                           |
| ------ | --------------------------------------------- | ----------------------------------------------------- |
| GET    | `/workspaces/:workspaceId/edges`              | Edges (org-scoped)                                    |
| POST   | `/workspaces/:workspaceId/edges`              | Create edge — cyclic inserts rejected pre-persist     |
| POST   | `/workspaces/:workspaceId/reachability`       | BFS/weighted reachability from an entry node          |
| POST   | `/debug/workspaces/:workspaceId/reachability` | Debug: validated BFS + raw traversal metadata (ADMIN) |

### Rule engine & rules

| Method                | Path                             | Description                                   |
| --------------------- | -------------------------------- | --------------------------------------------- |
| GET                   | `/rule-engine/definition`        | Engine version + stage order                  |
| POST                  | `/rule-engine/run`               | Full funnel + per-node reasons for a node set |
| GET                   | `/workspaces/:workspaceId/rules` | Stored context rules                          |
| GET/POST/PATCH/DELETE | `/rules(/:id)`                   | Rule CRUD                                     |

### Authorization

| Method | Path                      | Description                      |
| ------ | ------------------------- | -------------------------------- |
| GET    | `/authorization/me`       | Compiled authorization context   |
| POST   | `/authorization/evaluate` | Policy evaluation for a resource |

### Pipeline

| Method | Path                               | Description                                      |
| ------ | ---------------------------------- | ------------------------------------------------ |
| GET    | `/pipeline/context/definition`     | Pipeline definition                              |
| POST   | `/pipeline/context/resolve`        | Resolve (Idempotency-Key supported)              |
| POST   | `/pipeline/context/format`         | Format a stored run into a prompt-ready document |
| GET    | `/pipeline/runs`                   | Run history (paginated, org-scoped)              |
| GET    | `/pipeline/runs/:requestId`        | One immutable run                                |
| POST   | `/pipeline/runs/:requestId/replay` | Deterministic re-execution of a stored run       |
| GET    | `/pipeline`                        | Pipeline status                                  |
| POST   | `/pipeline/execute`                | Legacy execution surface                         |

### Audit & analytics & configuration

| Method | Path                       | Access        | Description                    |
| ------ | -------------------------- | ------------- | ------------------------------ |
| GET    | `/audit`                   | ADMIN/AUDITOR | Event log (entity-type filter) |
| GET    | `/audit/summary`           | ADMIN/AUDITOR | Totals by action               |
| GET    | `/analytics/summary`       | ADMIN/AUDITOR | Usage summary                  |
| GET    | `/configuration(/:engine)` | ADMIN         | Engine configuration viewer    |

### Permissions

| Method | Path                        | Description                 |
| ------ | --------------------------- | --------------------------- |
| GET    | `/permissions/profiles`     | Permission profiles         |
| GET    | `/permissions/profiles/:id` | One profile                 |
| POST   | `/permissions/profiles`     | Create profile              |
| POST   | `/permissions/assign`       | Assign profile to a user    |
| GET    | `/permissions/me`           | Caller's permission summary |

## 12. Security model

- **Tenant isolation is a query-plan property.** Every row is anchored to an
  `organizationId`; repositories and the `OrganizationGuard` enforce it.
  `GET /organizations/:id` returns only the caller's organization and hides
  others as 404. A `:organizationId` path param that differs from the JWT org
  → `403 ERR_FORBIDDEN`.
- **No spoofing.** Roles, permission levels, clearances and org ids are never
  accepted from the client; the JWT strategy reloads the principal from the DB
  per request, so disabled accounts are rejected immediately.
- **Fail closed.** Permission-engine failures never yield content; a failed
  pipeline stage never yields a partial package.
- **Headers:** Helmet security headers, CORS restricted to configured origins
  (no `*` in production), 256 kb body cap, rate limiting.
- **Logs** carry requestId/correlationId/method/path/status/duration and never
  tokens, passwords, API keys, or sensitive content.

## 13. Example — resolve context with retry

```bash
# 1. Authenticate (demo)
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"organizationId":"<org-id>","email":"<demo-user-email>"}' \
  | jq -r .data.accessToken)

# 2. Resolve — with an Idempotency-Key so retries are safe
curl -s -X POST http://localhost:3001/api/v1/context/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Idempotency-Key: resolve-2026-0001' \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":"<ws-id>","entryNodeId":"<node-id>","maxDepth":3,"tokenBudget":2048,"mode":"DEBUG"}'
```

Response (abridged):

```json
{
  "success": true,
  "data": {
    "packageId": "…",
    "requestId": "…",
    "version": "contextgraph-v1",
    "mode": "DEBUG",
    "candidates": [ { "rank": 1, "compressionHint": "FULL", "inclusionReason": "LOCAL_REACHABILITY", "tokens": 210 } ],
    "exclusions": [ { "nodeId": "…", "finalReasonCode": "EXPIRED_NODE", "failingRuleId": "temporal" } ],
    "summary": { "funnel": { "reachable": 4, "authorized": 4, "ruleCandidates": 3, "included": 3 }, "trace": [ … ] }
  },
  "requestId": "9f1c2e3d-…",
  "timestamp": "…"
}
```

Retrying with the same `Idempotency-Key` returns the identical package without
re-running the pipeline.

## 14. Performance

- API benchmarks: `cd apps/api && npm run bench:api` (requires a running API +
  seeded DB). Reports p50/p95/p99, mean, throughput and error rate for
  `GET /health`, the workspace node list, and `POST /context/resolve`.
- Response DTOs are explicit: no Prisma metadata, raw authorization contexts,
  or rule internals leak into responses.
- Caching is deliberately conservative. Context resolution depends on the
  user, authorization state, graph/rules/pipeline versions and the evaluation
  instant — cache keys must include all of them; do not cache security
  decisions without an invalidation strategy.
