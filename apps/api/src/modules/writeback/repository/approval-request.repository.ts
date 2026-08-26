/* Approval Request Repository — Prisma persistence for human approval requests.

Every query is org-scoped for tenant isolation. The repository is the ONLY
layer that touches Prisma; services depend on the abstract interface. */

import { Injectable } from '@nestjs/common'
import type { EntityId, ApprovalRequestEntity, ApprovalRequestStatus } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import { IApprovalRequestRepository } from '../domain/writeback.interfaces'

interface ApprovalRow {
  id: string
  organizationId: string
  proposalId: string
  requestedAction: string
  nodeType: string
  title: string
  content: string
  classification: string
  proposedById: string | null
  agentIdentityId: string | null
  status: string
  resolvedById: string | null
  resolutionNote: string | null
  publishedNodeId: string | null
  createdAt: Date
  resolvedAt: Date | null
  expiresAt: Date | null
}

function rowToEntity(row: ApprovalRow): ApprovalRequestEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    proposalId: row.proposalId,
    requestedAction: row.requestedAction,
    nodeType: row.nodeType,
    title: row.title,
    content: row.content,
    classification: row.classification,
    proposedById: row.proposedById,
    agentIdentityId: row.agentIdentityId,
    status: row.status as ApprovalRequestStatus,
    resolvedById: row.resolvedById,
    resolutionNote: row.resolutionNote,
    publishedNodeId: row.publishedNodeId,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  }
}

@Injectable()
export class ApprovalRequestPrismaRepository implements IApprovalRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: EntityId
    proposalId: EntityId
    requestedAction: string
    nodeType: string
    title: string
    content: string
    classification: string
    proposedById: EntityId | null
    agentIdentityId: string | null
  }): Promise<{ approvalId: string }> {
    const row = await this.prisma.proposalApprovalRequest.create({
      data: {
        organizationId: data.organizationId,
        proposalId: data.proposalId,
        requestedAction: data.requestedAction,
        nodeType: data.nodeType,
        title: data.title,
        content: data.content,
        classification: data.classification,
        proposedById: data.proposedById,
        agentIdentityId: data.agentIdentityId,
      },
    })
    return { approvalId: row.id }
  }

  async findById(id: EntityId): Promise<ApprovalRequestEntity | null> {
    const row = await this.prisma.proposalApprovalRequest.findUnique({ where: { id } })
    return row ? rowToEntity(row as unknown as ApprovalRow) : null
  }

  async findByOrganization(
    organizationId: EntityId,
    status?: string,
  ): Promise<ApprovalRequestEntity[]> {
    const rows = await this.prisma.proposalApprovalRequest.findMany({
      where: {
        organizationId,
        ...(status
          ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return rows.map((row) => rowToEntity(row as unknown as ApprovalRow))
  }

  async countPending(organizationId: EntityId): Promise<number> {
    return this.prisma.proposalApprovalRequest.count({
      where: { organizationId, status: 'PENDING' },
    })
  }

  async resolve(
    id: EntityId,
    resolvedById: EntityId,
    resolution: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<ApprovalRequestEntity> {
    const row = await this.prisma.proposalApprovalRequest.update({
      where: { id },
      data: {
        status: resolution,
        resolvedById,
        resolutionNote: note ?? null,
        resolvedAt: new Date(),
      },
    })
    return rowToEntity(row as unknown as ApprovalRow)
  }
}
