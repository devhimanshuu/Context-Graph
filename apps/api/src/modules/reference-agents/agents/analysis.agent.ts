/* Analysis Agent — analyzes authorized information from the Research Agent.

Allowed capabilities: context.resolve, graph.read, knowledge.read
Consumes structured ResearchAgent output. Does not receive hidden workflow state. */

import type {
  AnalysisResult,
  AnalysisRisk,
  ReferenceAgentStatus,
  ResearchResult,
} from '@contextgraph/types'

export class AnalysisAgent {
  readonly role = 'analysis' as const

  async execute(researchResult: ResearchResult): Promise<AnalysisResult> {
    const start = performance.now()

    try {
      if (researchResult.status !== 'COMPLETED') {
        return {
          role: 'analysis',
          status: 'SKIPPED' as ReferenceAgentStatus,
          findings: 'Analysis skipped because research did not complete successfully.',
          supportingSources: [],
          risks: [],
          unresolvedQuestions: ['Research phase did not complete — analysis cannot proceed.'],
          recommendedAction: null,
          durationMs: Math.round(performance.now() - start),
          error: 'Research phase failed',
        }
      }

      const findings = this.analyzeFindings(researchResult)
      const risks = this.identifyRisks(researchResult)
      const unresolved = this.findUnresolved(researchResult)
      const recommendedAction = this.recommendAction(risks, researchResult)

      return {
        role: 'analysis',
        status: 'COMPLETED' as ReferenceAgentStatus,
        findings,
        supportingSources: researchResult.sourceNodeIds,
        risks,
        unresolvedQuestions: unresolved,
        recommendedAction,
        durationMs: Math.round(performance.now() - start),
        error: null,
      }
    } catch (error) {
      return {
        role: 'analysis',
        status: 'FAILED' as ReferenceAgentStatus,
        findings: '',
        supportingSources: [],
        risks: [],
        unresolvedQuestions: [],
        recommendedAction: null,
        durationMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Analysis agent failed',
      }
    }
  }

  private analyzeFindings(research: ResearchResult): string {
    const refs = research.contextReferences
    const typeCounts = new Map<string, number>()
    for (const ref of refs) {
      typeCounts.set(ref.type, (typeCounts.get(ref.type) ?? 0) + 1)
    }

    const typeSummary = Array.from(typeCounts.entries())
      .map(([type, count]) => `${count} ${type} nodes`)
      .join(', ')

    const avgDistance =
      refs.length > 0 ? refs.reduce((sum, r) => sum + r.distance, 0) / refs.length : 0

    return (
      `Analyzed ${refs.length} authorized context items (${typeSummary}). ` +
      `Average graph distance: ${avgDistance.toFixed(1)}. ` +
      `Context was permission-filtered and rule-evaluated by ContextGraph.`
    )
  }

  private identifyRisks(research: ResearchResult): AnalysisRisk[] {
    const risks: AnalysisRisk[] = []

    // Check for high-distance items (less directly relevant)
    const distantItems = research.contextReferences.filter((r) => r.distance > 3)
    if (distantItems.length > 0) {
      risks.push({
        category: 'RELEVANCE',
        description: `${distantItems.length} context items are at distance > 3 from entry node`,
        severity: 'LOW',
      })
    }

    // Check for compliance-tagged items
    // (In a real system, we'd check compliance tags from the context)
    if (research.contextItemsCount === 0) {
      risks.push({
        category: 'COVERAGE',
        description: 'No authorized context items found — decision may lack supporting evidence',
        severity: 'HIGH',
      })
    }

    // Check for limited context
    if (research.contextItemsCount < 3 && research.contextItemsCount > 0) {
      risks.push({
        category: 'COVERAGE',
        description: `Only ${research.contextItemsCount} context items available — limited evidence base`,
        severity: 'MEDIUM',
      })
    }

    return risks
  }

  private findUnresolved(research: ResearchResult): string[] {
    const questions: string[] = []

    if (research.contextItemsCount === 0) {
      questions.push(
        'No relevant knowledge found — may need broader search or different entry point',
      )
    }

    if (research.pipelineRunId === null) {
      questions.push('Pipeline run not recorded — audit trail incomplete')
    }

    return questions
  }

  private recommendAction(risks: AnalysisRisk[], research: ResearchResult): string | null {
    const hasHighRisk = risks.some((r) => r.severity === 'HIGH')
    if (hasHighRisk) {
      return 'Proceed with caution — high-risk factors identified. Consider additional research.'
    }

    if (research.contextItemsCount === 0) {
      return 'Insufficient evidence. Do not proceed with action until relevant knowledge is found.'
    }

    return 'Evidence supports proceeding. Recommended to check action authorization before any privileged operation.'
  }
}
