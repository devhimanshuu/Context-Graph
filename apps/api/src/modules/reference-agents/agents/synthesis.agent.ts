/* Synthesis Agent — combines validated research and analysis into the final response.

Allowed capability: context.resolve where necessary
Must not bypass prior policy decisions.
Uses only authorized outputs from prior agents. */

import type {
  SynthesisResult,
  SynthesisCitation,
  ReferenceAgentStatus,
  ResearchResult,
  AnalysisResult,
  DecisionResult,
} from '@contextgraph/types'

export class SynthesisAgent {
  readonly role = 'synthesis' as const

  async execute(
    research: ResearchResult,
    analysis: AnalysisResult,
    decision: DecisionResult,
    userRequest: string,
  ): Promise<SynthesisResult> {
    const start = performance.now()

    try {
      const citations = this.buildCitations(research)
      const answer = this.buildAnswer(research, analysis, decision, userRequest)
      const decisionSummary = this.buildDecisionSummary(decision)

      return {
        role: 'synthesis',
        status: 'COMPLETED' as ReferenceAgentStatus,
        answer,
        citations,
        decisionSummary,
        contextReferences: research.sourceNodeIds,
        durationMs: Math.round(performance.now() - start),
        error: null,
      }
    } catch (error) {
      return {
        role: 'synthesis',
        status: 'FAILED' as ReferenceAgentStatus,
        answer: '',
        citations: [],
        decisionSummary: '',
        contextReferences: [],
        durationMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Synthesis agent failed',
      }
    }
  }

  private buildCitations(research: ResearchResult): SynthesisCitation[] {
    return research.contextReferences.slice(0, 10).map((ref) => ({
      nodeId: ref.nodeId,
      title: ref.title,
      source: `ContextGraph (distance: ${ref.distance}, type: ${ref.type})`,
    }))
  }

  private buildAnswer(
    research: ResearchResult,
    analysis: AnalysisResult,
    decision: DecisionResult,
    userRequest: string,
  ): string {
    const parts: string[] = []

    parts.push(`## Response to: "${userRequest}"`)
    parts.push('')

    // Research summary
    parts.push('### Research Findings')
    if (research.status === 'COMPLETED') {
      parts.push(research.findings)
      parts.push(
        `\n*Source: ${research.contextItemsCount} authorized context items from ContextGraph*`,
      )
    } else {
      parts.push(
        `Research phase ${research.status.toLowerCase()}: ${research.error ?? 'unknown error'}`,
      )
    }
    parts.push('')

    // Analysis summary
    parts.push('### Analysis')
    if (analysis.status === 'COMPLETED') {
      parts.push(analysis.findings)
      if (analysis.risks.length > 0) {
        parts.push('\n**Identified Risks:**')
        for (const risk of analysis.risks) {
          parts.push(`- [${risk.severity}] ${risk.category}: ${risk.description}`)
        }
      }
      if (analysis.recommendedAction !== null) {
        parts.push(`\n**Recommendation:** ${analysis.recommendedAction}`)
      }
    } else {
      parts.push(`Analysis phase ${analysis.status.toLowerCase()}`)
    }
    parts.push('')

    // Decision summary
    parts.push('### Action Decision')
    if (decision.status === 'COMPLETED' && decision.actionCheck !== null) {
      parts.push(`**Decision:** ${decision.actionCheck.decision}`)
      parts.push(`**Risk Level:** ${decision.actionCheck.riskLevel}`)
      parts.push(`**Explanation:** ${decision.actionCheck.explanation}`)

      if (decision.proposal !== null) {
        parts.push(`\n**Knowledge Proposal:** ${decision.proposal.decision}`)
        if (decision.proposal.nodeId !== null) {
          parts.push(`*Node ID: ${decision.proposal.nodeId}*`)
        }
      }
    } else {
      parts.push(
        `Decision phase ${decision.status.toLowerCase()}: ${decision.error ?? 'unknown error'}`,
      )
    }
    parts.push('')

    // Citations
    if (research.contextReferences.length > 0) {
      parts.push('### Sources')
      for (const ref of research.contextReferences.slice(0, 5)) {
        parts.push(`- [${ref.type}] ${ref.title} (distance: ${ref.distance})`)
      }
    }

    return parts.join('\n')
  }

  private buildDecisionSummary(decision: DecisionResult): string {
    if (decision.status !== 'COMPLETED' || decision.actionCheck === null) {
      return `Decision phase did not complete: ${decision.error ?? 'unknown'}`
    }

    const check = decision.actionCheck
    let summary = `Action "${check.action}" on ${check.targetType}: ${check.decision}`

    if (check.approvalRequired) {
      summary += ' (approval required)'
    }

    if (decision.proposal !== null) {
      summary += ` | Proposal: ${decision.proposal.decision}`
    }

    return summary
  }
}
