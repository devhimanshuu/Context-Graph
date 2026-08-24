/* Unit tests for Workflow State Machine — validates transition rules. */

import { WorkflowStateMachine } from './workflow-state-machine'

describe('WorkflowStateMachine', () => {
  const sm = new WorkflowStateMachine()

  describe('Workflow transitions', () => {
    it('should allow PENDING → RUNNING', () => {
      expect(sm.canTransitionWorkflow('PENDING', 'RUNNING').valid).toBe(true)
    })

    it('should allow PENDING → CANCELLED', () => {
      expect(sm.canTransitionWorkflow('PENDING', 'CANCELLED').valid).toBe(true)
    })

    it('should allow RUNNING → COMPLETED', () => {
      expect(sm.canTransitionWorkflow('RUNNING', 'COMPLETED').valid).toBe(true)
    })

    it('should allow RUNNING → PAUSED', () => {
      expect(sm.canTransitionWorkflow('RUNNING', 'PAUSED').valid).toBe(true)
    })

    it('should allow RUNNING → FAILED', () => {
      expect(sm.canTransitionWorkflow('RUNNING', 'FAILED').valid).toBe(true)
    })

    it('should allow RUNNING → WAITING_FOR_APPROVAL', () => {
      expect(sm.canTransitionWorkflow('RUNNING', 'WAITING_FOR_APPROVAL').valid).toBe(true)
    })

    it('should allow PAUSED → RUNNING', () => {
      expect(sm.canTransitionWorkflow('PAUSED', 'RUNNING').valid).toBe(true)
    })

    it('should allow FAILED → RECOVERY_REQUIRED', () => {
      expect(sm.canTransitionWorkflow('FAILED', 'RECOVERY_REQUIRED').valid).toBe(true)
    })

    it('should NOT allow COMPLETED → any state', () => {
      expect(sm.canTransitionWorkflow('COMPLETED', 'RUNNING').valid).toBe(false)
      expect(sm.canTransitionWorkflow('COMPLETED', 'FAILED').valid).toBe(false)
    })

    it('should NOT allow CANCELLED → any state', () => {
      expect(sm.canTransitionWorkflow('CANCELLED', 'RUNNING').valid).toBe(false)
    })

    it('should NOT allow PENDING → COMPLETED', () => {
      expect(sm.canTransitionWorkflow('PENDING', 'COMPLETED').valid).toBe(false)
    })

    it('should NOT allow PAUSED → COMPLETED', () => {
      expect(sm.canTransitionWorkflow('PAUSED', 'COMPLETED').valid).toBe(false)
    })
  })

  describe('Node transitions', () => {
    it('should allow PENDING → READY', () => {
      expect(sm.canTransitionNode('PENDING', 'READY').valid).toBe(true)
    })

    it('should allow READY → RUNNING', () => {
      expect(sm.canTransitionNode('READY', 'RUNNING').valid).toBe(true)
    })

    it('should allow RUNNING → COMPLETED', () => {
      expect(sm.canTransitionNode('RUNNING', 'COMPLETED').valid).toBe(true)
    })

    it('should allow RUNNING → FAILED', () => {
      expect(sm.canTransitionNode('RUNNING', 'FAILED').valid).toBe(true)
    })

    it('should allow FAILED → READY (retry)', () => {
      expect(sm.canTransitionNode('FAILED', 'READY').valid).toBe(true)
    })

    it('should NOT allow COMPLETED → any state', () => {
      expect(sm.canTransitionNode('COMPLETED', 'RUNNING').valid).toBe(false)
    })

    it('should NOT allow PENDING → COMPLETED', () => {
      expect(sm.canTransitionNode('PENDING', 'COMPLETED').valid).toBe(false)
    })

    it('should NOT allow PENDING → RUNNING (must go through READY)', () => {
      expect(sm.canTransitionNode('PENDING', 'RUNNING').valid).toBe(false)
    })
  })
})
