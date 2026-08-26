/* WriteBack domain interfaces — DI tokens for dependency inversion.

The WriteBack module depends on these abstractions; concrete implementations
are provided by repositories and services. No module should depend on
concrete classes directly. */

import type {
  AuthenticatedUser,
  EntityId,
  NodeProposalEntity,
  NodeProposalRelationship,
  NodeProposalRequest,
  NodeProposalResponse,
  NodeWriteRunEntity,
  ProposalDecision,
  ProposalQueryFilters,
  ProposalStatus,
  SourceReference,
  ValidationTraceStep,
  WriteMode,
} from '@contextgraph/types'

// ─── Proposal Repository ─────────────────────────────────────────────────────

export abstract class IProposalRepository {
  abstract create(data: {
    organizationId: EntityId
    workspaceId: EntityId
    proposedById: EntityId | null
    agentIdentityId: string | null
    agentMcpSessionId: string | null
    nodeType: string
    title: string
    content: string
    contentHash: string
    classification: string
    departmentId: string | null
    metadata: Record<string, unknown>
    sourceReferences: SourceReference[]
    status: ProposalStatus
    idempotencyKey: string | null
  }): Promise<NodeProposalEntity>

  abstract updateStatus(
    id: EntityId,
    status: ProposalStatus,
    decision?: ProposalDecision | null,
    decisionReason?: string | null,
    publishedNodeId?: EntityId | null,
    writeRunId?: EntityId | null,
  ): Promise<NodeProposalEntity>

  abstract findById(id: EntityId): Promise<NodeProposalEntity | null>

  abstract findByIdempotencyKey(
    organizationId: EntityId,
    idempotencyKey: string,
  ): Promise<NodeProposalEntity | null>

  abstract findByContentHash(
    organizationId: EntityId,
    contentHash: string,
  ): Promise<NodeProposalEntity | null>

  abstract findByOrganization(filters: ProposalQueryFilters): Promise<NodeProposalEntity[]>

  abstract countByOrganization(organizationId: EntityId): Promise<{
    total: number
    proposed: number
    pendingApproval: number
    published: number
    rejected: number
  }>

  abstract createRelationship(data: {
    proposalId: EntityId
    targetNodeId: EntityId
    relationshipType: string
    weight: number
    metadata: Record<string, unknown>
  }): Promise<NodeProposalRelationship>

  abstract findRelationshipsByProposal(proposalId: EntityId): Promise<NodeProposalRelationship[]>
}

// ─── Write Run Repository ────────────────────────────────────────────────────

export abstract class IWriteRunRepository {
  abstract create(data: {
    organizationId: EntityId
    proposalId: EntityId
    status: ProposalStatus
    validationTrace: ValidationTraceStep[]
  }): Promise<NodeWriteRunEntity>

  abstract updateStatus(
    id: EntityId,
    status: ProposalStatus,
    decision?: ProposalDecision | null,
    publishedNodeId?: EntityId | null,
    relationshipsCreated?: number,
    error?: string | null,
  ): Promise<NodeWriteRunEntity>

  abstract findById(id: EntityId): Promise<NodeWriteRunEntity | null>
}

// ─── Content Hash Service ────────────────────────────────────────────────────

export abstract class IContentHashService {
  abstract computeHash(
    nodeType: string,
    title: string,
    content: string,
    classification: string,
  ): string
}

// ─── Proposal Validator ──────────────────────────────────────────────────────

export abstract class IProposalValidator {
  abstract validate(
    user: AuthenticatedUser,
    request: NodeProposalRequest,
    organizationId: EntityId,
  ): Promise<{
    passed: boolean
    trace: ValidationTraceStep[]
    writeMode: WriteMode
    reasonCode?: string
  }>
}

// ─── Graph Validator (write-back integration) ────────────────────────────────

export abstract class IWriteBackGraphValidator {
  /** Validates that proposed relationships won't create cycles. */
  abstract validateRelationships(
    organizationId: EntityId,
    workspaceId: EntityId,
    parentNodeIds: readonly EntityId[],
    newRelationships: readonly { targetNodeId: EntityId; relationshipType: string }[],
  ): Promise<{ valid: boolean; errors: string[] }>
}

// ─── Approval Repository ─────────────────────────────────────────────────────

export abstract class IApprovalRequestRepository {
  abstract create(data: {
    organizationId: EntityId
    proposalId: EntityId
    requestedAction: string
    nodeType: string
    title: string
    content: string
    classification: string
    proposedById: EntityId | null
    agentIdentityId: string | null
  }): Promise<{ approvalId: string }>

  abstract findById(
    id: EntityId,
  ): Promise<import('@contextgraph/types').ApprovalRequestEntity | null>

  abstract findByOrganization(
    organizationId: EntityId,
    status?: string,
  ): Promise<import('@contextgraph/types').ApprovalRequestEntity[]>

  abstract countPending(organizationId: EntityId): Promise<number>

  abstract resolve(
    id: EntityId,
    resolvedById: EntityId,
    resolution: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<import('@contextgraph/types').ApprovalRequestEntity>
}

// ─── Approval Service ────────────────────────────────────────────────────────

export abstract class IApprovalService {
  /** Creates an approval request for a proposal that requires human review. */
  abstract createApprovalRequest(data: {
    proposalId: EntityId
    organizationId: EntityId
    requestedAction: string
    nodeType: string
    title: string
    classification: string
    proposedById: EntityId | null
    agentIdentityId: string | null
  }): Promise<{ approvalId: string }>

  /** Resolves an approval request (approve or reject). */
  abstract resolveApproval(
    user: AuthenticatedUser,
    approvalId: EntityId,
    resolution: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<import('@contextgraph/types').ResolveApprovalResponse>

  /** Lists approval requests for an organization. */
  abstract listApprovals(
    user: AuthenticatedUser,
    status?: string,
  ): Promise<import('@contextgraph/types').ApprovalRequestEntity[]>

  /** Gets overview counts. */
  abstract getApprovalOverview(
    user: AuthenticatedUser,
  ): Promise<{ pending: number; approved: number; rejected: number }>
}

// ─── Write Audit Logger ─────────────────────────────────────────────────────

export abstract class IWriteAuditLogger {
  abstract recordEvent(data: {
    organizationId: EntityId
    actorId: EntityId | null
    agentIdentityId: string | null
    action: string
    resourceType: string
    resourceId: EntityId | null
    decision: string | null
    reasonCode: string | null
    metadata: Record<string, unknown>
  }): Promise<{ eventId: string }>
}

// ─── WriteBack Service ───────────────────────────────────────────────────────

export abstract class IWriteBackService {
  abstract propose(
    user: AuthenticatedUser,
    request: NodeProposalRequest,
  ): Promise<NodeProposalResponse>

  abstract getProposal(user: AuthenticatedUser, proposalId: EntityId): Promise<NodeProposalEntity>

  abstract listProposals(
    user: AuthenticatedUser,
    filters: ProposalQueryFilters,
  ): Promise<NodeProposalEntity[]>

  abstract getOverview(user: AuthenticatedUser): Promise<{
    total: number
    proposed: number
    pendingApproval: number
    published: number
    rejected: number
  }>
}
