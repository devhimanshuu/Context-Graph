import {
  ComplianceClearance,
  NodeStatus,
  NodeType,
  PermissionLevel,
  Role,
  type AuthenticatedUser,
} from '@contextgraph/types'
import { PermissionEvaluator } from '../../authorization/evaluator/permission-evaluator'
import { PolicyPipeline } from '../../authorization/policies/policy-pipeline'
import { OrganizationPolicy } from '../../authorization/policies/organization.policy'
import { DepartmentPolicy } from '../../authorization/policies/department.policy'
import { RolePolicy } from '../../authorization/policies/role.policy'
import { PermissionLevelPolicy } from '../../authorization/policies/permission-level.policy'
import { CompliancePolicy } from '../../authorization/policies/compliance.policy'
import { VisibilityPolicy } from '../../authorization/policies/visibility.policy'
import {
  DEPT_ENGINEERING,
  makeContext,
  ORG_A,
  USER_ID,
} from '../../authorization/testing/authorization-fixtures'
import { DEFAULT_RULE_ENGINE_CONFIG } from '../configuration/rule-engine.config'
import { InclusionReason } from '../domain/inclusion-reason'
import type { RuleCandidateNode } from '../domain/candidate-node'
import type { RuleExecutionContext } from '../domain/rule-context'
import type { RuleDefinition } from '../domain/rule-definition'
import { RULE_ID } from '../configuration/rule-ids'

export const WORKSPACE_ID = 'ws-1'
export const EVALUATED_AT = '2026-06-15T12:00:00.000Z'

export const READER: AuthenticatedUser = {
  id: USER_ID,
  organizationId: ORG_A,
  departmentId: DEPT_ENGINEERING,
  email: 'reader@acme.test',
  name: 'Reader',
  role: Role.EDITOR,
  permissionLevel: PermissionLevel.WRITE,
  complianceClearance: ComplianceClearance.SENSITIVE,
}

/** A default candidate node: org A, engineering, ACTIVE FACT, no tags, no dates. */
export function makeNode(overrides: Partial<RuleCandidateNode> = {}): RuleCandidateNode {
  return {
    id: 'node-1',
    organizationId: ORG_A,
    workspaceId: WORKSPACE_ID,
    departmentId: DEPT_ENGINEERING,
    title: 'Node 1',
    type: NodeType.FACT,
    status: NodeStatus.ACTIVE,
    importance: 50,
    derivabilityScore: null,
    complianceTags: [],
    validFrom: null,
    validTo: null,
    ownerId: null,
    inclusionReason: InclusionReason.LOCAL_REACHABILITY,
    distance: 0,
    metadata: {},
    ...overrides,
  }
}

/** A default immutable execution context (SENSITIVE EDITOR in org A, engineering). */
export function makeRuleContext(
  overrides: Partial<RuleExecutionContext> = {},
): RuleExecutionContext {
  return {
    requestId: 'req-1',
    user: READER,
    authorization: makeContext(),
    organizationId: ORG_A,
    workspaceId: WORKSPACE_ID,
    entryNodeIds: ['node-1'],
    nodes: [],
    evaluatedAt: EVALUATED_AT,
    config: DEFAULT_RULE_ENGINE_CONFIG,
    executionMetadata: {},
    ...overrides,
  }
}

/** Builds a rule definition with sensible defaults. */
export function makeDefinition(overrides: Partial<RuleDefinition> = {}): RuleDefinition {
  return {
    id: RULE_ID.ISOLATION,
    name: 'Test rule',
    description: 'Test rule definition',
    enabled: true,
    priority: 20,
    configuration: {},
    ...overrides,
  }
}

/** Real in-memory authorization evaluator over the default policy pipeline. */
export function makeEvaluator(): PermissionEvaluator {
  return new PermissionEvaluator(
    new PolicyPipeline(
      new OrganizationPolicy(),
      new DepartmentPolicy(),
      new RolePolicy(),
      new PermissionLevelPolicy(),
      new CompliancePolicy(),
      new VisibilityPolicy(),
    ),
  )
}
