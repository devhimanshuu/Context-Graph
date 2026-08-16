import { describe, expect, it } from 'vitest'
import { NodeStatus, NodeType } from '@contextgraph/types'
import { ContextPackage } from '../contracts/context-pipeline.contracts'
import { CompressionHint } from '../../candidate/domain/compression-hint'
import { ContextFormatter } from './context-formatter.service'

function makePackage(
  candidates: Array<{
    candidateId: string
    title: string
    content: string
    compressionHint: CompressionHint
    rank: number
  }>,
  exclusions: ContextPackage['exclusions'] = [],
): ContextPackage {
  return {
    packageId: 'pkg-1',
    requestId: 'req-1',
    version: 'contextgraph-v1',
    mode: 'DEBUG',
    workspaceId: 'ws-1',
    entryNodeId: candidates[0]?.candidateId ?? 'node-1',
    strategy: 'bfs',
    evaluatedAt: '2026-06-15T12:00:00.000Z',
    generatedAt: '2026-06-15T12:00:01.000Z',
    tokenBudget: 2048,
    tokensUsed: 120,
    truncated: false,
    candidates: candidates.map((candidate, index) => ({
      candidateId: candidate.candidateId,
      title: candidate.title,
      content: candidate.content,
      type: NodeType.FACT,
      status: NodeStatus.ACTIVE,
      importance: 50,
      distance: index === 0 ? 0 : 1,
      derivabilityScore: 40,
      complianceTags: ['INTERNAL'],
      inclusionReason: 'LOCAL_REACHABILITY',
      compressionHint: candidate.compressionHint,
      score: 100 - index,
      rank: candidate.rank,
      tokens: 20,
    })),
    exclusions,
    summary: {
      requestId: 'req-1',
      packageId: 'pkg-1',
      version: 'contextgraph-v1',
      mode: 'DEBUG',
      evaluatedAt: '2026-06-15T12:00:00.000Z',
      funnel: { reachable: 4, authorized: 4, ruleCandidates: 3, included: 3 },
      metrics: {
        totalDurationMs: 10,
        stagesExecuted: 10,
        reachableNodes: 4,
        authorizedNodes: 4,
        injectedNodes: 0,
        ruleCandidates: 3,
        builtCandidates: 3,
        rankedCandidates: 3,
        includedCandidates: 3,
        excludedByRules: 1,
        excludedByBudget: 0,
        excludedByRank: 0,
        ruleEngineDurationMs: 2,
        stageDurationsMs: {},
      },
      trace: [],
    },
  }
}

describe('ContextFormatter', () => {
  const formatter = new ContextFormatter()

  it('renders FULL content verbatim and never truncates it', () => {
    const longContent = 'The complete protocol. '.repeat(200)
    const doc = formatter.format(
      makePackage([
        {
          candidateId: 'node-entry',
          title: 'Entry',
          content: longContent,
          compressionHint: CompressionHint.FULL,
          rank: 1,
        },
      ]),
    )
    expect(doc.sections).toHaveLength(1)
    expect(doc.sections[0]?.body).toBe(longContent.trim())
    expect(doc.sections[0]?.truncated).toBe(false)
    expect(doc.text).toContain('## 1. Entry')
    expect(doc.text).toContain(longContent.trim())
  })

  it('truncates SUMMARY and COMPRESSED content at deterministic boundaries', () => {
    const longContent = 'word '.repeat(500).trim()
    const doc = formatter.format(
      makePackage([
        {
          candidateId: 'node-summary',
          title: 'Summary node',
          content: longContent,
          compressionHint: CompressionHint.SUMMARY,
          rank: 2,
        },
        {
          candidateId: 'node-compressed',
          title: 'Compressed node',
          content: longContent,
          compressionHint: CompressionHint.COMPRESSED,
          rank: 3,
        },
      ]),
    )
    const summary = doc.sections[0]
    const compressed = doc.sections[1]
    expect(summary?.truncated).toBe(true)
    expect(compressed?.truncated).toBe(true)
    expect(summary?.body.endsWith('…')).toBe(true)
    expect(compressed?.body.endsWith('…')).toBe(true)
    expect(summary!.body.length).toBeGreaterThan(compressed!.body.length)
    expect(doc.truncated).toBe(true)
  })

  it('keeps REFERENCE_ONLY content out of context — title + id only', () => {
    const doc = formatter.format(
      makePackage([
        {
          candidateId: 'node-generic',
          title: 'Generic fact',
          content: 'A very long generic passage that should never enter the prompt. '.repeat(50),
          compressionHint: CompressionHint.REFERENCE_ONLY,
          rank: 4,
        },
      ]),
    )
    const section = doc.sections[0]
    expect(section?.truncated).toBe(true)
    expect(section?.body).toContain('Generic fact')
    expect(section?.body).toContain('node-generic')
    expect(section?.body.length).toBeLessThanOrEqual(80)
    expect(doc.text).not.toContain('long generic passage')
  })

  it('renders the exclusions notes block only when requested', () => {
    const exclusions: ContextPackage['exclusions'] = [
      {
        nodeId: 'node-cut',
        included: false,
        finalReasonCode: 'DERIVABLE_CONTENT',
        failingRuleId: 'derivability',
        excludedByBudget: false,
      },
    ]
    const pkg = makePackage(
      [
        {
          candidateId: 'node-entry',
          title: 'Entry',
          content: 'Short',
          compressionHint: CompressionHint.FULL,
          rank: 1,
        },
      ],
      exclusions,
    )
    const plain = formatter.format(pkg)
    expect(plain.text).not.toContain('Excluded')
    const withNotes = formatter.format(pkg, { includeExclusions: true })
    expect(withNotes.text).toContain('Excluded (1)')
    expect(withNotes.text).toContain('node-cut')
    expect(withNotes.text).toContain('DERIVABLE_CONTENT')
  })

  it('is deterministic: identical packages format byte-identically', () => {
    const pkg = makePackage([
      {
        candidateId: 'node-entry',
        title: 'Entry',
        content: 'Full content',
        compressionHint: CompressionHint.FULL,
        rank: 1,
      },
      {
        candidateId: 'node-2',
        title: 'Second',
        content: 'word '.repeat(300).trim(),
        compressionHint: CompressionHint.COMPRESSED,
        rank: 2,
      },
    ])
    const first = formatter.format(pkg, { includeExclusions: true })
    const second = formatter.format(pkg, { includeExclusions: true })
    expect(first.text).toBe(second.text)
    expect(first.sections).toEqual(second.sections)
    expect(first.tokens).toBe(second.tokens)
  })

  it('estimates tokens deterministically and tracks section tokens', () => {
    const pkg = makePackage([
      {
        candidateId: 'node-entry',
        title: 'Entry',
        content: 'A'.repeat(100),
        compressionHint: CompressionHint.FULL,
        rank: 1,
      },
    ])
    const doc = formatter.format(pkg)
    expect(doc.sections[0]?.tokens).toBeGreaterThan(0)
    expect(doc.tokens).toBeGreaterThan(doc.contentTokens)
    expect(doc.tokens).toBe(Math.ceil(doc.text.length / 4))
  })

  it('preserves package order (the pipeline guarantees ranking) and includes the metadata header', () => {
    const doc = formatter.format(
      makePackage([
        {
          candidateId: 'node-3',
          title: 'Third',
          content: 'c',
          compressionHint: CompressionHint.COMPRESSED,
          rank: 3,
        },
        {
          candidateId: 'node-1',
          title: 'First',
          content: 'a',
          compressionHint: CompressionHint.FULL,
          rank: 1,
        },
      ]),
    )
    // Section order mirrors the package's candidate order.
    const headings = doc.text.split('\n').filter((line) => line.startsWith('## '))
    expect(headings).toEqual(['## 3. Third', '## 1. First'])
    expect(doc.sections.map((section) => section.rank)).toEqual([3, 1])
    expect(doc.text).toContain('# ContextGraph Context Package (contextgraph-v1)')
    expect(doc.text).toContain('requestId: req-1')
  })
})
