/* Approval Service — handles creation and resolution of human approval requests.

When a proposal requires human approval:
  1. Creates an ApprovalRequest record linked to the proposal
  2. A reviewer can approve or reject the request
  3. On approval: publishes the knowledge node + graph edges + audit
  4. On rejection: updates proposal status + audit

The service reuses the same persistence logic as the WriteBackService for
publishing approved proposals. */

import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, EntityId } from '@contextgraph/types'
import type { ApprovalRequestEntity, ResolveApprovalResponse } from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'
import { ForbiddenException } from '../../../common/exceptions/forbidden.exception'
import {
  IApprovalRequestRepository,
  IProposalRepository,
  IWriteAuditLogger,
  IApprovalService,
} from '../domain/writeback.interfaces'
import { PrismaService } from '../../../database/prisma.service'
import { IndexingTriggerService } from './indexing-trigger.service'
import { CacheInvalidationService } from './cache-invalidation.service'

@Injectable()
export class ApprovalService implements IApprovalService {
  constructor(
    @Inject(IApprovalRequestRepository) private readonly approvalRepo: IApprovalRequestRepository,
    @Inject(IProposalRepository) private readonly proposalRepo: IProposalRepository,
    @Inject(IWriteAuditLogger) private readonly auditLogger: IWriteAuditLogger,
    private readonly prisma: PrismaService,
    private readonly indexingTrigger: IndexingTriggerService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async createApprovalRequest(data: {
    proposalId: EntityId
    organizationId: EntityId
    requestedAction: string
    nodeType: string
    title: string
    classification: string
    proposedById: EntityId | null
    agentIdentityId: string | null
  }): Promise<{ approvalId: string }> {
    // Fetch the proposal to get its content for the approval display
    const proposal = await this.proposalRepo.findById(data.proposalId)
    const content = proposal?.content ?? ''
    const classification = proposal?.classification ?? data.classification

    return this.approvalRepo.create({
      ...data,
      content,
      classification,
    })
  }

  async resolveApproval(
    user: AuthenticatedUser,
    approvalId: EntityId,
    resolution: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<ResolveApprovalResponse> {
    // 1. Load the approval request
    const approval = await this.approvalRepo.findById(approvalId)
    if (!approval || approval.organizationId !== user.organizationId) {
      throw new NotFoundException('Approval request not found')
    }

    if (approval.status !== 'PENDING') {
      throw new ForbiddenException('Approval request is not pending', {
        currentStatus: approval.status,
      })
    }

    // 2. Only admins and HODs can approve
    if (!['ADMIN', 'HOD'].includes(user.role ?? '')) {
      throw new ForbiddenException('Only administrators can approve proposals', {
        requiredRoles: ['ADMIN', 'HOD'],
        currentRole: user.role,
      })
    }

    // 3. Resolve the approval
    await this.approvalRepo.resolve(approvalId, user.id, resolution, note)

    // 4. Load the proposal to get full data for publishing
    const proposal = await this.proposalRepo.findById(approval.proposalId)

    let publishedNodeId: string | null = null
    let proposalStatus: 'PUBLISHED' | 'REJECTED' = 'REJECTED'

    if (resolution === 'APPROVED' && proposal) {
      // 5. Publish the knowledge node
      publishedNodeId = await this.persistKnowledgeNode(proposal)

      // 6. Persist graph edges
      const relationships = await this.proposalRepo.findRelationshipsByProposal(proposal.id)
      for (const rel of relationships) {
        await this.persistGraphEdge(
          publishedNodeId,
          rel.targetNodeId,
          rel.relationshipType,
          rel.weight,
          rel.metadata as Record<string, unknown>,
          proposal.organizationId,
          proposal.workspaceId,
        )
      }

      // 7. Trigger indexing (non-blocking) so the node becomes searchable via resolve_context
      void this.indexingTrigger.triggerIndexing(
        publishedNodeId,
        proposal.organizationId,
        proposal.workspaceId,
      )

      // 8. Invalidate caches (non-blocking) so subsequent queries see the new knowledge
      void this.cacheInvalidation.invalidateOnPublish(proposal.organizationId, proposal.workspaceId)

      proposalStatus = 'PUBLISHED'
    }

    // 7. Update proposal status
    await this.proposalRepo.updateStatus(
      proposal?.id ?? approval.proposalId,
      proposalStatus,
      proposalStatus === 'PUBLISHED' ? 'PUBLISHED' : 'REJECTED',
      note ?? null,
      publishedNodeId,
    )

    // 8. Record audit
    await this.auditLogger.recordEvent({
      organizationId: user.organizationId,
      actorId: user.id,
      agentIdentityId: null,
      action: resolution === 'APPROVED' ? 'PROPOSAL_APPROVED' : 'PROPOSAL_REJECTED',
      resourceType: 'proposal-approval',
      resourceId: approvalId,
      decision: resolution,
      reasonCode: null,
      metadata: {
        proposalId: approval.proposalId,
        publishedNodeId,
        resolutionNote: note ?? null,
        nodeType: approval.nodeType,
      },
    })

    return {
      approvalId,
      status: resolution,
      publishedNodeId,
      proposalStatus,
    }
  }

  async listApprovals(user: AuthenticatedUser, status?: string): Promise<ApprovalRequestEntity[]> {
    return this.approvalRepo.findByOrganization(user.organizationId, status)
  }

  async getApprovalOverview(
    user: AuthenticatedUser,
  ): Promise<{ pending: number; approved: number; rejected: number }> {
    const all = await this.approvalRepo.findByOrganization(user.organizationId)
    return {
      pending: all.filter((a) => a.status === 'PENDING').length,
      approved: all.filter((a) => a.status === 'APPROVED').length,
      rejected: all.filter((a) => a.status === 'REJECTED').length,
    }
  }

  /** Publish a knowledge node from an approved proposal. */
  private async persistKnowledgeNode(proposal: {
    id: string
    organizationId: string
    workspaceId: string
    title: string
    content: string
    nodeType: string
    classification: string
    departmentId: string | null
    metadata: Record<string, unknown>
    proposedById: string | null
    agentIdentityId: string | null
  }): Promise<string> {
    const nodeId = uuid()
    await this.prisma.knowledgeNode.create({
      data: {
        id: nodeId,
        organizationId: proposal.organizationId,
        workspaceId: proposal.workspaceId,
        departmentId: proposal.departmentId,
        title: proposal.title,
        content: proposal.content,
        type: proposal.nodeType as 'FACT' | 'DECISION',
        status: 'ACTIVE',
        importance: 0,
        derivabilityScore: 0,
        version: 1,
        metadata: {
          ...proposal.metadata,
          source: 'agent-proposal',
          proposalId: proposal.id,
          classification: proposal.classification,
          proposedBy: proposal.proposedById,
          agentIdentityId: proposal.agentIdentityId,
        },
        createdById: proposal.proposedById,
        updatedById: proposal.proposedById,
      },
    })
    return nodeId
  }

  /** Persist a graph edge for a published proposal. */
  private async persistGraphEdge(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    weight: number,
    metadata: Record<string, unknown>,
    organizationId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.prisma.graphEdge.create({
      data: {
        id: uuid(),
        organizationId,
        workspaceId,
        sourceId,
        targetId,
        relationshipType: relationshipType as
          'SUPPORTS' | 'REQUIRES' | 'DERIVED_FROM' | 'SUPERSEDES' | 'CONTRADICTS',
        weight,
        metadata: metadata as unknown as Record<string, string>,
      },
    })
  }
}
