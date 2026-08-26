/* Decision Agent — determines whether a proposed operation should be attempted.

Allowed capabilities: context.resolve, action.check, knowledge.read
The Decision Agent MUST call check_action before proposing any privileged action.
It does not execute privileged operations.

KEY SECURITY RULE:
The Decision Agent NEVER trusts agent-supplied authorization.
It calls check_action through ContextGraph, which is the authority. */

import type {
  DecisionResult,
  DecisionActionCheck,
  DecisionProposal,
  ReferenceAgentStatus,
  AnalysisResult,
} from '@contextgraph/types'
import type { AuthenticatedUser } from '@contextgraph/types'

export interface DecisionAgentDeps {
  readonly checkAction: (
    user: AuthenticatedUser,
    input: {
      action: string
      targetType: string
      targetId?: string
      parameters?: Record<string, unknown>
      purpose?: string
    },
  ) => Promise<{
    allowed: boolean
    decision: string
    action: string
    targetType: string
    targetId: string | null
    riskLevel: string
    reasonCode: string | null
    explanation: string
    violatedPolicies: string[]
    approvalRequired: boolean
    approvalReason: string | null
    trace: Array<{
      guardrail: string
      passed: boolean
      reason: string
      severity: string
    }>
  }>

  readonly proposeNode: (
    user: AuthenticatedUser,
    input: {
      nodeType: string
      title: string
      content: string
      classification: string
      workspaceId: string
      purpose?: string
      idempotencyKey?: string
    },
  ) => Promise<{
    proposalId: string
    decision: string
    status: string
    nodeId: string | null
    approvalRequired: boolean
    reasonCode: string | null
    validationTrace: Array<{ step: string; passed: boolean }>
    runId: string | null
  }>
}

export class DecisionAgent {
  readonly role = 'decision' as const

  constructor(private readonly deps: DecisionAgentDeps) {}

  async execute(
    user: AuthenticatedUser,
    analysisResult: AnalysisResult,
    request: {
      action: string
      targetType: string
      workspaceId: string
      title?: string
      content?: string
    },
  ): Promise<DecisionResult> {
    const start = performance.now()

    try {
      if (analysisResult.status !== 'COMPLETED') {
        return this.failedResult('Analysis did not complete successfully', start)
      }

      if (analysisResult.recommendedAction === null) {
        return this.failedResult('No recommendation from analysis phase', start)
      }

      // Step 1: Call check_action through ContextGraph (mandatory)
      const actionCheck = await this.deps.checkAction(user, {
        action: request.action,
        targetType: request.targetType,
        purpose: `Decision agent evaluating: ${analysisResult.recommendedAction}`,
      })

      // Step 2: Build the action check result
      const decisionCheck: DecisionActionCheck = {
        action: actionCheck.action,
        targetType: actionCheck.targetType,
        decision: actionCheck.decision as DecisionActionCheck['decision'],
        riskLevel: actionCheck.riskLevel,
        reasonCode: actionCheck.reasonCode,
        explanation: actionCheck.explanation,
        approvalRequired: actionCheck.approvalRequired,
        trace: actionCheck.trace.map((t) => ({
          guardrail: t.guardrail,
          passed: t.passed,
          reason: t.reason,
        })),
      }

      // Step 3: If ALLOWED and write-back is appropriate, propose the node
      let proposal: DecisionProposal | null = null
      if (
        actionCheck.allowed &&
        request.action.includes('PUBLISH') &&
        request.title !== undefined &&
        request.content !== undefined
      ) {
        try {
          const proposalResult = await this.deps.proposeNode(user, {
            nodeType: 'DECISION',
            title: request.title,
            content: request.content,
            classification: 'INTERNAL',
            workspaceId: request.workspaceId,
            purpose: 'Reference agent governed knowledge proposal',
            idempotencyKey: `ref-agent-${Date.now()}`,
          })

          proposal = {
            proposalId: proposalResult.proposalId,
            decision: proposalResult.decision as DecisionProposal['decision'],
            nodeId: proposalResult.nodeId,
            validationTrace: proposalResult.validationTrace,
          }
        } catch {
          proposal = {
            proposalId: null,
            decision: 'FAILED',
            nodeId: null,
            validationTrace: [],
          }
        }
      }

      const totalDuration = Math.round(performance.now() - start)

      return {
        role: 'decision',
        status: 'COMPLETED' as ReferenceAgentStatus,
        proposedAction: request.action,
        actionCheck: decisionCheck,
        proposal,
        reasonCode: actionCheck.reasonCode ?? actionCheck.decision,
        explanation: actionCheck.explanation,
        supportingSources: analysisResult.supportingSources,
        durationMs: totalDuration,
        error: null,
      }
    } catch (error) {
      return this.failedResult(
        error instanceof Error ? error.message : 'Decision agent failed',
        start,
      )
    }
  }

  private failedResult(errorMessage: string, start: number): DecisionResult {
    return {
      role: 'decision',
      status: 'FAILED' as ReferenceAgentStatus,
      proposedAction: null,
      actionCheck: null,
      proposal: null,
      reasonCode: 'AGENT_FAILED',
      explanation: errorMessage,
      supportingSources: [],
      durationMs: Math.round(performance.now() - start),
      error: errorMessage,
    }
  }
}
