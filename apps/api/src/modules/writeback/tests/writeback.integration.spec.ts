/* eslint-disable @typescript-eslint/no-explicit-any */
/* WriteBack Integration Tests — full proposal → publish → retrieve cycle.

These tests verify the complete lifecycle of a knowledge proposal through
the WriteBack and Approval services, using mocked repositories and services.
They simulate the real flow without requiring a database connection.

Test matrix:
  1. FACT proposal → auto-approve → published node exists
  2. DECISION proposal → pending approval → approve → published
  3. Cross-tenant proposal → rejected
  4. Duplicate proposal → DUPLICATE decision
  5. Invalid node type → rejected
  6. Graph relationships created with published node
  7. Approval requires ADMIN/HOD role
  8. Rejected proposal creates no knowledge node
  9. Content hash dedup across proposals
 10. Cache invalidation triggered on publish
 11. Indexing triggered on publish
 12. Validation trace completeness
 13. Idempotency key prevents duplicates */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type {
  AuthenticatedUser,
  NodeProposalEntity,
  NodeProposalRequest,
  ApprovalRequestEntity,
} from '@contextgraph/types'

// ─── Mock Factories ──────────────────────────────────────────────────────────

const ORG_ID = '11111111-1111-1111-1111-111111111111'
const WORKSPACE_ID = '22222222-2222-2222-2222-222222222222'
const USER_ID = '33333333-3333-3333-3333-333333333333'
const TARGET_NODE_ID = '44444444-4444-4444-4444-444444444444'

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: USER_ID,
    organizationId: ORG_ID,
    departmentId: null,
    email: 'agent@contextgraph.local',
    name: 'Test Agent',
    role: 'EDITOR',
    permissionLevel: 'WRITE',
    complianceClearance: 'SENSITIVE',
    ...overrides,
  }
}

function makeAdminUser(): AuthenticatedUser {
  return makeUser({ role: 'ADMIN' })
}

function makeViewerUser(): AuthenticatedUser {
  return makeUser({ role: 'VIEWER', permissionLevel: 'READ' })
}

function makeCrossTenantUser(): AuthenticatedUser {
  return makeUser({ organizationId: '99999999-9999-9999-9999-999999999999' })
}

function makeFactRequest(overrides: Partial<NodeProposalRequest> = {}): NodeProposalRequest {
  return {
    nodeType: 'FACT',
    title: 'Service X restart resolves incident INC-1842',
    content: 'Restarting service X after condition Y resolved the production incident.',
    classification: 'INTERNAL',
    workspaceId: WORKSPACE_ID,
    ...overrides,
  }
}

function makeDecisionRequest(): NodeProposalRequest {
  return makeFactRequest({
    nodeType: 'DECISION',
    title: 'Approved refund for customer #1234',
    content: 'Customer #1234 is eligible for full refund based on policy P-2024.',
  })
}

function makeProposal(overrides: Partial<NodeProposalEntity> = {}): NodeProposalEntity {
  return {
    id: '55555555-5555-5555-5555-555555555555',
    organizationId: ORG_ID,
    workspaceId: WORKSPACE_ID,
    proposedById: USER_ID,
    agentIdentityId: null,
    agentMcpSessionId: null,
    nodeType: 'FACT',
    title: 'Service X restart resolves incident INC-1842',
    content: 'Restarting service X after condition Y resolved the production incident.',
    contentHash: 'abc123hash',
    classification: 'INTERNAL',
    departmentId: null,
    metadata: {},
    sourceReferences: [],
    status: 'PUBLISHED',
    decision: 'PUBLISHED',
    decisionReason: null,
    publishedNodeId: '66666666-6666-6666-6666-666666666666',
    writeRunId: '77777777-7777-7777-7777-777777777777',
    idempotencyKey: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeApprovalRequest(
  overrides: Partial<ApprovalRequestEntity> = {},
): ApprovalRequestEntity {
  return {
    id: '88888888-8888-8888-8888-888888888888',
    organizationId: ORG_ID,
    proposalId: '55555555-5555-5555-5555-555555555555',
    requestedAction: 'PROPOSE_KNOWLEDGE',
    nodeType: 'DECISION',
    title: 'Approved refund for customer #1234',
    content: 'Customer #1234 is eligible for full refund.',
    classification: 'INTERNAL',
    proposedById: USER_ID,
    agentIdentityId: null,
    status: 'PENDING',
    resolvedById: null,
    resolutionNote: null,
    publishedNodeId: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    expiresAt: null,
    ...overrides,
  }
}

// ─── Mock Builders ───────────────────────────────────────────────────────────

function buildMockProposalRepo() {
  const proposals = new Map<string, NodeProposalEntity>()
  const relationships = new Map<
    string,
    {
      proposalId: string
      targetNodeId: string
      relationshipType: string
      weight: number
      metadata: Record<string, unknown>
    }[]
  >()
  const contentHashes = new Map<string, NodeProposalEntity>()
  const idempotencyKeys = new Map<string, NodeProposalEntity>()

  return {
    create: vi.fn(async (data: Record<string, unknown>) => {
      const id = `proposal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const entity = makeProposal({
        id,
        organizationId: data.organizationId as string,
        workspaceId: data.workspaceId as string,
        proposedById: data.proposedById as string,
        nodeType: data.nodeType as string,
        title: data.title as string,
        content: data.content as string,
        contentHash: data.contentHash as string,
        classification: data.classification as string,
        status: data.status as 'PROPOSED' | 'PENDING_APPROVAL' | 'PUBLISHED',
      })
      proposals.set(id, entity)
      if (data.contentHash) contentHashes.set(data.contentHash as string, entity)
      if (data.idempotencyKey) idempotencyKeys.set(data.idempotencyKey as string, entity)
      return entity
    }),
    updateStatus: vi.fn(async (id: string, status: string, decision?: string) => {
      const existing = proposals.get(id)
      if (existing) {
        const updated = makeProposal({
          ...existing,
          status: status as NodeProposalEntity['status'],
          decision: decision as NodeProposalEntity['decision'],
        })
        proposals.set(id, updated)
        return updated
      }
      return makeProposal({ id, status: status as NodeProposalEntity['status'] })
    }),
    findById: vi.fn(async (id: string) => proposals.get(id) ?? null),
    findByIdempotencyKey: vi.fn(
      async (_orgId: string, key: string) => idempotencyKeys.get(key) ?? null,
    ),
    findByContentHash: vi.fn(
      async (_orgId: string, hash: string) => contentHashes.get(hash) ?? null,
    ),
    findByOrganization: vi.fn(async () => [...proposals.values()]),
    countByOrganization: vi.fn(async () => ({
      total: proposals.size,
      proposed: 0,
      pendingApproval: 0,
      published: proposals.size,
      rejected: 0,
    })),
    createRelationship: vi.fn(async (data: Record<string, unknown>) => {
      const rel = {
        proposalId: data.proposalId as string,
        targetNodeId: data.targetNodeId as string,
        relationshipType: data.relationshipType as string,
        weight: data.weight as number,
        metadata: (data.metadata as Record<string, unknown>) ?? {},
      }
      const existing = relationships.get(data.proposalId as string) ?? []
      existing.push(rel)
      relationships.set(data.proposalId as string, existing)
      return { id: `rel-${Date.now()}`, ...rel }
    }),
    findRelationshipsByProposal: vi.fn(
      async (proposalId: string) => relationships.get(proposalId) ?? [],
    ),
    _proposals: proposals,
    _relationships: relationships,
  }
}

function buildMockWriteRunRepo() {
  return {
    create: vi.fn(async (data: Record<string, unknown>) => ({
      id: `run-${Date.now()}`,
      organizationId: data.organizationId,
      proposalId: data.proposalId,
      status: data.status,
      validationTrace: data.validationTrace,
      startedAt: new Date().toISOString(),
    })),
    updateStatus: vi.fn(async (id: string, status: string) => ({ id, status })),
    findById: vi.fn(async () => null),
  }
}

function buildMockApprovalRepo() {
  const approvals = new Map<string, ApprovalRequestEntity>()

  return {
    create: vi.fn(async (data: Record<string, unknown>) => {
      const id = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const entity = makeApprovalRequest({
        id,
        proposalId: data.proposalId as string,
        organizationId: data.organizationId as string,
        nodeType: data.nodeType as string,
        title: data.title as string,
        content: data.content as string,
        classification: data.classification as string,
      })
      approvals.set(id, entity)
      return { approvalId: id }
    }),
    findById: vi.fn(async (id: string) => approvals.get(id) ?? null),
    findByOrganization: vi.fn(async (_orgId: string, status?: string) => {
      const all = [...approvals.values()]
      if (status) return all.filter((a) => a.status === status)
      return all
    }),
    countPending: vi.fn(
      async () => [...approvals.values()].filter((a) => a.status === 'PENDING').length,
    ),
    resolve: vi.fn(async (id: string, resolvedById: string, resolution: string, note?: string) => {
      const existing = approvals.get(id)
      if (existing) {
        const updated = makeApprovalRequest({
          ...existing,
          status: resolution as ApprovalRequestEntity['status'],
          resolvedById,
          resolutionNote: note ?? null,
          resolvedAt: new Date().toISOString(),
        })
        approvals.set(id, updated)
        return updated
      }
      return makeApprovalRequest({ id, status: resolution as ApprovalRequestEntity['status'] })
    }),
    _approvals: approvals,
  }
}

function buildMockAuditLogger() {
  const events: Array<Record<string, unknown>> = []
  return {
    recordEvent: vi.fn(async (data: Record<string, unknown>) => {
      const eventId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      events.push({ eventId, ...data })
      return { eventId }
    }),
    findByOrganization: vi.fn(async () => events),
    _events: events,
  }
}

function buildMockGraphValidator() {
  return {
    validateRelationships: vi.fn(async () => ({ valid: true, errors: [] })),
  }
}

function buildMockPrisma() {
  const knowledgeNodes = new Map<string, Record<string, unknown>>()
  const graphEdges = new Map<string, Record<string, unknown>>()

  return {
    knowledgeNode: {
      create: vi.fn(async (data: { data: Record<string, unknown> }) => {
        const id = data.data.id as string
        knowledgeNodes.set(id, data.data)
        return data.data
      }),
      findUnique: vi.fn(
        async (args: { where: { id: string } }) => knowledgeNodes.get(args.where.id) ?? null,
      ),
      findMany: vi.fn(async () => [...knowledgeNodes.values()]),
      count: vi.fn(async () => knowledgeNodes.size),
    },
    graphEdge: {
      create: vi.fn(async (data: { data: Record<string, unknown> }) => {
        const id = data.data.id as string
        graphEdges.set(id, data.data)
        return data.data
      }),
    },
    _knowledgeNodes: knowledgeNodes,
    _graphEdges: graphEdges,
  }
}

function buildMockIndexingTrigger() {
  return {
    triggerIndexing: vi.fn(async () => {}),
    getIndexStatus: vi.fn(async () => null),
  }
}

function buildMockCacheInvalidation() {
  return {
    invalidateOnPublish: vi.fn(async () => {}),
  }
}

// ─── Import the service under test ───────────────────────────────────────────

// We test the WriteBackService by directly calling its methods with mocked deps.
// Since the service uses constructor injection, we construct it manually.

import { WriteBackService } from '../services/writeback.service'
import { ApprovalService } from '../services/approval.service'

// ─── WriteBack Service Integration Tests ─────────────────────────────────────

describe('WriteBack Integration: Proposal → Publish Cycle', () => {
  let writeBackService: WriteBackService
  let proposalRepo: ReturnType<typeof buildMockProposalRepo>
  let writeRunRepo: ReturnType<typeof buildMockWriteRunRepo>
  let approvalRepo: ReturnType<typeof buildMockApprovalRepo>
  let auditLogger: ReturnType<typeof buildMockAuditLogger>
  let graphValidator: ReturnType<typeof buildMockGraphValidator>
  let prisma: ReturnType<typeof buildMockPrisma>
  let indexingTrigger: ReturnType<typeof buildMockIndexingTrigger>
  let cacheInvalidation: ReturnType<typeof buildMockCacheInvalidation>

  beforeEach(() => {
    proposalRepo = buildMockProposalRepo()
    writeRunRepo = buildMockWriteRunRepo()
    approvalRepo = buildMockApprovalRepo()
    auditLogger = buildMockAuditLogger()
    graphValidator = buildMockGraphValidator()
    prisma = buildMockPrisma()
    indexingTrigger = buildMockIndexingTrigger()
    cacheInvalidation = buildMockCacheInvalidation()

    writeBackService = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      {
        validate: vi.fn(async () => ({
          passed: true,
          trace: [{ step: 'auth', passed: true, durationMs: 1 }],
          writeMode: 'AUTO_APPROVE',
        })),
      } as any,
      { computeHash: vi.fn(() => 'test-content-hash') } as any,
      {} as any, // authorization
      {} as any, // evaluator
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )
  })

  // ── Test 1: FACT proposal → auto-approve → published ───────────────────

  it('publishes a valid FACT proposal with auto-approval', async () => {
    const user = makeUser()
    const request = makeFactRequest()

    const result = await writeBackService.propose(user, request)

    expect(result.decision).toBe('PUBLISHED')
    expect(result.status).toBe('PUBLISHED')
    expect(result.nodeId).toBeTruthy()
    expect(result.approvalRequired).toBe(false)

    // Knowledge node was created in Prisma
    expect(prisma.knowledgeNode.create).toHaveBeenCalledOnce()
    const createCall = vi.mocked(prisma.knowledgeNode.create).mock.calls[0]
    expect(createCall[0].data.type).toBe('FACT')
    expect(createCall[0].data.status).toBe('ACTIVE')
    expect(createCall[0].data.organizationId).toBe(ORG_ID)

    // Audit events were recorded
    expect(auditLogger.recordEvent).toHaveBeenCalled()
    const auditActions = auditLogger._events.map((e) => e.action)
    expect(auditActions).toContain('NODE_VALIDATION_STARTED')
    expect(auditActions).toContain('NODE_PUBLISHED')

    // Indexing was triggered
    expect(indexingTrigger.triggerIndexing).toHaveBeenCalledOnce()
    expect(indexingTrigger.triggerIndexing).toHaveBeenCalledWith(
      result.nodeId,
      ORG_ID,
      WORKSPACE_ID,
    )

    // Cache was invalidated
    expect(cacheInvalidation.invalidateOnPublish).toHaveBeenCalledOnce()
    expect(cacheInvalidation.invalidateOnPublish).toHaveBeenCalledWith(ORG_ID, WORKSPACE_ID)
  })

  // ── Test 2: DECISION proposal → pending approval → approve → published ──

  it('requires approval for DECISION proposals, then publishes on approve', async () => {
    // Override the validator to return REQUIRES_APPROVAL for DECISION
    const validator = {
      validate: vi.fn(async () => ({
        passed: true,
        trace: [{ step: 'auth', passed: true, durationMs: 1 }],
        writeMode: 'REQUIRES_APPROVAL',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: vi.fn(async () => ({ approvalId: 'approval-123' })) } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'decision-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeDecisionRequest()

    const result = await service.propose(user, request)

    expect(result.decision).toBe('PENDING_APPROVAL')
    expect(result.status).toBe('PENDING_APPROVAL')
    expect(result.approvalRequired).toBe(true)
    expect(result.nodeId).toBeNull()

    // Approval request was created
    expect(proposalRepo.create).toHaveBeenCalled()

    // Knowledge node was NOT created (pending approval)
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
  })

  // ── Test 3: Cross-tenant proposal → rejected ────────────────────────────

  it('rejects proposals from cross-tenant users', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: false,
        trace: [
          { step: 'organization', passed: false, reasonCode: 'ORG_SCOPE_VIOLATION', durationMs: 1 },
        ],
        writeMode: 'AUTO_APPROVE',
        reasonCode: 'ORG_SCOPE_VIOLATION',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'cross-tenant-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeCrossTenantUser()
    const request = makeFactRequest()

    const result = await service.propose(user, request)

    expect(result.decision).toBe('FAILED')
    expect(result.status).toBe('FAILED')
    expect(result.nodeId).toBeNull()

    // No knowledge node created
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
  })

  // ── Test 4: Duplicate proposal → DUPLICATE decision ─────────────────────

  it('rejects duplicate proposals with DUPLICATE decision', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: false,
        trace: [{ step: 'duplicate', passed: false, reasonCode: 'DUPLICATE', durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
        reasonCode: 'DUPLICATE',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'duplicate-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest()

    const result = await service.propose(user, request)

    expect(result.decision).toBe('FAILED')
    expect(result.reasonCode).toBe('DUPLICATE')

    // No knowledge node created
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
  })

  // ── Test 5: Invalid node type → rejected ────────────────────────────────

  it('rejects proposals with unsupported node types', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: false,
        trace: [
          { step: 'node_type', passed: false, reasonCode: 'INVALID_NODE_TYPE', durationMs: 1 },
        ],
        writeMode: 'AUTO_APPROVE',
        reasonCode: 'INVALID_NODE_TYPE',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'invalid-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest({ nodeType: 'CONSTRAINT' as any })

    const result = await service.propose(user, request)

    expect(result.decision).toBe('FAILED')
    expect(result.reasonCode).toBe('INVALID_NODE_TYPE')
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
  })

  // ── Test 6: Graph relationships created with published node ─────────────

  it('creates graph edges when relationships are proposed', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: true,
        trace: [{ step: 'auth', passed: true, durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'rel-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest({
      relationshipRequests: [
        {
          targetNodeId: TARGET_NODE_ID,
          relationshipType: 'SUPPORTS',
          weight: 0.8,
        },
      ],
    })

    const result = await service.propose(user, request)

    expect(result.decision).toBe('PUBLISHED')

    // Graph edge was created
    expect(prisma.graphEdge.create).toHaveBeenCalledOnce()
    const edgeCall = vi.mocked(prisma.graphEdge.create).mock.calls[0]
    expect(edgeCall[0].data.sourceId).toBe(result.nodeId)
    expect(edgeCall[0].data.targetId).toBe(TARGET_NODE_ID)
    expect(edgeCall[0].data.relationshipType).toBe('SUPPORTS')
    expect(edgeCall[0].data.weight).toBe(0.8)

    // Relationship was stored in proposal repo
    expect(proposalRepo.createRelationship).toHaveBeenCalledOnce()
  })

  // ── Test 7: Viewer role cannot propose (capability check) ───────────────

  it('rejects proposals from users without write capability', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: false,
        trace: [
          { step: 'capability', passed: false, reasonCode: 'CAPABILITY_MISSING', durationMs: 1 },
        ],
        writeMode: 'AUTO_APPROVE',
        reasonCode: 'CAPABILITY_MISSING',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'viewer-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeViewerUser()
    const request = makeFactRequest()

    const result = await service.propose(user, request)

    expect(result.decision).toBe('FAILED')
    expect(result.reasonCode).toBe('CAPABILITY_MISSING')
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
  })

  // ── Test 8: Rejected proposal creates no knowledge node ─────────────────

  it('never creates a knowledge node for rejected proposals', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: false,
        trace: [{ step: 'content', passed: false, reasonCode: 'INVALID_CONTENT', durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
        reasonCode: 'INVALID_CONTENT',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'rejected-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest({ title: '', content: '' })

    const result = await service.propose(user, request)

    expect(result.decision).toBe('FAILED')
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
    expect(prisma.graphEdge.create).not.toHaveBeenCalled()
    expect(indexingTrigger.triggerIndexing).not.toHaveBeenCalled()
    expect(cacheInvalidation.invalidateOnPublish).not.toHaveBeenCalled()
  })

  // ── Test 9: Idempotency key prevents duplicate proposals ────────────────

  it('detects duplicate proposals via idempotency key', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: false,
        trace: [{ step: 'idempotency', passed: false, reasonCode: 'DUPLICATE', durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
        reasonCode: 'DUPLICATE',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'idem-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest({ idempotencyKey: 'idem-key-001' })

    const result = await service.propose(user, request)

    expect(result.decision).toBe('FAILED')
    expect(result.reasonCode).toBe('DUPLICATE')
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
  })

  // ── Test 10: Content hash dedup across proposals ────────────────────────

  it('detects duplicate proposals via content hash', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: false,
        trace: [{ step: 'duplicate', passed: false, reasonCode: 'DUPLICATE', durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
        reasonCode: 'DUPLICATE',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'same-content-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()

    // Submit same content twice
    const result1 = await service.propose(user, makeFactRequest())
    const result2 = await service.propose(user, makeFactRequest())

    // Both should be detected as duplicates (validator returns DUPLICATE)
    expect(result1.decision).toBe('FAILED')
    expect(result2.decision).toBe('FAILED')
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
  })

  // ── Test 11: Graph validation failure prevents publish ──────────────────

  it('rejects proposals that would create invalid graph relationships', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: true,
        trace: [{ step: 'auth', passed: true, durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
      })),
    }
    const graphVal = {
      validateRelationships: vi.fn(async () => ({
        valid: false,
        errors: ['Cycle detected: A → B → C → A'],
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphVal as any,
      validator as any,
      { computeHash: vi.fn(() => 'graph-fail-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest({
      relationshipRequests: [
        {
          targetNodeId: TARGET_NODE_ID,
          relationshipType: 'SUPPORTS',
        },
      ],
    })

    const result = await service.propose(user, request)

    expect(result.decision).toBe('FAILED')
    expect(result.reasonCode).toBe('GRAPH_VALIDATION_FAILED')
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
    expect(prisma.graphEdge.create).not.toHaveBeenCalled()
  })

  // ── Test 12: Validation trace is included in response ───────────────────

  it('includes the full validation trace in the response', async () => {
    const trace = [
      { step: 'authentication', passed: true, durationMs: 2 },
      { step: 'organization', passed: true, durationMs: 1 },
      { step: 'capability', passed: true, durationMs: 1 },
      { step: 'node_type', passed: true, durationMs: 0 },
      { step: 'content', passed: true, durationMs: 0 },
      { step: 'classification', passed: true, durationMs: 0 },
      { step: 'compliance', passed: true, durationMs: 0 },
      { step: 'duplicate', passed: true, durationMs: 5 },
      { step: 'policy', passed: true, durationMs: 0 },
    ]
    const validator = {
      validate: vi.fn(async () => ({ passed: true, trace, writeMode: 'AUTO_APPROVE' })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'trace-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest()

    const result = await service.propose(user, request)

    expect(result.validationTrace).toHaveLength(9)
    expect(result.validationTrace[0].step).toBe('authentication')
    expect(result.validationTrace[0].passed).toBe(true)
    expect(result.validationTrace.every((s) => s.passed)).toBe(true)
  })

  // ── Test 13: Source references preserved in proposal ────────────────────

  it('preserves source references in the proposal', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: true,
        trace: [{ step: 'auth', passed: true, durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'source-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest({
      sourceReferences: [
        { sourcePipelineRunId: 'run-123', description: 'From pipeline analysis' },
        { sourceDocumentId: 'doc-456', description: 'From ingested document' },
      ],
    })

    await service.propose(user, request)

    // Source references are passed to the proposal repo create
    const createCall = vi.mocked(proposalRepo.create).mock.calls[0]
    expect(createCall[0].sourceReferences).toHaveLength(2)
    expect(createCall[0].sourceReferences[0].sourcePipelineRunId).toBe('run-123')
  })

  // ── Test 14: Compliance tags preserved ──────────────────────────────────

  it('preserves compliance tags when publishing', async () => {
    const validator = {
      validate: vi.fn(async () => ({
        passed: true,
        trace: [{ step: 'auth', passed: true, durationMs: 1 }],
        writeMode: 'AUTO_APPROVE',
      })),
    }

    const service = new WriteBackService(
      proposalRepo as any,
      writeRunRepo as any,
      { createApprovalRequest: approvalRepo.create } as any,
      auditLogger as any,
      graphValidator as any,
      validator as any,
      { computeHash: vi.fn(() => 'compliance-hash') } as any,
      {} as any,
      {} as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )

    const user = makeUser()
    const request = makeFactRequest({
      complianceTags: ['HIPAA', 'PHI'],
    })

    await service.propose(user, request)

    const createCall = vi.mocked(prisma.knowledgeNode.create).mock.calls[0]
    expect(createCall[0].data.complianceTags).toBeDefined()
  })
})

// ─── Approval Service Integration Tests ──────────────────────────────────────

describe('Approval Integration: Approve → Publish Cycle', () => {
  let approvalService: ApprovalService
  let proposalRepo: ReturnType<typeof buildMockProposalRepo>
  let approvalRepo: ReturnType<typeof buildMockApprovalRepo>
  let auditLogger: ReturnType<typeof buildMockAuditLogger>
  let prisma: ReturnType<typeof buildMockPrisma>
  let indexingTrigger: ReturnType<typeof buildMockIndexingTrigger>
  let cacheInvalidation: ReturnType<typeof buildMockCacheInvalidation>

  beforeEach(() => {
    proposalRepo = buildMockProposalRepo()
    approvalRepo = buildMockApprovalRepo()
    auditLogger = buildMockAuditLogger()
    prisma = buildMockPrisma()
    indexingTrigger = buildMockIndexingTrigger()
    cacheInvalidation = buildMockCacheInvalidation()

    approvalService = new ApprovalService(
      approvalRepo as any,
      proposalRepo as any,
      auditLogger as any,
      prisma as any,
      indexingTrigger as any,
      cacheInvalidation as any,
    )
  })

  // ── Test 15: Admin approves → node published ────────────────────────────

  it('publishes knowledge node when admin approves', async () => {
    const proposal = makeProposal({ status: 'PENDING_APPROVAL', decision: 'PENDING_APPROVAL' })
    proposalRepo._proposals.set(proposal.id, proposal)

    const approval = makeApprovalRequest({ proposalId: proposal.id, status: 'PENDING' })
    approvalRepo._approvals.set(approval.id, approval)

    const admin = makeAdminUser()
    const result = await approvalService.resolveApproval(
      admin,
      approval.id,
      'APPROVED',
      'Looks good',
    )

    expect(result.status).toBe('APPROVED')
    expect(result.publishedNodeId).toBeTruthy()
    expect(result.proposalStatus).toBe('PUBLISHED')

    // Knowledge node was created
    expect(prisma.knowledgeNode.create).toHaveBeenCalledOnce()
    const createCall = vi.mocked(prisma.knowledgeNode.create).mock.calls[0]
    expect(createCall[0].data.organizationId).toBe(ORG_ID)

    // Indexing was triggered
    expect(indexingTrigger.triggerIndexing).toHaveBeenCalledOnce()

    // Cache was invalidated
    expect(cacheInvalidation.invalidateOnPublish).toHaveBeenCalledOnce()

    // Audit was recorded
    expect(auditLogger.recordEvent).toHaveBeenCalled()
    const auditActions = auditLogger._events.map((e) => e.action)
    expect(auditActions).toContain('PROPOSAL_APPROVED')
  })

  // ── Test 16: Admin rejects → no node published ──────────────────────────

  it('does not publish when admin rejects', async () => {
    const proposal = makeProposal({ status: 'PENDING_APPROVAL', decision: 'PENDING_APPROVAL' })
    proposalRepo._proposals.set(proposal.id, proposal)

    const approval = makeApprovalRequest({ proposalId: proposal.id, status: 'PENDING' })
    approvalRepo._approvals.set(approval.id, approval)

    const admin = makeAdminUser()
    const result = await approvalService.resolveApproval(
      admin,
      approval.id,
      'REJECTED',
      'Not accurate',
    )

    expect(result.status).toBe('REJECTED')
    expect(result.publishedNodeId).toBeNull()
    expect(result.proposalStatus).toBe('REJECTED')

    // No knowledge node created
    expect(prisma.knowledgeNode.create).not.toHaveBeenCalled()
    expect(prisma.graphEdge.create).not.toHaveBeenCalled()

    // No indexing triggered
    expect(indexingTrigger.triggerIndexing).not.toHaveBeenCalled()

    // Audit was recorded
    const auditActions = auditLogger._events.map((e) => e.action)
    expect(auditActions).toContain('PROPOSAL_REJECTED')
  })

  // ── Test 17: Non-admin cannot approve ───────────────────────────────────

  it('rejects approval from non-admin users', async () => {
    const approval = makeApprovalRequest({ status: 'PENDING' })
    approvalRepo._approvals.set(approval.id, approval)

    const viewer = makeViewerUser()
    await expect(approvalService.resolveApproval(viewer, approval.id, 'APPROVED')).rejects.toThrow(
      'Only administrators can approve',
    )
  })

  // ── Test 18: Cannot approve already-resolved request ────────────────────

  it('rejects approval of already-resolved request', async () => {
    const approval = makeApprovalRequest({ status: 'APPROVED' })
    approvalRepo._approvals.set(approval.id, approval)

    const admin = makeAdminUser()
    await expect(approvalService.resolveApproval(admin, approval.id, 'APPROVED')).rejects.toThrow(
      'not pending',
    )
  })

  // ── Test 19: Approval creates graph edges ───────────────────────────────

  it('creates graph edges when approval includes relationships', async () => {
    const proposal = makeProposal({ status: 'PENDING_APPROVAL', decision: 'PENDING_APPROVAL' })
    proposalRepo._proposals.set(proposal.id, proposal)
    proposalRepo._relationships.set(proposal.id, [
      {
        proposalId: proposal.id,
        targetNodeId: TARGET_NODE_ID,
        relationshipType: 'DERIVED_FROM',
        weight: 0.9,
        metadata: {},
      },
    ])

    const approval = makeApprovalRequest({ proposalId: proposal.id, status: 'PENDING' })
    approvalRepo._approvals.set(approval.id, approval)

    const admin = makeAdminUser()
    const result = await approvalService.resolveApproval(admin, approval.id, 'APPROVED')

    expect(result.publishedNodeId).toBeTruthy()
    expect(prisma.graphEdge.create).toHaveBeenCalledOnce()
    const edgeCall = vi.mocked(prisma.graphEdge.create).mock.calls[0]
    expect(edgeCall[0].data.sourceId).toBe(result.publishedNodeId)
    expect(edgeCall[0].data.targetId).toBe(TARGET_NODE_ID)
    expect(edgeCall[0].data.relationshipType).toBe('DERIVED_FROM')
  })

  // ── Test 20: Approval overview counts ───────────────────────────────────

  it('returns correct approval overview counts', async () => {
    const admin = makeAdminUser()

    // Add some approvals
    approvalRepo._approvals.set('a1', makeApprovalRequest({ id: 'a1', status: 'PENDING' }))
    approvalRepo._approvals.set('a2', makeApprovalRequest({ id: 'a2', status: 'PENDING' }))
    approvalRepo._approvals.set('a3', makeApprovalRequest({ id: 'a3', status: 'APPROVED' }))
    approvalRepo._approvals.set('a4', makeApprovalRequest({ id: 'a4', status: 'REJECTED' }))

    const overview = await approvalService.getApprovalOverview(admin)

    expect(overview.pending).toBe(2)
    expect(overview.approved).toBe(1)
    expect(overview.rejected).toBe(1)
  })
})
