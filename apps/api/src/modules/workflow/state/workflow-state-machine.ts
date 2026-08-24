/* Workflow state machine — enforces valid transitions for workflow and node executions. */

import { Injectable } from '@nestjs/common'
import type { WorkflowExecutionStatus, NodeExecutionStatus } from '@contextgraph/types'
import { WORKFLOW_VALID_TRANSITIONS, NODE_VALID_TRANSITIONS } from '@contextgraph/types'
import type {
  IWorkflowStateMachine,
  WorkflowStateTransitionResult,
  NodeStateTransitionResult,
} from '../domain/workflow.interfaces'

@Injectable()
export class WorkflowStateMachine implements IWorkflowStateMachine {
  canTransitionWorkflow(
    current: WorkflowExecutionStatus,
    requested: WorkflowExecutionStatus,
  ): WorkflowStateTransitionResult {
    const allowed = WORKFLOW_VALID_TRANSITIONS[current]
    if (allowed === undefined) {
      return { valid: false, error: `Unknown workflow status: ${current}` }
    }
    if (allowed.includes(requested)) {
      return { valid: true }
    }
    return {
      valid: false,
      error: `Invalid workflow transition: ${current} → ${requested}. Allowed: [${allowed.join(', ')}]`,
    }
  }

  canTransitionNode(
    current: NodeExecutionStatus,
    requested: NodeExecutionStatus,
  ): NodeStateTransitionResult {
    const allowed = NODE_VALID_TRANSITIONS[current]
    if (allowed === undefined) {
      return { valid: false, error: `Unknown node status: ${current}` }
    }
    if (allowed.includes(requested)) {
      return { valid: true }
    }
    return {
      valid: false,
      error: `Invalid node transition: ${current} → ${requested}. Allowed: [${allowed.join(', ')}]`,
    }
  }
}
