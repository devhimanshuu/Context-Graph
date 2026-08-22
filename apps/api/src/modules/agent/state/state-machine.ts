/* Agent state machine — enforces valid transitions, prevents arbitrary state changes. */

import { AgentExecutionStatus, VALID_TRANSITIONS } from '@contextgraph/types'
import { Injectable } from '@nestjs/common'

export interface StateTransitionResult {
  readonly valid: boolean
  readonly newStatus: AgentExecutionStatus
  readonly error?: string
}

/**
 * The state machine is a pure, deterministic function of (currentStatus, requestedStatus).
 * It does NOT perform side effects — the state manager handles persistence.
 */
@Injectable()
export class AgentStateMachine {
  /**
   * Check whether a transition from `current` to `requested` is permitted.
   */
  canTransition(
    current: AgentExecutionStatus,
    requested: AgentExecutionStatus,
  ): StateTransitionResult {
    const allowed = VALID_TRANSITIONS[current]
    if (allowed === undefined) {
      return {
        valid: false,
        newStatus: current,
        error: `Unknown current status: ${current}`,
      }
    }

    if (allowed.includes(requested)) {
      return { valid: true, newStatus: requested }
    }

    return {
      valid: false,
      newStatus: current,
      error: `Invalid transition: ${current} → ${requested}. Allowed: [${allowed.join(', ')}]`,
    }
  }

  /**
   * Perform the transition, throwing on invalid transitions.
   */
  transition(current: AgentExecutionStatus, requested: AgentExecutionStatus): AgentExecutionStatus {
    const result = this.canTransition(current, requested)
    if (!result.valid) {
      throw new AgentStateTransitionError(result.error ?? 'Invalid transition', current, requested)
    }
    return result.newStatus
  }

  /**
   * Get the allowed next states from a given status.
   */
  getAllowedTransitions(current: AgentExecutionStatus): readonly AgentExecutionStatus[] {
    return VALID_TRANSITIONS[current] ?? []
  }

  /**
   * Check if a status is terminal (no further transitions possible).
   */
  isTerminal(status: AgentExecutionStatus): boolean {
    return (VALID_TRANSITIONS[status] ?? []).length === 0
  }
}

/**
 * Thrown when an invalid state transition is attempted.
 */
export class AgentStateTransitionError extends Error {
  constructor(
    message: string,
    public readonly fromStatus: AgentExecutionStatus,
    public readonly toStatus: AgentExecutionStatus,
  ) {
    super(message)
    this.name = 'AgentStateTransitionError'
  }
}
