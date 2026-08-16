import { describe, expect, it } from 'vitest'
import { NodeType } from '@contextgraph/types'
import { InclusionReason } from '../../rule-engine/domain/inclusion-reason'
import {
  EVALUATED_AT,
  makeNode,
  WORKSPACE_ID,
} from '../../rule-engine/testing/rule-engine-fixtures'
import { CompressionHint } from '../domain/compression-hint'
import { CandidateBuilder } from './candidate-builder.service'

const ENTRY_ID = 'node-1'

describe('CandidateBuilder', () => {
  it('maps rule candidates to candidates with deterministic compression hints', async () => {
    const builder = new CandidateBuilder({
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    })

    const result = await builder.build({
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      evaluatedAt: EVALUATED_AT,
      nodes: [
        // Entry node -> FULL.
        makeNode({ id: 'node-1', distance: 0 }),
        // Generic knowledge -> REFERENCE_ONLY.
        makeNode({ id: 'node-2', distance: 1, derivabilityScore: 92 }),
        // Context-far -> COMPRESSED.
        makeNode({ id: 'node-3', distance: 4, derivabilityScore: 20 }),
        // High-importance nearby -> SUMMARY.
        makeNode({ id: 'node-4', distance: 1, importance: 85, derivabilityScore: 20 }),
        // Default -> COMPRESSED.
        makeNode({ id: 'node-5', distance: 2, importance: 40, derivabilityScore: 40 }),
      ],
    })

    expect(result.candidates.map((candidate) => candidate.nodeId)).toEqual([
      'node-1',
      'node-2',
      'node-3',
      'node-4',
      'node-5',
    ])
    const hintById = new Map(
      result.candidates.map((candidate) => [candidate.nodeId, candidate.compressionHint]),
    )
    expect(hintById.get('node-1')).toBe(CompressionHint.FULL)
    expect(hintById.get('node-2')).toBe(CompressionHint.REFERENCE_ONLY)
    expect(hintById.get('node-3')).toBe(CompressionHint.COMPRESSED)
    expect(hintById.get('node-4')).toBe(CompressionHint.SUMMARY)
    expect(hintById.get('node-5')).toBe(CompressionHint.COMPRESSED)
  })

  it('gives explicitly requested nodes the FULL hint even at distance', async () => {
    const builder = new CandidateBuilder({
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    })
    const result = await builder.build({
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      evaluatedAt: EVALUATED_AT,
      nodes: [
        makeNode({
          id: 'node-x',
          distance: 3,
          inclusionReason: InclusionReason.EXPLICIT_CONTEXT,
        }),
      ],
    })
    expect(result.candidates[0]?.compressionHint).toBe(CompressionHint.FULL)
  })

  it('deduplicates node ids (first occurrence wins) and preserves order', async () => {
    const builder = new CandidateBuilder({
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    })
    const result = await builder.build({
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      evaluatedAt: EVALUATED_AT,
      nodes: [
        makeNode({ id: 'node-1', importance: 10, type: NodeType.FACT }),
        makeNode({ id: 'node-1', importance: 99, type: NodeType.DECISION }),
        makeNode({ id: 'node-2', importance: 50 }),
      ],
    })
    expect(result.candidates).toHaveLength(2)
    expect(result.candidates[0]?.nodeId).toBe('node-1')
    expect(result.candidates[0]?.importance).toBe(10)
    expect(result.candidates[1]?.nodeId).toBe('node-2')
  })

  it('produces an empty set from empty input without error', async () => {
    const builder = new CandidateBuilder({
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    })
    const result = await builder.build({
      workspaceId: WORKSPACE_ID,
      entryNodeId: ENTRY_ID,
      evaluatedAt: EVALUATED_AT,
      nodes: [],
    })
    expect(result.candidates).toEqual([])
  })
})
