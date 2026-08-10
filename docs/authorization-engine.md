# Authorization Engine — Phase 5

The ContextGraph **Permission and Authorization Engine**. It answers one question
deterministically and fast: _"Is this user authorized to access this resource?"_
It never answers _"is this resource relevant?"_ — relevance belongs to the Rule
Engine and the pipeline.

The engine is:

- **Organization-aware** — multi-tenant isolation is a hard security boundary.
- **Independent** — no dependency on the Graph Engine, Rule Engine, AI, or UI.
- **Deterministic** — fixed policy order, fail-closed on every denial.
- **O(1) per node** — authorization state is compiled once, then evaluated in
  memory; thousands of nodes cost zero database queries.

```
┌──────────────────────────────────────────────────────────────────┐
│                       AuthorizationModule                        │
│                                                                  │
│  Guard/Decorator layer    @Roles @RequirePermissions             │
│                           @RequireClearance @RequirePermissionLevel│
│                                  │ delegates (no inline logic)   │
│                                  ▼                               │
│  Application services     IAuthorizationService (facade)         │
│                                  │                               │
│  Domain services          PermissionCompiler  PermissionEvaluator│
│                                  │           ▲                   │
│  Policies                  Organization → Department → Role →    │
│                            PermissionLevel → Compliance →        │
│                            Visibility (PolicyPipeline)           │
│                                  │                               │
│  Infrastructure            IAuthorizationDataRepository          │
│                            IAuthorizationCache  IAuditLogger     │
│                            IAuthorizationMetrics                 │
└──────────────────────────────────────────────────────────────────┘
```

## 1. Authorization Architecture

Layers (Clean Architecture, dependency inversion throughout):

| Layer                       | Responsibility                                       | Depends on                                                     |
| --------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| Guards & decorators         | Read route metadata, **delegate only**               | `IAuthorizationService`                                        |
| Application service         | Orchestrates load → compile → evaluate, cache, audit | Interfaces only                                                |
| Domain (compiler/evaluator) | Pure, synchronous decision logic                     | Nothing external                                               |
| Policies                    | One concern each, composable                         | `CompiledAuthorizationContext`, `ResourceAuthorizationContext` |
| Infrastructure              | Prisma reads, cache, audit writes                    | Prisma, common module                                          |

Everything in the engine depends on interface tokens (`IAuthorizationService`,
`IAuthorizationEvaluator`, `IAuthorizationCompiler`, `IAuthorizationDataRepository`,
`IAuthorizationCache`, `IAuthorizationMetrics`, `IAuthorizationAuditLogger`). The
module binds the current implementations; Redis caching, Prometheus export, or an
event-driven invalidation bus replace a single binding, never business code.

## 2. RBAC Model

Six roles, defined once in `RolePolicy.ROLE_CAPABILITIES` — **no controller or
guard compares role strings**:

| Role    | Read | Write | Delete | Manage |
| ------- | ---- | ----- | ------ | ------ |
| ADMIN   | ✓    | ✓     | ✓      | ✓      |
| HOD     | ✓    | ✓     | ✓      | —      |
| EDITOR  | ✓    | ✓     | —      | —      |
| QUALITY | ✓    | ✓     | —      | —      |
| VIEWER  | ✓    | —     | —      | —      |
| AUDITOR | ✓    | —     | —      | —      |

Route-level restrictions use `@Roles(...)`; node-level capability checks run the
role policy inside the pipeline. Roles are **never trusted from the client**: the
JWT carries only `sub` + `org`, and the compiler reloads the user row from the
database on every compile.

## 3. Permission Levels

A strict lattice: `NONE < READ < WRITE < ADMIN`. A principal with a higher level
may exercise every capability of lower levels — **subject to all other
policies**. Ranking lives in `domain/permission-level.ts`:

- Actions map to minimum levels: `READ → READ`, `WRITE → WRITE`,
  `DELETE/MANAGE → ADMIN`.
- A resource may demand a stricter level (`requiredPermissionLevel`); the
  stricter of the two wins.
- The permission-level gate never bypasses role, compliance, or visibility gates
  (a VIEWER with ADMIN level still cannot write).

## 4. Organization Isolation

`OrganizationPolicy` is the **first** gate:

1. `resource.organizationId !== context.organizationId` → DENY.
2. Tenant `SUSPENDED`/`ARCHIVED` → DENY (fail closed).
3. Tenant row missing → compiled as `SUSPENDED` (fail closed).

Cross-tenant access is impossible unless an explicit cross-tenant policy is
inserted before this one — a deliberate future extension point. Authorization is
always enforced server-side; frontend filtering is never a control.

## 5. Department Authorization

A user's accessible set is compiled once:

```
own department ∪ descendants ∪ explicit grants (metadata.authorizedDepartmentIds)
```

`DepartmentPolicy` is an **O(1) set membership test** per resource. Organization-wide
resources (null department) carry no department restriction. The department
subtree is loaded in one query (org chart is small), then descended iteratively —
no N+1, no recursion.

## 6. Compliance Clearance

Two deterministic layers:

1. **Clearance class** — lattice `NONE < STANDARD < SENSITIVE < RESTRICTED < CRITICAL`.
2. **Compliance tags** — each tag maps to a minimum class
   (`COMPLIANCE_TAG_MINIMUM_CLASS`, e.g. `PUBLIC → NONE`,
   `PHI/CONFIDENTIAL → SENSITIVE`, `RESTRICTED → RESTRICTED`).

A principal's **effective tag set** = tags implied by class ∪ explicit grants
(`metadata.complianceGrants`). `CompliancePolicy` requires **every** required tag
to be present — a node tagged `PHI + CONFIDENTIAL` is denied to a principal with
only `PHI`:

```
Node:   PHI + CONFIDENTIAL
User:   effective tags = { PHI }   (no CONFIDENTIAL)
Result: DENY — COMPLIANCE
```

Unknown grant values are dropped, never trusted (fail-safe parsing).

## 7. Policy Evaluation

Each policy implements `AuthorizationPolicy.evaluate(context, resource, action)`
and returns `ALLOW | DENY | NOT_APPLICABLE` with a reason. The pipeline composes
them in a fixed, documented order:

```
Organization → Department → Role → Permission Level → Compliance → Visibility
```

**Why this order:** the tenant boundary is the cheapest and most critical check,
so it runs first; department scope narrows the resource surface before any
capability check; role gating precedes level gating so read-only roles are
rejected before level arithmetic; compliance and visibility are deliberate
last-mile gates that no capability may bypass. Evaluation short-circuits on the
first DENY (fail-closed); every evaluated policy is recorded.

## 8. Permission Compilation

```
User (id only)
   ↓
IAuthorizationDataRepository.loadUser        ← trusted DB row
   ↓
loadOrganizationStatus + loadDepartmentSubtree  ← bounded queries (≤3 total)
   ↓
PermissionCompiler.compile
   ↓
CompiledAuthorizationContext (immutable, Sets/Maps, frozen attributes)
```

The compiled context is the _only_ authorization surface the evaluator sees. It
carries a `sourceVersion` (the user row's `updatedAt`) so staleness is detectable.

## 9. O(1) Lookup Strategy

| Check            | Data structure                | Cost    |
| ---------------- | ----------------------------- | ------- |
| Organization     | scalar compare                | O(1)    |
| Department       | `Set` membership              | O(1)    |
| Role             | constant table                | O(1)    |
| Permission level | rank compare                  | O(1)    |
| Compliance       | tag subset over resource tags | O(tags) |
| Visibility       | scalar compare                | O(1)    |

One compile (≤3 queries), then **N in-memory evaluations**. The benchmark proves
it — `npm run bench:authz`:

```
nodes=10,000   duration=8.4ms   ~1.2M checks/s   (0 DB queries)
```

## 10. Cache Strategy

`IAuthorizationCache` (in-memory today; Redis-ready):

- `get / set` with TTL (default 60 s) — staleness is bounded even without events.
- `invalidate(userId)` — explicit eviction on role/level/clearance changes.
- `invalidateOrganization(orgId)` — tenant-wide eviction, ready for an event bus.

Cache keys are principal ids; the compiled context embeds `sourceVersion` so a
future cache can cheaply validate against the row version.

## 11. Authorization Decision Model

Never a bare boolean:

```jsonc
{
  "allowed": false,
  "reason": "Missing required compliance clearance",
  "failedPolicy": "COMPLIANCE",
  "evaluatedPolicies": ["ORGANIZATION", "DEPARTMENT", "ROLE", "PERMISSION_LEVEL", "COMPLIANCE"],
  "verdicts": [ { "policy": "ORGANIZATION", "outcome": "ALLOW" }, ... ]
}
```

Decisions feed audit trails, admin dashboards, pipeline explanations, and
security investigations.

## 12. Security Boundaries

- **Never trust the client**: roles, levels, clearances, and organization ids are
  re-derived from the database per compile. The JWT carries only identity.
- **Centralized decisions**: guards and controllers contain zero authorization
  business logic — they delegate to the engine.
- **Fail closed**: missing rows, unknown grants, and missing tenants all deny.
- **Audited**: every interactive denial is recorded via `IAuthorizationAuditLogger`
  (never resource content, tokens, or secrets).
- **No per-node queries**: batch pipeline evaluation uses the evaluator directly
  (module export) to avoid per-node audit writes.

## 13. Threat Model

| Threat                      | Control                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Cross-tenant access (IDOR)  | `OrganizationPolicy` first gate; org-scoped queries; `OrganizationGuard` on `:organizationId` routes |
| Role spoofing               | Roles re-loaded from DB at compile; JWT has no role claim                                            |
| Permission-level escalation | Levels re-loaded from DB; lattice dominance                                                          |
| Clearance bypass            | Per-tag subset check; class lattice                                                                  |
| Department crossing         | Compiled accessible set; O(1) membership                                                             |
| Stale authorization         | TTL cache + explicit invalidation + sourceVersion                                                    |
| Missing/invalid context     | `AuthorizationContextMissingException` / fail-closed tenant                                          |
| Audit poisoning             | Denial logging only; no content, no secrets                                                          |

## 14. Performance Considerations

- ≤3 database queries per principal per TTL window, then zero per node.
- Immutable compiled context shared across the whole evaluation batch.
- Synchronous evaluator — no I/O in the hot path.
- `npm run bench:authz` measures duration and (implicitly) query count; the
  service spec asserts `loadUser` is called once for 100 evaluations.

## 15. Future ABAC / PBAC Extension

- New policies implement `AuthorizationPolicy` and register in `PolicyPipeline` —
  consumers never change.
- `ResourceAuthorizationContext.attributes` and `AuthorizationContext.attributes`
  already carry arbitrary typed attributes for attribute-based rules.
- Cross-tenant policies slot in **before** `OrganizationPolicy`.
- Profile-derived grants (`PermissionProfile.rules`) can fold into compilation as
  a fourth grant source behind `IAuthorizationDataRepository`.
- Event-driven invalidation plugs into `IAuthorizationCache.invalidate*`.

## API surface

```
GET  /api/v1/authorization/me       → compiled context (redacted)
POST /api/v1/authorization/evaluate → AuthorizationDecision (debug/audit aid)
```

## Consumer integration — Knowledge module

The Knowledge module is the first permission-aware consumer: its read paths map
nodes into `ResourceAuthorizationContext` (`knowledgeEntityToResourceContext`,
visibility from node metadata) and filter through the evaluator server-side.

- `GET /workspaces/:workspaceId/nodes` returns **only** nodes the principal may
  read — one context compile (cached), zero per-node queries. Every withheld
  node is recorded to the audit log (actor, node id, failing policy).
- `GET /nodes/:id` returns 404 for unauthorized nodes (no existence leak), and
  the denied attempt is recorded to the audit log before the 404 is returned.

**Writes** are gated the same way: `create`/`update` evaluate the **resulting
node state** (input merged over current values) with the `WRITE` action before
persisting — moving a node into an inaccessible department or adding a
compliance tag without clearance is rejected with **403 + the failing policy**
(`PermissionDeniedException.details.failedPolicy`). Delete keeps its route-level
`@Roles(ADMIN, QUALITY)` gate.

**Graph reachability** is composed the same way: `POST
/workspaces/:workspaceId/reachability` runs BFS, then filters the visited node
set through `IAuthorizationEvaluator` with one compiled context reused across
the batch (the node projection now carries department, owner, compliance tags
and visibility metadata, so filtering costs no extra queries). An entry node
the caller may not read returns 404 — the neighborhood is never leaked.
`filteredNodeCount` reports how many visited nodes were withheld.

The batch pipeline will consume `IAuthorizationEvaluator` the same way in a
later phase.

The pipeline module consumes `IAuthorizationEvaluator` directly for batch
filtering; interactive endpoints use `IAuthorizationService.evaluateResource`.
