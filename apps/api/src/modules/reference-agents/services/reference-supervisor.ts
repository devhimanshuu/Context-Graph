/* Reference Supervisor — coordinates the 4 reference agents in deterministic order.

The supervisor controls:
- execution order
- passing structured outputs
- failure handling
- timeout
- final aggregation

The supervisor MUST NOT decide:
- authorization
- permissions
- compliance
- policy
- action safety

Those remain ContextGraph responsibilities. */

import type {
  ReferenceRunResult,
  ReferenceAgentTraceStep,
  ReferenceAgentRole,
  ResearchResult,
  AnalysisResult,
  DecisionResult,
  SynthesisResult,
} from '@contextgraph/types'
import type { Role, PermissionLevel, ComplianceClearance } from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import { ResearchAgent } from '../agents/research.agent'
import { AnalysisAgent } from '../agents/analysis.agent'
import { DecisionAgent } from '../agents/decision.agent'
import { SynthesisAgent } from '../agents/synthesis.agent'

export interface SupervisorConfig {
  readonly totalTimeoutMs: number
  readonly perAgentTimeoutMs: number
}

const DEFAULT_CONFIG: SupervisorConfig = {
  totalTimeoutMs: 60_000,
  perAgentTimeoutMs: 30_000,
}

export interface SupervisorUser {
  readonly id: string
  readonly organizationId: string
  readonly departmentId: string | null
  readonly email: string
  readonly name: string
  readonly role: string
  readonly permissionLevel: string
  readonly complianceClearance: string
}

export class ReferenceSupervisor {
  private readonly researchAgent: ResearchAgent
  private readonly analysisAgent: AnalysisAgent
  private readonly decisionAgent: DecisionAgent
  private readonly synthesisAgent: SynthesisAgent
  private readonly config: SupervisorConfig

  constructor(
    researchDeps: Parameters<ResearchAgent['execute']>[1] extends infer _
      ? ConstructorParameters<typeof ResearchAgent>[0]
      : never,
    decisionDeps: ConstructorParameters<typeof DecisionAgent>[0],
    config: Partial<SupervisorConfig> = {},
  ) {
    this.researchAgent = new ResearchAgent(researchDeps)
    this.analysisAgent = new AnalysisAgent()
    this.decisionAgent = new DecisionAgent(decisionDeps)
    this.synthesisAgent = new SynthesisAgent()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  async execute(
    user: SupervisorUser,
    request: {
      query: string
      workspaceId: string
      action: string
      targetType: string
      title?: string
      content?: string
      entryNodeId?: string
    },
  ): Promise<ReferenceRunResult> {
    const runId = uuid()
    const startedAt = new Date().toISOString()
    const trace: ReferenceAgentTraceStep[] = []
    const startTime = performance.now()

    let research: ResearchResult | null = null
    let analysis: AnalysisResult | null = null
    let decision: DecisionResult | null = null
    let synthesis: SynthesisResult | null = null

    const authUser = {
      id: user.id,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      permissionLevel: user.permissionLevel as PermissionLevel,
      complianceClearance: user.complianceClearance as ComplianceClearance,
    }

    // ── Step 1: Research ──────────────────────────────────────────────
    if (this.hasTimeRemaining(startTime)) {
      research = await this.runWithTimeout(
        () =>
          this.researchAgent.execute(authUser, {
            query: request.query,
            workspaceId: request.workspaceId,
            entryNodeId: request.entryNodeId,
          }),
        'research',
        trace,
      )
    } else {
      research = this.timeoutResult('research', startTime) as ResearchResult
    }

    // ── Step 2: Analysis ─────────────────────────────────────────────
    if (research !== null && this.hasTimeRemaining(startTime)) {
      analysis = await this.runWithTimeout(
        () => this.analysisAgent.execute(research!),
        'analysis',
        trace,
      )
    } else {
      analysis = this.timeoutResult('analysis', startTime) as AnalysisResult
    }

    // ── Step 3: Decision ─────────────────────────────────────────────
    if (analysis !== null && this.hasTimeRemaining(startTime)) {
      decision = await this.runWithTimeout(
        () =>
          this.decisionAgent.execute(authUser, analysis!, {
            action: request.action,
            targetType: request.targetType,
            workspaceId: request.workspaceId,
            title: request.title,
            content: request.content,
          }),
        'decision',
        trace,
      )
    } else {
      decision = this.timeoutResult('decision', startTime) as DecisionResult
    }

    // ── Step 4: Synthesis ────────────────────────────────────────────
    if (this.hasTimeRemaining(startTime)) {
      synthesis = await this.runWithTimeout(
        () =>
          this.synthesisAgent.execute(
            research ?? this.emptyResearch(startTime),
            analysis ?? this.emptyAnalysis(startTime),
            decision ?? this.emptyDecision(startTime),
            request.query,
          ),
        'synthesis',
        trace,
      )
    } else {
      synthesis = this.timeoutResult('synthesis', startTime) as SynthesisResult
    }

    const totalDurationMs = Math.round(performance.now() - startTime)
    const allCompleted = [research, analysis, decision, synthesis].every(
      (r) => r !== null && r.status === 'COMPLETED',
    )

    return {
      runId,
      userRequest: request.query,
      status: allCompleted ? 'COMPLETED' : this.determineStatus(trace),
      trace,
      research,
      analysis,
      decision,
      synthesis,
      totalDurationMs,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }

  private async runWithTimeout<T>(
    fn: () => Promise<T>,
    agentName: string,
    trace: ReferenceAgentTraceStep[],
  ): Promise<T> {
    const start = performance.now()
    try {
      const result = await Promise.race([
        fn(),
        this.timeoutPromise<T>(this.config.perAgentTimeoutMs),
      ])
      const durationMs = Math.round(performance.now() - start)

      trace.push({
        agent: agentName as ReferenceAgentRole,
        status: 'COMPLETED',
        toolCalls: [],
        durationMs,
        summary: `${agentName} completed in ${durationMs}ms`,
        error: null,
      })

      return result
    } catch (error) {
      const durationMs = Math.round(performance.now() - start)
      const errorMsg = error instanceof Error ? error.message : `${agentName} failed`

      trace.push({
        agent: agentName as ReferenceAgentRole,
        status: 'FAILED',
        toolCalls: [],
        durationMs,
        summary: `${agentName} failed: ${errorMsg}`,
        error: errorMsg,
      })

      throw error
    }
  }

  private timeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    })
  }

  private hasTimeRemaining(startTime: number): boolean {
    return performance.now() - startTime < this.config.totalTimeoutMs
  }

  private timeoutResult(
    agentName: ReferenceAgentRole,
    startTime: number,
  ): ResearchResult | AnalysisResult | DecisionResult | SynthesisResult {
    switch (agentName) {
      case 'research':
        return this.researchTimeout(startTime)
      case 'analysis':
        return this.analysisTimeout(startTime)
      case 'decision':
        return this.decisionTimeout(startTime)
      default:
        return this.synthesisTimeout(startTime)
    }
  }

  private researchTimeout(startTime: number): ResearchResult {
    return {
      role: 'research',
      status: 'FAILED',
      findings: '',
      contextReferences: [],
      sourceNodeIds: [],
      pipelineRunId: null,
      contextItemsCount: 0,
      tokensUsed: 0,
      durationMs: Math.round(performance.now() - startTime),
      error: `Agent timed out — supervisor budget exhausted`,
    }
  }

  private analysisTimeout(startTime: number): AnalysisResult {
    return {
      role: 'analysis',
      status: 'FAILED',
      findings: '',
      supportingSources: [],
      risks: [],
      unresolvedQuestions: [],
      recommendedAction: null,
      durationMs: Math.round(performance.now() - startTime),
      error: `Agent timed out — supervisor budget exhausted`,
    }
  }

  private decisionTimeout(startTime: number): DecisionResult {
    return {
      role: 'decision',
      status: 'FAILED',
      proposedAction: null,
      actionCheck: null,
      proposal: null,
      reasonCode: 'TIMEOUT',
      explanation: 'Agent timed out — supervisor budget exhausted',
      supportingSources: [],
      durationMs: Math.round(performance.now() - startTime),
      error: `Agent timed out — supervisor budget exhausted`,
    }
  }

  private synthesisTimeout(startTime: number): SynthesisResult {
    return {
      role: 'synthesis',
      status: 'FAILED',
      answer: '',
      citations: [],
      decisionSummary: '',
      contextReferences: [],
      durationMs: Math.round(performance.now() - startTime),
      error: `Agent timed out — supervisor budget exhausted`,
    }
  }

  private determineStatus(trace: ReferenceAgentTraceStep[]): 'COMPLETED' | 'FAILED' | 'TIMED_OUT' {
    if (trace.some((t) => (t.status as string) === 'TIMED_OUT')) return 'TIMED_OUT'
    if (trace.some((t) => t.status === 'FAILED')) return 'FAILED'
    return 'COMPLETED'
  }

  private emptyResearch(startTime: number): ResearchResult {
    return {
      role: 'research',
      status: 'SKIPPED',
      findings: '',
      contextReferences: [],
      sourceNodeIds: [],
      pipelineRunId: null,
      contextItemsCount: 0,
      tokensUsed: 0,
      durationMs: Math.round(performance.now() - startTime),
      error: 'Skipped due to prior failure',
    }
  }

  private emptyAnalysis(startTime: number): AnalysisResult {
    return {
      role: 'analysis',
      status: 'SKIPPED',
      findings: '',
      supportingSources: [],
      risks: [],
      unresolvedQuestions: [],
      recommendedAction: null,
      durationMs: Math.round(performance.now() - startTime),
      error: 'Skipped due to prior failure',
    }
  }

  private emptyDecision(startTime: number): DecisionResult {
    return {
      role: 'decision',
      status: 'SKIPPED',
      proposedAction: null,
      actionCheck: null,
      proposal: null,
      reasonCode: 'SKIPPED',
      explanation: 'Skipped due to prior failure',
      supportingSources: [],
      durationMs: Math.round(performance.now() - startTime),
      error: 'Skipped due to prior failure',
    }
  }
}
