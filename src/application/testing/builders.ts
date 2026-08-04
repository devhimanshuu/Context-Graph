import {
  type CandidateNodeDto,
  type MetricsContextDto,
  type NodeContextDto,
  type PermissionContextDto,
  type TraversalContextDto,
  type UserContextDto,
} from '@/application/dto'
import {
  type ContextRule,
  type GraphEdge,
  type KnowledgeNode,
  type Organization,
  type User,
  type Workspace,
} from '@/domain/models'
import { fixedNow } from './test-utils'

/**
 * Test data builders — create fully-populated domain models and DTOs with
 * deterministic ids and sane defaults, overriding only what the test needs.
 * Kept in the application layer so every future feature's tests share one
 * vocabulary of fixtures.
 *
 * Overrides are shallow (`Partial<T>`): pass whole nested objects (metadata,
 * dates) rather than deep partials, which keeps builders predictable.
 */

let sequence = 0

/** Deterministic, valid-shaped UUID for test rows. */
export function nextId(): string {
  sequence += 1
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
}

export function buildOrganization(overrides: Partial<Organization> = {}): Organization {
  const now = fixedNow()
  return {
    id: nextId(),
    name: 'Meridian Health Systems',
    slug: 'meridian',
    industry: 'HEALTHCARE',
    status: 'ACTIVE',
    configuration: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

export function buildWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  const now = fixedNow()
  return {
    id: nextId(),
    organizationId: 'org-meridian',
    name: 'Inpatient Assessment',
    slug: 'inpatient-assessment',
    description: null,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

export function buildUser(overrides: Partial<User> = {}): User {
  const now = fixedNow()
  return {
    id: nextId(),
    organizationId: 'org-meridian',
    departmentId: null,
    email: 'amelia.chen@meridian.example',
    name: 'Amelia Chen',
    role: 'EDITOR',
    permissionLevel: 'WRITE',
    complianceClearance: 'SENSITIVE',
    status: 'ACTIVE',
    authProviderUserId: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

export function buildKnowledgeNode(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  const now = fixedNow()
  return {
    id: nextId(),
    organizationId: 'org-meridian',
    workspaceId: 'ws-inpatient',
    departmentId: null,
    title: 'Knowledge node',
    content: 'Test content for a knowledge node.',
    type: 'FACT',
    status: 'ACTIVE',
    importance: 50,
    derivabilityScore: 0,
    version: 1,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: null,
    updatedById: null,
    validFrom: null,
    validTo: null,
    ...overrides,
  }
}

export function buildGraphEdge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  const now = fixedNow()
  return {
    id: nextId(),
    organizationId: 'org-meridian',
    workspaceId: 'ws-inpatient',
    sourceId: 'node-a',
    targetId: 'node-b',
    relationshipType: 'SUPPORTS',
    weight: 1,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: null,
    updatedById: null,
    validFrom: null,
    validTo: null,
    ...overrides,
  }
}

export function buildContextRule(overrides: Partial<ContextRule> = {}): ContextRule {
  const now = fixedNow()
  return {
    id: nextId(),
    organizationId: 'org-meridian',
    workspaceId: null,
    name: 'Test rule',
    description: null,
    condition: { operator: 'eq', path: 'type', value: 'CONSTRAINT' },
    action: { emit: 'constraint' },
    priority: 100,
    status: 'ACTIVE',
    isEnabled: true,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    createdById: null,
    updatedById: null,
    validFrom: null,
    validTo: null,
    ...overrides,
  }
}

export function buildUserContext(overrides: Partial<UserContextDto> = {}): UserContextDto {
  return {
    userId: 'user-amelia',
    organizationId: 'org-meridian',
    workspaceId: 'ws-inpatient',
    departmentId: 'dept-cardiology',
    role: 'EDITOR',
    permissionLevel: 'WRITE',
    complianceClearance: 'SENSITIVE',
    ...overrides,
  }
}

export function buildNodeContext(overrides: Partial<NodeContextDto> = {}): NodeContextDto {
  return {
    nodeId: nextId(),
    workspaceId: 'ws-inpatient',
    title: 'Context node',
    type: 'FACT',
    status: 'ACTIVE',
    importance: 50,
    derivabilityScore: 0,
    complianceTags: ['INTERNAL'],
    validFrom: null,
    validTo: null,
    metadata: {},
    ...overrides,
  }
}

export function buildCandidateNode(overrides: Partial<CandidateNodeDto> = {}): CandidateNodeDto {
  return {
    nodeId: nextId(),
    workspaceId: 'ws-inpatient',
    title: 'Candidate node',
    type: 'FACT',
    importance: 50,
    derivabilityScore: 0,
    complianceTags: ['INTERNAL'],
    relevanceScore: 0.8,
    provenance: [],
    metadata: {},
    ...overrides,
  }
}

export function buildPermissionContext(
  overrides: Partial<PermissionContextDto> = {},
): PermissionContextDto {
  return {
    userId: 'user-amelia',
    role: 'EDITOR',
    permissionLevel: 'WRITE',
    complianceClearance: 'SENSITIVE',
    deniedNodeIds: [],
    grantedNodeIds: [],
    effectiveClearances: ['SENSITIVE'],
    ...overrides,
  }
}

export function buildTraversalContext(
  overrides: Partial<TraversalContextDto> = {},
): TraversalContextDto {
  return {
    visitedNodeIds: [],
    edgesTraversed: [],
    depth: 0,
    truncatedNodeIds: [],
    ...overrides,
  }
}

export function buildMetricsContext(overrides: Partial<MetricsContextDto> = {}): MetricsContextDto {
  return {
    startedAt: fixedNow(),
    finishedAt: null,
    durationMs: null,
    nodesVisited: 0,
    nodesFiltered: 0,
    candidatesProduced: 0,
    stagesCompleted: 0,
    stageDurationsMs: {},
    ...overrides,
  }
}
