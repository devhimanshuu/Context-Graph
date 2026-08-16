import { describe, expect, it } from 'vitest'
import { NodeType } from '@contextgraph/types'
import { InclusionReason } from '../../rule-engine/domain/inclusion-reason'
import { DEFAULT_CANDIDATE_RANKING_CONFIG } from '../candidate.config'
import { CompressionHint } from '../domain/compression-hint'
import type { CandidateNode } from '../domain/candidate-node'
import { CandidateRankingException } from '../errors/candidate-errors'
import { DeterministicCandidateRanker } from './candidate-ranker.service'

const EVALUATED_AT = '2026-06-15T12:00:00.000Z'
const ORG_ID = 'org-a'
const WS_ID = 'ws-1'

function makeCandidate(id: string, overrides: Partial<CandidateNode> = {}): CandidateNode {
  return {
    nodeId: id,
    workspaceId: WS_ID,
    organizationId: ORG_ID,
    departmentId: 'dept-1',
    title: `Node ${id}`,
    type: NodeType.FACT,
    status: 'ACTIVE',
    importance: 50,
    distance: 1,
    derivabilityScore: 40,
    complianceTags: [],
    validTo: null,
    inclusionReason: InclusionReason.LOCAL_REACHABILITY,
    compressionHint: CompressionHint.COMPRESSED,
    metadata: {},
    ...overrides,
  }
}

const LOGGER = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

function ranker() {
  return new DeterministicCandidateRanker(LOGGER)
}

describe('DeterministicCandidateRanker', () => {
  it('computes the documented weighted score', async () => {
    const result = await ranker().rank({
      candidates: [makeCandidate('n1', { importance: 50, derivabilityScore: 40, distance: 1 })],
      entryNodeId: 'n1',
      config: DEFAULT_CANDIDATE_RANKING_CONFIG,
      evaluatedAt: EVALUATED_AT,
    })

    // importance 50 + specificity 60 + freshness 50 + relevance 64
    // - derivability 20 - distance 2 = 202
    expect(result.candidates[0]?.score).toBe(202)
    expect(result.candidates[0]?.rank).toBe(1)
  })

  it('ranks the entry node first regardless of score', async () => {
    const result = await ranker().rank({
      candidates: [
        makeCandidate('low', { importance: 95, distance: 2 }),
        makeCandidate('entry', { importance: 1, distance: 0 }),
      ],
      entryNodeId: 'entry',
      config: DEFAULT_CANDIDATE_RANKING_CONFIG,
      evaluatedAt: EVALUATED_AT,
    })
    expect(result.candidates.map((candidate) => candidate.nodeId)).toEqual(['entry', 'low'])
    expect(result.candidates[1]?.score).toBeGreaterThan(result.candidates[0]?.score ?? 0)
  })

  it('orders by score descending, then importance, then distance', async () => {
    const result = await ranker().rank({
      candidates: [
        makeCandidate('far', { importance: 90, distance: 4 }),
        makeCandidate('high-importance', { importance: 70, distance: 1 }),
        makeCandidate('best', { importance: 80, distance: 1 }),
      ],
      entryNodeId: 'entry-missing',
      config: DEFAULT_CANDIDATE_RANKING_CONFIG,
      evaluatedAt: EVALUATED_AT,
    })
    const ranked = result.candidates.map((candidate) => candidate.nodeId)
    expect(ranked[0]).toBe('best')
    expect(ranked[1]).toBe('high-importance')
    expect(ranked[2]).toBe('far')
  })

  it('breaks exact ties by node id ascending', async () => {
    const result = await ranker().rank({
      candidates: [
        makeCandidate('node-b', { importance: 50, derivabilityScore: 40, distance: 1 }),
        makeCandidate('node-a', { importance: 50, derivabilityScore: 40, distance: 1 }),
        makeCandidate('node-c', { importance: 50, derivabilityScore: 40, distance: 1 }),
      ],
      entryNodeId: 'missing',
      config: DEFAULT_CANDIDATE_RANKING_CONFIG,
      evaluatedAt: EVALUATED_AT,
    })
    expect(result.candidates.map((candidate) => candidate.nodeId)).toEqual([
      'node-a',
      'node-b',
      'node-c',
    ])
  })

  it('caps the result at maxCandidates and reports truncation', async () => {
    const candidates = Array.from({ length: 5 }, (_, index) =>
      makeCandidate(`n-${index}`, { importance: 90 - index, distance: 1 }),
    )
    const result = await ranker().rank({
      candidates,
      entryNodeId: 'missing',
      config: { ...DEFAULT_CANDIDATE_RANKING_CONFIG, maxCandidates: 2 },
      evaluatedAt: EVALUATED_AT,
    })
    expect(result.candidates).toHaveLength(2)
    expect(result.truncated).toBe(true)
    expect(result.candidates.map((candidate) => candidate.rank)).toEqual([1, 2])
    // The strongest two survive.
    expect(result.candidates.map((candidate) => candidate.nodeId)).toEqual(['n-0', 'n-1'])
  })

  it('ranks expiring content lower (freshness signal)', async () => {
    const result = await ranker().rank({
      candidates: [
        makeCandidate('expiring', {
          validTo: '2026-06-01T00:00:00.000Z', // before evaluatedAt -> freshness 0
        }),
        makeCandidate('evergreen', { validTo: null }), // freshness 100
      ],
      entryNodeId: 'missing',
      config: DEFAULT_CANDIDATE_RANKING_CONFIG,
      evaluatedAt: EVALUATED_AT,
    })
    expect(result.candidates.map((candidate) => candidate.nodeId)).toEqual([
      'evergreen',
      'expiring',
    ])
  })

  it('is deterministic for identical inputs', async () => {
    const candidates = [
      makeCandidate('a', { importance: 90 }),
      makeCandidate('b', { importance: 10, distance: 3 }),
      makeCandidate('c', { importance: 55, derivabilityScore: 80 }),
    ]
    const first = await ranker().rank({
      candidates,
      entryNodeId: 'c',
      config: DEFAULT_CANDIDATE_RANKING_CONFIG,
      evaluatedAt: EVALUATED_AT,
    })
    const second = await ranker().rank({
      candidates,
      entryNodeId: 'c',
      config: DEFAULT_CANDIDATE_RANKING_CONFIG,
      evaluatedAt: EVALUATED_AT,
    })
    expect(first.candidates).toEqual(second.candidates)
  })

  it('rejects invalid ranking configurations loudly', async () => {
    await expect(
      ranker().rank({
        candidates: [makeCandidate('a')],
        entryNodeId: 'missing',
        config: {
          ...DEFAULT_CANDIDATE_RANKING_CONFIG,
          weights: { ...DEFAULT_CANDIDATE_RANKING_CONFIG.weights, importance: -1 },
        },
        evaluatedAt: EVALUATED_AT,
      }),
    ).rejects.toBeInstanceOf(CandidateRankingException)
  })
})
