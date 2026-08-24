/* Workflow policy — deterministic execution policy engine.

Controls:
  - Allowed agents
  - Allowed tools
  - Execution limits
  - Approval requirements
  - Organization restrictions

The policy is deterministic. No LLM can modify its own policy.
*/

import { Injectable, Inject } from '@nestjs/common'
import type { EntityId, WorkflowExecutionPolicy } from '@contextgraph/types'
import type { IWorkflowPolicy, WorkflowPolicyContext } from '../domain/workflow.interfaces'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { ILogger } from '../../../common/interfaces/logger.interface'

/** Default limits per organization. */
const DEFAULT_POLICY: WorkflowExecutionPolicy = {
  maxNodes: 50,
  maxParallelNodes: 10,
  maxAgentCalls: 20,
  maxToolCalls: 100,
  maxIterations: 30,
  maxTokens: 100_000,
  maxCost: 10.0,
  maxDurationMs: 600_000, // 10 minutes
}

/** High-privilege roles that can execute workflows. */
const ALLOWED_ROLES = new Set(['ADMIN', 'HOD', 'EDITOR', 'QUALITY'])

@Injectable()
export class WorkflowPolicy implements IWorkflowPolicy {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async getExecutionPolicy(_organizationId: EntityId): Promise<WorkflowExecutionPolicy> {
    // In a production system, this would query organization-specific config.
    // For now, return the default policy.
    return DEFAULT_POLICY
  }

  async checkAction(
    action: string,
    context: WorkflowPolicyContext,
  ): Promise<{ allowed: boolean; reason: string | null }> {
    const { userId, userRole, workflowId } = context

    // 1. Check user role is allowed to execute workflows
    if (!ALLOWED_ROLES.has(userRole)) {
      this.logger.warn('Workflow action denied: insufficient role', {
        userId,
        userRole,
        workflowId,
      })
      return { allowed: false, reason: `Role ${userRole} is not authorized to execute workflows` }
    }

    // 2. Check specific action permissions
    switch (action) {
      case 'EXECUTE_WORKFLOW':
        return { allowed: true, reason: null }
      case 'PAUSE_WORKFLOW':
      case 'RESUME_WORKFLOW':
      case 'CANCEL_WORKFLOW':
        return { allowed: true, reason: null }
      case 'APPROVE_ACTION':
        return { allowed: true, reason: null }
      case 'MODIFY_WORKFLOW':
        if (userRole !== 'ADMIN' && userRole !== 'HOD') {
          return { allowed: false, reason: 'Only admins can modify workflow definitions' }
        }
        return { allowed: true, reason: null }
      case 'DELETE_WORKFLOW':
        if (userRole !== 'ADMIN') {
          return { allowed: false, reason: 'Only admins can delete workflow definitions' }
        }
        return { allowed: true, reason: null }
      default:
        this.logger.warn('Unknown workflow action', { action, userId, workflowId })
        return { allowed: false, reason: `Unknown action: ${action}` }
    }
  }
}
