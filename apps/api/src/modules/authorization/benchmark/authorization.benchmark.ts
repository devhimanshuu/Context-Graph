/**
 * Authorization benchmark.
 *
 * Proves the engine's core performance property: authorization is compiled
 * once and evaluated in memory, so N nodes cost zero database queries — the
 * goal that triggered the compiled-context design.
 *
 * Run: npm run bench:authz (from apps/api)
 */
import {
  ComplianceClearance,
  ComplianceTag,
  OrganizationStatus,
  PermissionAction,
  PermissionLevel,
  Role,
} from '@contextgraph/types'
import { PermissionCompiler } from '../compiler/permission-compiler'
import { PermissionEvaluator } from '../evaluator/permission-evaluator'
import { PolicyPipeline } from '../policies/policy-pipeline'
import { OrganizationPolicy } from '../policies/organization.policy'
import { DepartmentPolicy } from '../policies/department.policy'
import { RolePolicy } from '../policies/role.policy'
import { PermissionLevelPolicy } from '../policies/permission-level.policy'
import { CompliancePolicy } from '../policies/compliance.policy'
import { VisibilityPolicy } from '../policies/visibility.policy'
import { ResourceVisibility, type ResourceAuthorizationContext } from '../domain/resource-context'

interface BenchmarkRow {
  nodes: number
  durationMs: number
  checksPerSecond: number
}

const SIZES = [10, 100, 1_000, 10_000] as const

function makeResource(index: number): ResourceAuthorizationContext {
  return {
    id: `node-${index}`,
    resourceType: 'knowledge-node',
    organizationId: 'org-a',
    workspaceId: 'ws-1',
    departmentId: 'dept-engineering',
    ownerId: null,
    requiredPermissionLevel: null,
    complianceTags: [ComplianceTag.INTERNAL],
    visibility: ResourceVisibility.INTERNAL,
    status: 'ACTIVE',
    attributes: {},
  }
}

function buildContext() {
  const compiler = new PermissionCompiler()
  const pipeline = new PolicyPipeline(
    new OrganizationPolicy(),
    new DepartmentPolicy(),
    new RolePolicy(),
    new PermissionLevelPolicy(),
    new CompliancePolicy(),
    new VisibilityPolicy(),
  )
  const evaluator = new PermissionEvaluator(pipeline)
  const context = compiler.compile({
    user: {
      id: 'user-1',
      organizationId: 'org-a',
      departmentId: 'dept-engineering',
      role: Role.EDITOR,
      permissionLevel: PermissionLevel.WRITE,
      complianceClearance: ComplianceClearance.SENSITIVE,
      status: 'ACTIVE',
      metadata: {},
      updatedAt: new Date().toISOString(),
    },
    organizationStatus: OrganizationStatus.ACTIVE,
    departmentSubtree: ['dept-backend', 'dept-frontend'],
  })
  return { evaluator, context }
}

function run(): BenchmarkRow[] {
  const { evaluator, context } = buildContext()
  const rows: BenchmarkRow[] = []
  for (const size of SIZES) {
    const resources = Array.from({ length: size }, (_, i) => makeResource(i))
    const startedAt = performance.now()
    let allowed = 0
    for (const resource of resources) {
      if (evaluator.evaluate(context, resource, PermissionAction.READ).allowed) allowed += 1
    }
    const durationMs = performance.now() - startedAt
    const row = {
      nodes: size,
      durationMs: Number(durationMs.toFixed(2)),
      checksPerSecond: Math.round((size / durationMs) * 1000),
    }
    rows.push(row)
    process.stdout.write(
      `nodes=${size} allowed=${allowed} duration=${durationMs.toFixed(2)}ms (${row.checksPerSecond.toLocaleString()} checks/s)\n`,
    )
  }
  return rows
}

run()
