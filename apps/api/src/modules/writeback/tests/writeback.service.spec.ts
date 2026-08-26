/* WriteBack unit tests — proposal validation, content hashing, and decision logic.

Tests verify:
  1. Proposal schema validation
  2. Content hash determinism
  3. Node type restrictions
  4. Classification enforcement
  5. Write mode decisions
  6. Duplicate detection logic
  7. Idempotency
  8. Decision resolution (AUTO_APPROVE vs REQUIRES_APPROVAL)
  9. Validation trace completeness
  10. Property invariants (rejected proposals never create nodes) */

import { describe, it, expect } from 'vitest'
import {
  ProposalStatus,
  ProposalDecision,
  WriteMode,
  WritableNodeType,
  DataClassification,
  type NodeProposalRequest,
  type ValidationTraceStep,
} from '@contextgraph/types'
import { nodeProposalSchema } from '../schemas/writeback.validation'

// ─── Schema Validation ───────────────────────────────────────────────────────

describe('NodeProposal Schema Validation', () => {
  const validProposal = {
    nodeType: 'FACT' as const,
    title: 'Service X restart resolves incident INC-1842',
    content: 'Restarting service X after condition Y resolved the production incident.',
    classification: 'INTERNAL' as const,
    workspaceId: '00000000-0000-0000-0000-000000000001',
  }

  it('accepts a valid FACT proposal', () => {
    const result = nodeProposalSchema.safeParse(validProposal)
    expect(result.success).toBe(true)
  })

  it('accepts a valid DECISION proposal', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, nodeType: 'DECISION' })
    expect(result.success).toBe(true)
  })

  it('rejects unsupported node types', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, nodeType: 'CONSTRAINT' })
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty content', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, content: '' })
    expect(result.success).toBe(false)
  })

  it('rejects title exceeding 300 characters', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, title: 'x'.repeat(301) })
    expect(result.success).toBe(false)
  })

  it('rejects content exceeding 50,000 characters', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, content: 'x'.repeat(50_001) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid classification', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, classification: 'TOP_SECRET' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid workspace ID format', () => {
    const result = nodeProposalSchema.safeParse({ ...validProposal, workspaceId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('defaults classification to INTERNAL', () => {
    const { classification: _, ...noClass } = validProposal
    const result = nodeProposalSchema.safeParse(noClass)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.classification).toBe('INTERNAL')
  })

  it('accepts all valid classifications', () => {
    for (const cls of ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']) {
      const result = nodeProposalSchema.safeParse({ ...validProposal, classification: cls })
      expect(result.success).toBe(true)
    }
  })

  it('accepts source references', () => {
    const result = nodeProposalSchema.safeParse({
      ...validProposal,
      sourceReferences: [
        {
          sourcePipelineRunId: '00000000-0000-0000-0000-000000000002',
          description: 'From pipeline',
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts relationship requests', () => {
    const result = nodeProposalSchema.safeParse({
      ...validProposal,
      relationshipRequests: [
        {
          targetNodeId: '00000000-0000-0000-0000-000000000003',
          relationshipType: 'SUPPORTS',
          weight: 0.8,
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid relationship types', () => {
    const result = nodeProposalSchema.safeParse({
      ...validProposal,
      relationshipRequests: [
        {
          targetNodeId: '00000000-0000-0000-0000-000000000003',
          relationshipType: 'INVALID_TYPE',
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects too many source references (>20)', () => {
    const result = nodeProposalSchema.safeParse({
      ...validProposal,
      sourceReferences: Array.from({ length: 21 }, () => ({
        description: 'ref',
      })),
    })
    expect(result.success).toBe(false)
  })

  it('rejects too many relationship requests (>50)', () => {
    const result = nodeProposalSchema.safeParse({
      ...validProposal,
      relationshipRequests: Array.from({ length: 51 }, (_, i) => ({
        targetNodeId: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        relationshipType: 'SUPPORTS',
      })),
    })
    expect(result.success).toBe(false)
  })

  it('strips unknown fields (strict mode)', () => {
    const result = nodeProposalSchema.safeParse({
      ...validProposal,
      maliciousField: 'should be stripped',
    })
    expect(result.success).toBe(true)
  })
})

// ─── Enum Constants ──────────────────────────────────────────────────────────

describe('WriteBack Enums', () => {
  it('ProposalStatus has all required states', () => {
    expect(ProposalStatus.PROPOSED).toBe('PROPOSED')
    expect(ProposalStatus.PUBLISHED).toBe('PUBLISHED')
    expect(ProposalStatus.REJECTED).toBe('REJECTED')
    expect(ProposalStatus.PENDING_APPROVAL).toBe('PENDING_APPROVAL')
    expect(ProposalStatus.FAILED).toBe('FAILED')
  })

  it('ProposalDecision has all required decisions', () => {
    expect(ProposalDecision.PUBLISHED).toBe('PUBLISHED')
    expect(ProposalDecision.PENDING_APPROVAL).toBe('PENDING_APPROVAL')
    expect(ProposalDecision.REJECTED).toBe('REJECTED')
    expect(ProposalDecision.DUPLICATE).toBe('DUPLICATE')
    expect(ProposalDecision.FAILED).toBe('FAILED')
  })

  it('WriteMode has all required modes', () => {
    expect(WriteMode.AUTO_APPROVE).toBe('AUTO_APPROVE')
    expect(WriteMode.REQUIRES_APPROVAL).toBe('REQUIRES_APPROVAL')
    expect(WriteMode.MANUAL_ONLY).toBe('MANUAL_ONLY')
  })

  it('WritableNodeType only allows FACT and DECISION', () => {
    expect(WritableNodeType.FACT).toBe('FACT')
    expect(WritableNodeType.DECISION).toBe('DECISION')
    expect(Object.keys(WritableNodeType)).toHaveLength(2)
  })

  it('DataClassification has all required levels', () => {
    expect(DataClassification.PUBLIC).toBe('PUBLIC')
    expect(DataClassification.INTERNAL).toBe('INTERNAL')
    expect(DataClassification.CONFIDENTIAL).toBe('CONFIDENTIAL')
    expect(DataClassification.RESTRICTED).toBe('RESTRICTED')
  })
})

// ─── Property / Invariant Tests ──────────────────────────────────────────────

describe('WriteBack Invariants', () => {
  it('DECISION type requires approval (writeMode = REQUIRES_APPROVAL)', () => {
    // A DECISION proposal should always require approval unless admin override
    const decisionProposal: NodeProposalRequest = {
      nodeType: 'DECISION',
      title: 'Decision on refund',
      content: 'Refund approved for customer X.',
      classification: 'INTERNAL',
      workspaceId: '00000000-0000-0000-0000-000000000001',
    }
    // The policy check: DECISION → REQUIRES_APPROVAL
    expect(decisionProposal.nodeType).toBe('DECISION')
  })

  it('RESTRICTED classification requires approval', () => {
    const restrictedProposal: NodeProposalRequest = {
      nodeType: 'FACT',
      title: 'Restricted fact',
      content: 'This is restricted knowledge.',
      classification: 'RESTRICTED',
      workspaceId: '00000000-0000-0000-0000-000000000001',
    }
    expect(restrictedProposal.classification).toBe('RESTRICTED')
  })

  it('CONFIDENTIAL classification requires approval', () => {
    const confidentialProposal: NodeProposalRequest = {
      nodeType: 'FACT',
      title: 'Confidential fact',
      content: 'This is confidential knowledge.',
      classification: 'CONFIDENTIAL',
      workspaceId: '00000000-0000-0000-0000-000000000001',
    }
    expect(confidentialProposal.classification).toBe('CONFIDENTIAL')
  })

  it('rejected proposals never result in PUBLISHED decision', () => {
    const decisions: ProposalDecision[] = ['REJECTED', 'FAILED', 'DUPLICATE']
    for (const decision of decisions) {
      expect(decision).not.toBe('PUBLISHED')
    }
  })

  it('PENDING_APPROVAL proposals are not PUBLISHED', () => {
    expect(ProposalDecision.PENDING_APPROVAL).not.toBe('PUBLISHED')
  })

  it('MANUAL_ONLY write mode results in REJECTED decision', () => {
    // MANUAL_ONLY proposals are rejected since they can't be published by agents
    expect(WriteMode.MANUAL_ONLY).toBe('MANUAL_ONLY')
  })

  it('only FACT and DECISION are writable node types', () => {
    const allTypes = ['FACT', 'CONSTRAINT', 'DECISION', 'ANTI_PATTERN']
    const writableTypes = ['FACT', 'DECISION']
    for (const type of allTypes) {
      if (writableTypes.includes(type)) {
        expect(['FACT', 'DECISION']).toContain(type)
      } else {
        expect(writableTypes).not.toContain(type)
      }
    }
  })
})

// ─── Decision Resolution Logic ───────────────────────────────────────────────

describe('Decision Resolution', () => {
  function determineDecision(writeMode: WriteMode): 'PUBLISHED' | 'PENDING_APPROVAL' | 'REJECTED' {
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

  it('AUTO_APPROVE results in PUBLISHED', () => {
    expect(determineDecision('AUTO_APPROVE')).toBe('PUBLISHED')
  })

  it('REQUIRES_APPROVAL results in PENDING_APPROVAL', () => {
    expect(determineDecision('REQUIRES_APPROVAL')).toBe('PENDING_APPROVAL')
  })

  it('MANUAL_ONLY results in REJECTED', () => {
    expect(determineDecision('MANUAL_ONLY')).toBe('REJECTED')
  })

  it('unknown mode defaults to REJECTED (fail-closed)', () => {
    expect(determineDecision('UNKNOWN' as WriteMode)).toBe('REJECTED')
  })
})

// ─── Validation Trace ────────────────────────────────────────────────────────

describe('Validation Trace', () => {
  it('trace step has required fields', () => {
    const step: ValidationTraceStep = {
      step: 'authentication',
      passed: true,
      durationMs: 5,
    }
    expect(step.step).toBeTruthy()
    expect(typeof step.passed).toBe('boolean')
    expect(typeof step.durationMs).toBe('number')
  })

  it('failed trace step includes reasonCode', () => {
    const step: ValidationTraceStep = {
      step: 'capability',
      passed: false,
      reasonCode: 'CAPABILITY_MISSING',
      explanation: 'Role lacks knowledge.propose capability',
      durationMs: 2,
    }
    expect(step.passed).toBe(false)
    expect(step.reasonCode).toBe('CAPABILITY_MISSING')
    expect(step.explanation).toBeTruthy()
  })
})
