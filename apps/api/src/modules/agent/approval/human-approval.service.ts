/* Human approval service — abstraction for human-in-the-loop workflows.

Agent
↓
Sensitive action
↓
Approval Required
↓
Human
↓
Approve / Reject
↓
Continue / Stop

Do not automatically execute high-risk actions.
*/

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { EntityId } from '@contextgraph/types'

export interface ApprovalRequest {
  readonly request_id: EntityId
  readonly executionId: EntityId
  readonly toolName: string
  readonly toolInput: Record<string, unknown>
  readonly riskLevel: string
  readonly reason: string
  readonly createdAt: string
  readonly expiresAt: string
}

export type ApprovalDecision = 'APPROVED' | 'REJECTED'

/**
 * Service for managing human approval requests.
 *
 * In the initial implementation, all non-READ_ONLY tools require approval.
 * Future: configurable per-organization approval policies.
 */
@Injectable()
export class HumanApprovalService {
  private readonly pendingApprovals = new Map<string, ApprovalRequest>()

  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  /**
   * Create an approval request for a high-risk action.
   */
  async requestApproval(
    executionId: EntityId,
    toolName: string,
    toolInput: Record<string, unknown>,
    riskLevel: string,
    reason: string,
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      request_id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      executionId,
      toolName,
      toolInput,
      riskLevel,
      reason,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 300_000).toISOString(), // 5 minutes
    }

    this.pendingApprovals.set(request.request_id, request)

    this.logger.info('Approval requested', {
      requestId: request.request_id,
      executionId,
      toolName,
      riskLevel,
    })

    return request
  }

  /**
   * Get a pending approval request.
   */
  async getApproval(requestId: string): Promise<ApprovalRequest | null> {
    return this.pendingApprovals.get(requestId) ?? null
  }

  /**
   * Process an approval decision.
   */
  async processDecision(
    requestId: string,
    decision: ApprovalDecision,
    reviewerId: EntityId,
    note?: string,
  ): Promise<boolean> {
    const request = this.pendingApprovals.get(requestId)
    if (request === undefined) {
      this.logger.warn('Approval request not found', { requestId })
      return false
    }

    // Check expiry
    if (new Date(request.expiresAt) < new Date()) {
      this.pendingApprovals.delete(requestId)
      this.logger.warn('Approval request expired', { requestId })
      return false
    }

    this.pendingApprovals.delete(requestId)

    this.logger.info('Approval decision processed', {
      requestId,
      decision,
      reviewerId,
      toolName: request.toolName,
      note,
    })

    return decision === 'APPROVED'
  }

  /**
   * Get all pending approvals for a user.
   */
  async getPendingApprovals(_reviewerId?: EntityId): Promise<readonly ApprovalRequest[]> {
    const now = new Date()
    return [...this.pendingApprovals.values()].filter((r) => new Date(r.expiresAt) > now)
  }

  /**
   * Cancel an approval request.
   */
  async cancelApproval(requestId: string): Promise<void> {
    this.pendingApprovals.delete(requestId)
  }
}
