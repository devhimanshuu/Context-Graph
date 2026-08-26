/* WriteBack Service — main application service for governed agent write-back.

Orchestrates:
  1. Input validation (Zod)
  2. Proposal validation (composable pipeline)
  3. Graph validation (cycle detection)
  4. Transactional persistence (proposal + relationships + run + audit)
  5. Approval handling (when required)
  6. Decision response

The service is the single entry point for both REST and MCP. It NEVER
executes actions — it only validates and proposes. */

import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, EntityId } from '@contextgraph/types'
import type {
  NodeProposalEntity,
  NodeProposalRequest,
  NodeProposalResponse,
  ProposalQueryFilters,
  WriteMode,
} from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import { NotFoundException } from '../../../common/exceptions/not-found.exception'
import { IAuthorizationService } from '../../authorization/services/authorization.service'
import { IAuthorizationEvaluator } from '../../authorization/evaluator/permission-evaluator'
import {
  IProposalRepository,
  IWriteRunRepository,
  IApprovalService,
  IWriteAuditLogger,
  IWriteBackGraphValidator,
} from '../domain/writeback.interfaces'
import { IndexingTriggerService } from './indexing-trigger.service'
import { CacheInvalidationService } from './cache-invalidation.service'
import { ProposalValidator } from './proposal-validator'
import { ContentHashService } from './content-hash.service'
import { PrismaService } from '../../../database/prisma.service'

@Injectable()
export class WriteBackService {
  constructor(
    @Inject(IProposalRepository) private readonly proposalRepo: IProposalRepository,
    @Inject(IWriteRunRepository) private readonly writeRunRepo: IWriteRunRepository,
    @Inject(IApprovalService) private readonly approvalService: IApprovalService,
    @Inject(IWriteAuditLogger) private readonly auditLogger: IWriteAuditLogger,
    @Inject(IWriteBackGraphValidator) private readonly graphValidator: IWriteBackGraphValidator,
    private readonly validator: ProposalValidator,
    private readonly contentHash: ContentHashService,
    private readonly authorization: IAuthorizationService,
    private readonly evaluator: IAuthorizationEvaluator,
    private readonly prisma: PrismaService,
    private readonly indexingTrigger: IndexingTriggerService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  /**
   * Propose a new governed knowledge node. The proposal goes through the full
   * validation pipeline before being persisted or rejected.
   */
  async propose(
    user: AuthenticatedUser,
    request: NodeProposalRequest,
  ): Promise<NodeProposalResponse> {
    const organizationId = user.organizationId
    const startTime = performance.now()

    // 1. Build content hash for dedup
    const contentHash = this.contentHash.computeHash(
      request.nodeType,
      request.title,
      request.content,
      request.classification,
    )

    // 2. Run the composable validation pipeline
    const validation = await this.validator.validate(user, request, organizationId)

    // 3. Create the write run record
    const writeRun = await this.writeRunRepo.create({
      organizationId,
      proposalId: '', // Will be set after proposal creation
      status: validation.passed ? 'VALIDATING' : 'FAILED',
      validationTrace: validation.trace,
    })

    // 4. Record audit: validation started
    await this.auditLogger.recordEvent({
      organizationId,
      actorId: user.id,
      agentIdentityId: null,
      action: 'NODE_VALIDATION_STARTED',
      resourceType: 'node-proposal',
      resourceId: null,
      decision: null,
      reasonCode: null,
      metadata: { nodeType: request.nodeType, contentHash },
    })

    // 5. If validation failed, return rejection
    if (!validation.passed) {
      await this.writeRunRepo.updateStatus(
        writeRun.id,
        'FAILED',
        'FAILED',
        null,
        0,
        validation.reasonCode ?? 'VALIDATION_FAILED',
      )

      await this.auditLogger.recordEvent({
        organizationId,
        actorId: user.id,
        agentIdentityId: null,
        action: 'NODE_VALIDATION_FAILED',
        resourceType: 'node-proposal',
        resourceId: null,
        decision: 'REJECTED',
        reasonCode: validation.reasonCode ?? null,
        metadata: { trace: validation.trace },
      })

      return {
        proposalId: '',
        status: 'FAILED',
        decision: 'FAILED',
        nodeId: null,
        approvalRequired: false,
        reasonCode: validation.reasonCode ?? 'VALIDATION_FAILED',
        validationTrace: validation.trace,
        runId: writeRun.id,
      }
    }

    // 6. Validate graph relationships (if any)
    if (request.relationshipRequests && request.relationshipRequests.length > 0) {
      const graphResult = await this.graphValidator.validateRelationships(
        organizationId,
        request.workspaceId,
        request.relationshipRequests.map((r) => r.targetNodeId),
        request.relationshipRequests,
      )

      if (!graphResult.valid) {
        await this.writeRunRepo.updateStatus(
          writeRun.id,
          'FAILED',
          'FAILED',
          null,
          0,
          graphResult.errors.join('; '),
        )

        return {
          proposalId: '',
          status: 'FAILED',
          decision: 'FAILED',
          nodeId: null,
          approvalRequired: false,
          reasonCode: 'GRAPH_VALIDATION_FAILED',
          validationTrace: [
            ...validation.trace,
            {
              step: 'graph_validation',
              passed: false,
              reasonCode: 'GRAPH_VALIDATION_FAILED',
              explanation: graphResult.errors.join('; '),
              durationMs: 0,
            },
          ],
          runId: writeRun.id,
        }
      }
    }

    // 7. Determine final decision based on write mode
    const decision = this.determineDecision(validation.writeMode)

    // 8. Create the proposal (transactional)
    const proposal = await this.proposalRepo.create({
      organizationId,
      workspaceId: request.workspaceId,
      proposedById: user.id,
      agentIdentityId: null,
      agentMcpSessionId: null,
      nodeType: request.nodeType,
      title: request.title,
      content: request.content,
      contentHash,
      classification: request.classification,
      departmentId: request.departmentId ?? null,
      metadata: request.metadata ?? {},
      sourceReferences: [...(request.sourceReferences ?? [])],
      status:
        decision === 'PUBLISHED'
          ? 'PUBLISHED'
          : decision === 'PENDING_APPROVAL'
            ? 'PENDING_APPROVAL'
            : 'REJECTED',
      idempotencyKey: request.idempotencyKey ?? null,
    })

    // 9. Create relationships
    if (request.relationshipRequests && request.relationshipRequests.length > 0) {
      for (const rel of request.relationshipRequests) {
        await this.proposalRepo.createRelationship({
          proposalId: proposal.id,
          targetNodeId: rel.targetNodeId,
          relationshipType: rel.relationshipType,
          weight: rel.weight ?? 1,
          metadata: rel.metadata ?? {},
        })
      }
    }

    // 10. Create knowledge node if auto-approved
    let publishedNodeId: string | null = null
    if (decision === 'PUBLISHED') {
      publishedNodeId = await this.persistKnowledgeNode(proposal, request)

      // 11. Persist graph edges if node was created
      if (
        publishedNodeId &&
        request.relationshipRequests &&
        request.relationshipRequests.length > 0
      ) {
        for (const rel of request.relationshipRequests) {
          await this.persistGraphEdge(
            publishedNodeId,
            rel.targetNodeId,
            rel.relationshipType,
            rel.weight ?? 1,
            rel.metadata ?? {},
            organizationId,
            request.workspaceId,
          )
        }
      }

      // 12. Trigger indexing (non-blocking) so the node becomes searchable via resolve_context
      if (publishedNodeId) {
        void this.indexingTrigger.triggerIndexing(
          publishedNodeId,
          organizationId,
          request.workspaceId,
        )
      }

      // 13. Invalidate caches (non-blocking) so subsequent queries see the new knowledge
      void this.cacheInvalidation.invalidateOnPublish(organizationId, request.workspaceId)
    }

    // 12. Handle approval if required
    let approvalRequired = false
    if (decision === 'PENDING_APPROVAL') {
      const { approvalId } = await this.approvalService.createApprovalRequest({
        proposalId: proposal.id,
        organizationId,
        requestedAction: 'PROPOSE_KNOWLEDGE',
        nodeType: request.nodeType,
        title: request.title,
        classification: request.classification,
        proposedById: user.id,
        agentIdentityId: null,
      })
      approvalRequired = true

      await this.auditLogger.recordEvent({
        organizationId,
        actorId: user.id,
        agentIdentityId: null,
        action: 'NODE_APPROVAL_REQUIRED',
        resourceType: 'node-proposal',
        resourceId: proposal.id,
        decision: 'PENDING_APPROVAL',
        reasonCode: null,
        metadata: { approvalId, writeMode: validation.writeMode },
      })
    }

    // 13. Update write run with final status
    const finalStatus =
      decision === 'PUBLISHED'
        ? 'PUBLISHED'
        : decision === 'PENDING_APPROVAL'
          ? 'PENDING_APPROVAL'
          : 'REJECTED'
    await this.proposalRepo.updateStatus(
      proposal.id,
      finalStatus,
      decision === 'PUBLISHED'
        ? 'PUBLISHED'
        : decision === 'PENDING_APPROVAL'
          ? 'PENDING_APPROVAL'
          : 'REJECTED',
      null,
      publishedNodeId,
      writeRun.id,
    )
    await this.writeRunRepo.updateStatus(
      writeRun.id,
      finalStatus,
      decision === 'PUBLISHED'
        ? 'PUBLISHED'
        : decision === 'PENDING_APPROVAL'
          ? 'PENDING_APPROVAL'
          : 'REJECTED',
      publishedNodeId,
      request.relationshipRequests?.length ?? 0,
    )

    // 14. Record final audit
    await this.auditLogger.recordEvent({
      organizationId,
      actorId: user.id,
      agentIdentityId: null,
      action:
        decision === 'PUBLISHED'
          ? 'NODE_PUBLISHED'
          : decision === 'PENDING_APPROVAL'
            ? 'NODE_APPROVAL_REQUIRED'
            : 'NODE_REJECTED',
      resourceType: 'node-proposal',
      resourceId: proposal.id,
      decision,
      reasonCode: null,
      metadata: {
        publishedNodeId,
        proposalId: proposal.id,
        runId: writeRun.id,
        relationshipsCount: request.relationshipRequests?.length ?? 0,
        durationMs: Math.round(performance.now() - startTime),
      },
    })

    return {
      proposalId: proposal.id,
      status: finalStatus,
      decision,
      nodeId: publishedNodeId,
      approvalRequired,
      reasonCode: null,
      validationTrace: validation.trace,
      runId: writeRun.id,
    }
  }

  async getProposal(user: AuthenticatedUser, proposalId: EntityId): Promise<NodeProposalEntity> {
    const proposal = await this.proposalRepo.findById(proposalId)
    if (!proposal || proposal.organizationId !== user.organizationId) {
      throw new NotFoundException('Proposal not found')
    }
    return proposal
  }

  async listProposals(
    user: AuthenticatedUser,
    filters: ProposalQueryFilters,
  ): Promise<NodeProposalEntity[]> {
    return this.proposalRepo.findByOrganization({
      ...filters,
      organizationId: user.organizationId,
    })
  }

  async getOverview(user: AuthenticatedUser): Promise<{
    total: number
    proposed: number
    pendingApproval: number
    published: number
    rejected: number
  }> {
    return this.proposalRepo.countByOrganization(user.organizationId)
  }

  /** Determine the final decision from the write mode. */
  private determineDecision(writeMode: WriteMode): 'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED' {
    switch (writeMode) {
      case 'AUTO_APPROVE':
        return 'PUBLISHED'
      case 'REQUIRES_APPROVAL':
        return 'PENDING_APPROVAL'
      case 'MANUAL_ONLY':
        return 'REJECTED'
      default:
        return 'REJECTED'
    }
  }

  /** Persist a new knowledge node from an approved proposal. */
  private async persistKnowledgeNode(
    proposal: NodeProposalEntity,
    request: NodeProposalRequest,
  ): Promise<string> {
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
        complianceTags: {
          create: (request.complianceTags ?? []).map((tag) => ({
            tag: tag as
              | 'HIPAA'
              | 'GDPR'
              | 'PCI_DSS'
              | 'SOC2'
              | 'SOX'
              | 'FINRA'
              | 'ISO_27001'
              | 'PHI'
              | 'PII'
              | 'CONFIDENTIAL'
              | 'RESTRICTED'
              | 'INTERNAL'
              | 'PUBLIC',
          })),
        },
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
