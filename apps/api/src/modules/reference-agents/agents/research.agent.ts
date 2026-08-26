/* Research Agent — finds relevant organizational knowledge through ContextGraph.

Allowed capabilities: context.resolve, graph.read, knowledge.read
Must NOT: publish knowledge, perform privileged actions, change policies.

The Research Agent is a thin adapter over the existing Context Pipeline.
It does NOT contain retrieval logic — ContextGraph provides governed context. */

import type {
  ResearchResult,
  ResearchContextReference,
  ReferenceAgentStatus,
} from '@contextgraph/types'
import type { AuthenticatedUser } from '@contextgraph/types'

export interface ResearchAgentDeps {
  readonly resolveContext: (
    user: AuthenticatedUser,
    input: {
      query: string
      workspaceId: string
      entryNodeId?: string
      maxDepth?: number
      strategy?: 'bfs' | 'weighted'
      tokenBudget?: number
      maxCandidates?: number
      mode?: 'STANDARD' | 'DEBUG' | 'AUDIT'
    },
  ) => Promise<{
    candidates: Array<{
      candidateId: string
      title: string
      content: string
      type: string
      status: string
      distance: number
      score: number | null
      inclusionReason: string
      tokens: number
    }>
    requestId: string
    tokensUsed: number
    summary: {
      funnel: { reachable: number; authorized: number; ruleCandidates: number; included: number }
      metrics: { totalDurationMs: number }
    }
  }>
}

export class ResearchAgent {
  readonly role = 'research' as const

  constructor(private readonly deps: ResearchAgentDeps) {}

  async execute(
    user: AuthenticatedUser,
    request: { query: string; workspaceId: string; entryNodeId?: string },
  ): Promise<ResearchResult> {
    const start = performance.now()

    try {
      const result = await this.deps.resolveContext(user, {
        query: request.query,
        workspaceId: request.workspaceId,
        entryNodeId: request.entryNodeId,
        maxDepth: 5,
        strategy: 'bfs',
        tokenBudget: 4096,
        maxCandidates: 20,
        mode: 'STANDARD',
      })

      const contextReferences: ResearchContextReference[] = result.candidates.map((c) => ({
        nodeId: c.candidateId,
        title: c.title,
        type: c.type,
        distance: c.distance,
        score: c.score,
        inclusionReason: c.inclusionReason,
      }))

      const findings = this.summarizeFindings(result.candidates)

      return {
        role: 'research',
        status: 'COMPLETED' as ReferenceAgentStatus,
        findings,
        contextReferences,
        sourceNodeIds: result.candidates.map((c) => c.candidateId),
        pipelineRunId: result.requestId,
        contextItemsCount: result.candidates.length,
        tokensUsed: result.tokensUsed,
        durationMs: Math.round(performance.now() - start),
        error: null,
      }
    } catch (error) {
      return {
        role: 'research',
        status: 'FAILED' as ReferenceAgentStatus,
        findings: '',
        contextReferences: [],
        sourceNodeIds: [],
        pipelineRunId: null,
        contextItemsCount: 0,
        tokensUsed: 0,
        durationMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Research agent failed',
      }
    }
  }

  private summarizeFindings(
    candidates: Array<{ title: string; type: string; content: string; distance: number }>,
  ): string {
    if (candidates.length === 0) {
      return 'No relevant organizational knowledge found for the given query.'
    }

    const topItems = candidates.slice(0, 5)
    const summary = topItems
      .map((c, i) => `${i + 1}. [${c.type}] ${c.title} (distance: ${c.distance})`)
      .join('\n')

    return `Found ${candidates.length} authorized context items. Top findings:\n${summary}`
  }
}
