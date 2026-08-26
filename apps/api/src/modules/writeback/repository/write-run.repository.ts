/* Write Run Repository — immutable execution records for proposals.

Each proposal produces a NodeWriteRun that captures the full validation trace,
decision, and outcome. These are append-only records used for audit, replay,
and debugging. */

import { Injectable } from '@nestjs/common'
import type {
  EntityId,
  NodeWriteRunEntity,
  ProposalDecision,
  ProposalStatus,
  ValidationTraceStep,
} from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import { IWriteRunRepository } from '../domain/writeback.interfaces'

interface WriteRunRow {
  id: string
  organizationId: string
  proposalId: string
  proposalVersion: number
  status: string
  decision: string | null
  validationTrace: unknown
  publishedNodeId: string | null
  relationshipsCreated: number
  auditEventIds: unknown
  startedAt: Date
  completedAt: Date | null
  error: string | null
}

function rowToEntity(row: WriteRunRow): NodeWriteRunEntity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    proposalId: row.proposalId,
    proposalVersion: row.proposalVersion,
    status: row.status as ProposalStatus,
    decision: row.decision as ProposalDecision | null,
    validationTrace: (row.validationTrace as ValidationTraceStep[]) ?? [],
    publishedNodeId: row.publishedNodeId,
    relationshipsCreated: row.relationshipsCreated,
    auditEventIds: (row.auditEventIds as string[]) ?? [],
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    error: row.error,
  }
}

@Injectable()
export class WriteRunPrismaRepository implements IWriteRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: EntityId
    proposalId: EntityId
    status: ProposalStatus
    validationTrace: ValidationTraceStep[]
  }): Promise<NodeWriteRunEntity> {
    const row = await this.prisma.nodeWriteRun.create({
      data: {
        organizationId: data.organizationId,
        proposalId: data.proposalId,
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
        validationTrace: data.validationTrace as unknown as object[],
      },
    })
    return rowToEntity(row as unknown as WriteRunRow)
  }

  async updateStatus(
    id: EntityId,
    status: ProposalStatus,
    decision?: ProposalDecision | null,
    publishedNodeId?: EntityId | null,
    relationshipsCreated?: number,
    error?: string | null,
  ): Promise<NodeWriteRunEntity> {
    const row = await this.prisma.nodeWriteRun.update({
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
        ...(publishedNodeId !== undefined && { publishedNodeId }),
        ...(relationshipsCreated !== undefined && { relationshipsCreated }),
        ...(error !== undefined && { error }),
        ...(status === 'PUBLISHED' ||
        status === 'REJECTED' ||
        status === 'FAILED' ||
        status === 'PENDING_APPROVAL'
          ? { completedAt: new Date() }
          : {}),
      },
    })
    return rowToEntity(row as unknown as WriteRunRow)
  }

  async findById(id: EntityId): Promise<NodeWriteRunEntity | null> {
    const row = await this.prisma.nodeWriteRun.findUnique({ where: { id } })
    return row ? rowToEntity(row as unknown as WriteRunRow) : null
  }
}
