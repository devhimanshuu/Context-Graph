/* Agent state machine — unit tests. */

import { describe, it, expect } from 'vitest'
import { AgentStateMachine, AgentStateTransitionError } from './state-machine'
import { AgentExecutionStatus } from '@contextgraph/types'

describe('AgentStateMachine', () => {
  const sm = new AgentStateMachine()

  describe('canTransition', () => {
    it('allows valid transitions', () => {
      const result = sm.canTransition(
        AgentExecutionStatus.PENDING,
        AgentExecutionStatus.INITIALIZING,
      )
      expect(result.valid).toBe(true)
      expect(result.newStatus).toBe(AgentExecutionStatus.INITIALIZING)
    })

    it('rejects invalid transitions', () => {
      const result = sm.canTransition(AgentExecutionStatus.COMPLETED, AgentExecutionStatus.PLANNING)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid transition')
    })

    it('rejects transitions from terminal states', () => {
      const terminalStates = [
        AgentExecutionStatus.COMPLETED,
        AgentExecutionStatus.FAILED,
        AgentExecutionStatus.CANCELLED,
        AgentExecutionStatus.TIMEOUT,
        AgentExecutionStatus.POLICY_BLOCKED,
      ]

      for (const terminal of terminalStates) {
        const result = sm.canTransition(terminal, AgentExecutionStatus.PLANNING)
        expect(result.valid).toBe(false)
      }
    })

    it('allows PLANNING → REQUESTING_CONTEXT', () => {
      const result = sm.canTransition(
        AgentExecutionStatus.PLANNING,
        AgentExecutionStatus.REQUESTING_CONTEXT,
      )
      expect(result.valid).toBe(true)
    })

    it('allows PLANNING → EXECUTING_TOOL', () => {
      const result = sm.canTransition(
        AgentExecutionStatus.PLANNING,
        AgentExecutionStatus.EXECUTING_TOOL,
      )
      expect(result.valid).toBe(true)
    })

    it('allows EXECUTING_TOOL → OBSERVING', () => {
      const result = sm.canTransition(
        AgentExecutionStatus.EXECUTING_TOOL,
        AgentExecutionStatus.OBSERVING,
      )
      expect(result.valid).toBe(true)
    })

    it('allows OBSERVING → PLANNING (re-planning)', () => {
      const result = sm.canTransition(AgentExecutionStatus.OBSERVING, AgentExecutionStatus.PLANNING)
      expect(result.valid).toBe(true)
    })

    it('allows OBSERVING → VERIFYING', () => {
      const result = sm.canTransition(
        AgentExecutionStatus.OBSERVING,
        AgentExecutionStatus.VERIFYING,
      )
      expect(result.valid).toBe(true)
    })

    it('allows VERIFYING → GENERATING_RESPONSE', () => {
      const result = sm.canTransition(
        AgentExecutionStatus.VERIFYING,
        AgentExecutionStatus.GENERATING_RESPONSE,
      )
      expect(result.valid).toBe(true)
    })

    it('allows GENERATING_RESPONSE → COMPLETED', () => {
      const result = sm.canTransition(
        AgentExecutionStatus.GENERATING_RESPONSE,
        AgentExecutionStatus.COMPLETED,
      )
      expect(result.valid).toBe(true)
    })

    it('allows failure transitions from most states', () => {
      const statesFromWhichFail = [
        AgentExecutionStatus.INITIALIZING,
        AgentExecutionStatus.PLANNING,
        AgentExecutionStatus.REQUESTING_CONTEXT,
        AgentExecutionStatus.EXECUTING_TOOL,
        AgentExecutionStatus.OBSERVING,
        AgentExecutionStatus.VERIFYING,
        AgentExecutionStatus.GENERATING_RESPONSE,
      ]

      for (const state of statesFromWhichFail) {
        const result = sm.canTransition(state, AgentExecutionStatus.FAILED)
        expect(result.valid).toBe(true)
      }
    })
  })

  describe('transition', () => {
    it('returns new status on valid transition', () => {
      const newStatus = sm.transition(
        AgentExecutionStatus.PENDING,
        AgentExecutionStatus.INITIALIZING,
      )
      expect(newStatus).toBe(AgentExecutionStatus.INITIALIZING)
    })

    it('throws on invalid transition', () => {
      expect(() =>
        sm.transition(AgentExecutionStatus.COMPLETED, AgentExecutionStatus.PLANNING),
      ).toThrow(AgentStateTransitionError)
    })
  })

  describe('getAllowedTransitions', () => {
    it('returns allowed transitions for PLANNING', () => {
      const transitions = sm.getAllowedTransitions(AgentExecutionStatus.PLANNING)
      expect(transitions).toContain(AgentExecutionStatus.REQUESTING_CONTEXT)
      expect(transitions).toContain(AgentExecutionStatus.EXECUTING_TOOL)
      expect(transitions).toContain(AgentExecutionStatus.FAILED)
    })

    it('returns empty for terminal states', () => {
      expect(sm.getAllowedTransitions(AgentExecutionStatus.COMPLETED)).toHaveLength(0)
      expect(sm.getAllowedTransitions(AgentExecutionStatus.FAILED)).toHaveLength(0)
    })
  })

  describe('isTerminal', () => {
    it('returns true for terminal states', () => {
      expect(sm.isTerminal(AgentExecutionStatus.COMPLETED)).toBe(true)
      expect(sm.isTerminal(AgentExecutionStatus.FAILED)).toBe(true)
      expect(sm.isTerminal(AgentExecutionStatus.CANCELLED)).toBe(true)
      expect(sm.isTerminal(AgentExecutionStatus.TIMEOUT)).toBe(true)
      expect(sm.isTerminal(AgentExecutionStatus.POLICY_BLOCKED)).toBe(true)
    })

    it('returns false for non-terminal states', () => {
      expect(sm.isTerminal(AgentExecutionStatus.PENDING)).toBe(false)
      expect(sm.isTerminal(AgentExecutionStatus.PLANNING)).toBe(false)
      expect(sm.isTerminal(AgentExecutionStatus.EXECUTING_TOOL)).toBe(false)
    })
  })
})
