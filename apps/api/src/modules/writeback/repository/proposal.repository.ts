/* Proposal Repository — Prisma-backed persistence for proposals and relationships.

Every query is org-scoped for tenant isolation. The repository is the ONLY layer
that touches Prisma; services depend on the abstract interface. */

import { Injectable } from '@nestjs/common'
import type {
  EntityId,
  NodeProposalEntity,
  NodeProposalRelationship,
  ProposalDecision,
  ProposalQueryFilters,
  ProposalStatus,
  SourceReference,
} from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import { IProposalRepository } from '../domain/writeback.interfaces'

/** Raw Prisma row shape for NodeProposal with minimal relations. */
interface ProposalRow {
  id: string
  organizationId: string
  workspaceId: string
  proposedById: string | null
  agentIdentityId: string | null
  agentMcpSessionId: string | null
  nodeType: string
  title: string
  content: string
  contentHash: string
  classification: string
  departmentId: string | null
  metadata: unknown
  sourceReferences: unknown
  status: string
  decision: string | null
  decisionReason: string | null
  publishedNodeId: string | null
  writeRunId: string | null
  idempotencyKey: string | null
  createdAt: Date
  updatedAt: Date
}

function rowToEntity(row: ProposalRow): NodeProposalEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    proposedById: row.proposedById,
    agentIdentityId: row.agentIdentityId,
    agentMcpSessionId: row.agentMcpSessionId,
    nodeType: row.nodeType,
    title: row.title,
    content: row.content,
    contentHash: row.contentHash,
    classification: row.classification,
    departmentId: row.departmentId,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    sourceReferences: (row.sourceReferences as SourceReference[]) ?? [],
    status: row.status as ProposalStatus,
    decision: row.decision as ProposalDecision | null,
    decisionReason: row.decisionReason,
    publishedNodeId: row.publishedNodeId,
    writeRunId: row.writeRunId,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

@Injectable()
export class ProposalPrismaRepository implements IProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
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
  }): Promise<NodeProposalEntity> {
    const row = await this.prisma.nodeProposal.create({
      data: {
        organizationId: data.organizationId,
        workspaceId: data.workspaceId,
        proposedById: data.proposedById,
        agentIdentityId: data.agentIdentityId,
        agentMcpSessionId: data.agentMcpSessionId,
        nodeType: data.nodeType,
        title: data.title,
        content: data.content,
        contentHash: data.contentHash,
        classification: data.classification as
          'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED',
        departmentId: data.departmentId,
        metadata: data.metadata as unknown as Record<string, string>,
        sourceReferences: data.sourceReferences as unknown as object[],
        status: data.status as
          | 'PROPOSED'
          | 'VALIDATING'
          | 'PENDING_APPROVAL'
          | 'APPROVED'
          | 'REJECTED'
          | 'PERSISTING'
          | 'PUBLISHED'
          | 'FAILED'
          | 'ARCHIVED',
        idempotencyKey: data.idempotencyKey,
      },
    })
    return rowToEntity(row as unknown as ProposalRow)
  }

  async updateStatus(
    id: EntityId,
    status: ProposalStatus,
    decision?: ProposalDecision | null,
    decisionReason?: string | null,
    publishedNodeId?: EntityId | null,
    writeRunId?: EntityId | null,
  ): Promise<NodeProposalEntity> {
    const row = await this.prisma.nodeProposal.update({
      where: { id },
      data: {
        status: status as
          | 'PROPOSED'
          | 'VALIDATING'
          | 'PENDING_APPROVAL'
          | 'APPROVED'
          | 'REJECTED'
          | 'PERSISTING'
          | 'PUBLISHED'
          | 'FAILED'
          | 'ARCHIVED',
        ...(decision !== undefined && {
          decision: decision as
            'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED' | 'DUPLICATE' | 'FAILED' | null,
        }),
        ...(decisionReason !== undefined && { decisionReason }),
        ...(publishedNodeId !== undefined && { publishedNodeId }),
        ...(writeRunId !== undefined && { writeRunId }),
      },
    })
    return rowToEntity(row as unknown as ProposalRow)
  }

  async findById(id: EntityId): Promise<NodeProposalEntity | null> {
    const row = await this.prisma.nodeProposal.findUnique({ where: { id } })
    return row ? rowToEntity(row as unknown as ProposalRow) : null
  }

  async findByIdempotencyKey(
    organizationId: EntityId,
    idempotencyKey: string,
  ): Promise<NodeProposalEntity | null> {
    const row = await this.prisma.nodeProposal.findFirst({
      where: { organizationId, idempotencyKey },
    })
    return row ? rowToEntity(row as unknown as ProposalRow) : null
  }

  async findByContentHash(
    organizationId: EntityId,
    contentHash: string,
  ): Promise<NodeProposalEntity | null> {
    const row = await this.prisma.nodeProposal.findFirst({
      where: { organizationId, contentHash },
      orderBy: { createdAt: 'desc' },
    })
    return row ? rowToEntity(row as unknown as ProposalRow) : null
  }

  async findByOrganization(filters: ProposalQueryFilters): Promise<NodeProposalEntity[]> {
    const rows = await this.prisma.nodeProposal.findMany({
      where: {
        organizationId: filters.organizationId,
        ...(filters.workspaceId && { workspaceId: filters.workspaceId }),
        ...(filters.status && {
          status: filters.status as
            | 'PROPOSED'
            | 'VALIDATING'
            | 'PENDING_APPROVAL'
            | 'APPROVED'
            | 'REJECTED'
            | 'PERSISTING'
            | 'PUBLISHED'
            | 'FAILED'
            | 'ARCHIVED',
        }),
        ...(filters.decision && {
          decision: filters.decision as
            'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED' | 'DUPLICATE' | 'FAILED',
        }),
        ...(filters.nodeType && { nodeType: filters.nodeType }),
        ...(filters.proposedById && { proposedById: filters.proposedById }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
    })
    return rows.map((row) => rowToEntity(row as unknown as ProposalRow))
  }

  async countByOrganization(organizationId: EntityId): Promise<{
    total: number
    proposed: number
    pendingApproval: number
    published: number
    rejected: number
  }> {
    const [total, proposed, pendingApproval, published, rejected] = await Promise.all([
      this.prisma.nodeProposal.count({ where: { organizationId } }),
      this.prisma.nodeProposal.count({ where: { organizationId, status: 'PROPOSED' } }),
      this.prisma.nodeProposal.count({ where: { organizationId, status: 'PENDING_APPROVAL' } }),
      this.prisma.nodeProposal.count({ where: { organizationId, status: 'PUBLISHED' } }),
      this.prisma.nodeProposal.count({ where: { organizationId, status: 'REJECTED' } }),
    ])
    return { total, proposed, pendingApproval, published, rejected }
  }

  async createRelationship(data: {
    proposalId: EntityId
    targetNodeId: EntityId
    relationshipType: string
    weight: number
    metadata: Record<string, unknown>
  }): Promise<NodeProposalRelationship> {
    const row = await this.prisma.nodeProposalRelationship.create({
      data: {
        proposalId: data.proposalId,
        targetNodeId: data.targetNodeId,
        relationshipType: data.relationshipType as
          'SUPPORTS' | 'REQUIRES' | 'DERIVED_FROM' | 'SUPERSEDES' | 'CONTRADICTS',
        weight: data.weight,
        metadata: data.metadata as unknown as Record<string, string>,
      },
    })
    return {
      id: row.id,
      proposalId: row.proposalId,
      targetNodeId: row.targetNodeId,
      relationshipType: row.relationshipType,
      weight: row.weight,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }
  }

  async findRelationshipsByProposal(proposalId: EntityId): Promise<NodeProposalRelationship[]> {
    const rows = await this.prisma.nodeProposalRelationship.findMany({
      where: { proposalId },
    })
    return rows.map((row) => ({
      id: row.id,
      proposalId: row.proposalId,
      targetNodeId: row.targetNodeId,
      relationshipType: row.relationshipType,
      weight: row.weight,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }))
  }
}
