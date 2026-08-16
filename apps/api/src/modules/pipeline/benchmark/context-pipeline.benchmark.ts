/**
 * Context pipeline benchmark.
 *
 * Proves the pure pipeline core's performance property: candidate build +
 * deterministic ranking + token budgeting are in-memory passes (O(V log V)
 * for the ranking sort, zero database access), so tens of thousands of
 * rule-passing candidates are assembled in milliseconds.
 *
 * Run: npm run bench:pipeline (from apps/api)
 */
import { NodeStatus, NodeType } from '@contextgraph/types'
import { InclusionReason } from '../../rule-engine/domain/inclusion-reason'
import type { RuleCandidateNode } from '../../rule-engine/domain/candidate-node'
import { CandidateBuilder } from '../../candidate/services/candidate-builder.service'
import { DeterministicCandidateRanker } from '../../candidate/services/candidate-ranker.service'
import { DEFAULT_CANDIDATE_RANKING_CONFIG } from '../../candidate/candidate.config'
import { TokenContextBudget } from '../budget/context-budget'
import { estimateTokens, NODE_TOKEN_OVERHEAD } from '../context-assembly/context-token-budget'

interface BenchmarkRow {
  nodes: number
  buildMs: number
  rankMs: number
  budgetMs: number
  totalMs: number
  selected: number
}

const SIZES = [100, 1_000, 10_000, 100_000] as const
const EVALUATED_AT = '2026-06-15T12:00:00.000Z'
const ORG_ID = 'org-a'
const WS_ID = 'ws-1'

const LOGGER = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

/** Rule-passing candidates with realistic variety in every signal. */
function makeCandidates(count: number): RuleCandidateNode[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `n-${index}`,
    organizationId: ORG_ID,
    workspaceId: WS_ID,
    departmentId: 'dept-1',
    title: `Knowledge node ${index}`,
    type: index % 4 === 0 ? NodeType.CONSTRAINT : NodeType.FACT,
    status: NodeStatus.ACTIVE,
    importance: 20 + (index % 80),
    derivabilityScore: 10 + ((index * 7) % 90),
    complianceTags: [],
    validFrom: null,
    validTo: index % 5 === 0 ? '2026-12-31T00:00:00.000Z' : null,
    ownerId: 'user-1',
    inclusionReason:
      index === 0 ? InclusionReason.EXPLICIT_CONTEXT : InclusionReason.LOCAL_REACHABILITY,
    distance: index % 6,
    metadata: {},
  }))
}

async function run(): Promise<void> {
  const builder = new CandidateBuilder(LOGGER)
  const ranker = new DeterministicCandidateRanker(LOGGER)
  const budget = new TokenContextBudget()
  const rows: BenchmarkRow[] = []

  for (const size of SIZES) {
    const nodes = makeCandidates(size)
    const entryNodeId = nodes[0]?.id ?? 'n-0'

    const buildStarted = performance.now()
    const built = await builder.build({
      workspaceId: WS_ID,
      entryNodeId,
      nodes,
      evaluatedAt: EVALUATED_AT,
    })
    const buildMs = performance.now() - buildStarted

    const rankStarted = performance.now()
    const ranked = await ranker.rank({
      candidates: built.candidates,
      entryNodeId,
      config: { ...DEFAULT_CANDIDATE_RANKING_CONFIG, maxCandidates: 100 },
      evaluatedAt: EVALUATED_AT,
    })
    const rankMs = performance.now() - rankStarted

    const items = ranked.candidates.map((candidate) => ({
      id: candidate.nodeId,
      importance: candidate.importance,
      distance: candidate.distance,
      tokens:
        estimateTokens(candidate.title) +
        estimateTokens(`Content of ${candidate.nodeId}`) +
        NODE_TOKEN_OVERHEAD,
    }))
    const budgetStarted = performance.now()
    const fitted = await budget.apply(items, 4096, entryNodeId)
    const budgetMs = performance.now() - budgetStarted

    const totalMs = buildMs + rankMs + budgetMs
    rows.push({
      nodes: size,
      buildMs: Number(buildMs.toFixed(2)),
      rankMs: Number(rankMs.toFixed(2)),
      budgetMs: Number(budgetMs.toFixed(2)),
      totalMs: Number(totalMs.toFixed(2)),
      selected: fitted.includedIds.length,
    })
    process.stdout.write(
      `nodes=${size} selected=${fitted.includedIds.length} build=${buildMs.toFixed(2)}ms ` +
        `rank=${rankMs.toFixed(2)}ms budget=${budgetMs.toFixed(2)}ms total=${totalMs.toFixed(2)}ms\n`,
    )
  }

  const largest = rows[rows.length - 1]
  if (largest !== undefined) {
    process.stdout.write(
      `\nsummary: ${largest.nodes.toLocaleString('en-US')} candidates in ${largest.totalMs}ms ` +
        `(~${Math.round((largest.nodes / Math.max(largest.totalMs, 0.001)) * 1000).toLocaleString('en-US')} nodes/s, ` +
        `pure in-memory, zero database access)\n`,
    )
  }
}

void run()
