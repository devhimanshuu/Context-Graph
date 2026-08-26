/* Agent Registry Service — creates reference supervisors with proper ContextGraph dependencies.

Each supervisor gets agents with:
- own AgentIdentity
- own capabilities
- own policy constraints
- proper MCP/API integration

The registry ensures each agent uses ContextGraph, not direct DB access. */

import { Inject, Injectable } from '@nestjs/common'
import type {
  GuardrailResult,
  WritableNodeType,
  DataClassification,
  ValidationTraceStep,
} from '@contextgraph/types'
import type { McpSession } from '@contextgraph/types'
import { ReferenceSupervisor } from './reference-supervisor'
import { IContextPipelineOrchestrator } from '../../pipeline/orchestrator/context-pipeline-orchestrator'
import { ActionGuardrailService } from '../../guardrails/services/action-guardrail.service'
import { IWriteBackService } from '../../writeback/domain/writeback.interfaces'

/** Configuration for a reference agent's identity and capabilities. */
export interface AgentIdentityConfig {
  readonly id: string
  readonly name: string
  readonly organizationId: string
  readonly capabilities: readonly string[]
}

/** Pre-configured agent identities for the reference system. */
const AGENT_IDENTITIES: Record<string, AgentIdentityConfig> = {
  research: {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'research-agent',
    organizationId: '00000000-0000-0000-0000-000000000001',
    capabilities: ['context.resolve', 'graph.read', 'knowledge.read'],
  },
  analysis: {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'analysis-agent',
    organizationId: '00000000-0000-0000-0000-000000000001',
    capabilities: ['context.resolve', 'graph.read', 'knowledge.read'],
  },
  decision: {
    id: '00000000-0000-0000-0000-000000000012',
    name: 'decision-agent',
    organizationId: '00000000-0000-0000-0000-000000000001',
    capabilities: ['context.resolve', 'action.check', 'knowledge.read', 'knowledge.propose'],
  },
  synthesis: {
    id: '00000000-0000-0000-0000-000000000013',
    name: 'synthesis-agent',
    organizationId: '00000000-0000-0000-0000-000000000001',
    capabilities: ['context.resolve'],
  },
}

@Injectable()
export class AgentIdentityProvider {
  getIdentity(role: string): AgentIdentityConfig | undefined {
    return AGENT_IDENTITIES[role]
  }

  getAllIdentities(): AgentIdentityConfig[] {
    return Object.values(AGENT_IDENTITIES)
  }
}

@Injectable()
export class ReferenceAgentRegistryService {
  constructor(
    @Inject(IContextPipelineOrchestrator)
    private readonly orchestrator: IContextPipelineOrchestrator,
    private readonly guardrailService: ActionGuardrailService,
    @Inject(IWriteBackService)
    private readonly writeBackService: IWriteBackService,
    private readonly identityProvider: AgentIdentityProvider,
  ) {}

  createSupervisor(_organizationId: string): ReferenceSupervisor {
    return new ReferenceSupervisor(
      // Research agent deps — uses the Context Pipeline
      {
        resolveContext: async (user, input) => {
          const pkg = await this.orchestrator.resolve(user, {
            workspaceId: input.workspaceId,
            entryNodeId: input.entryNodeId ?? input.workspaceId,
            maxDepth: input.maxDepth ?? 5,
            strategy: input.strategy ?? 'bfs',
            tokenBudget: input.tokenBudget ?? 4096,
            maxCandidates: input.maxCandidates ?? 20,
            mode: (input.mode as 'STANDARD' | 'DEBUG' | 'AUDIT') ?? 'STANDARD',
          })

          return {
            candidates: pkg.candidates.map((c) => ({
              candidateId: c.candidateId,
              title: c.title,
              content: c.content,
              type: c.type,
              status: c.status,
              distance: c.distance,
              score: c.score,
              inclusionReason: String(c.inclusionReason),
              tokens: c.tokens,
            })),
            requestId: pkg.requestId,
            tokensUsed: pkg.tokensUsed,
            summary: {
              funnel: pkg.summary.funnel,
              metrics: pkg.summary.metrics,
            },
          }
        },
      },
      // Decision agent deps — uses Action Guardrails + Write Back
      {
        checkAction: async (user, input) => {
          const result = await this.guardrailService.checkFromMcpSession(
            {
              sessionId: `ref-agent-${Date.now()}`,
              principalId: user.id,
              organizationId: user.organizationId,
              serviceAccountId: null,
              capabilities: ['context.resolve', 'action.check', 'knowledge.read'],
              authMethod: 'service_account',
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            } as unknown as McpSession,
            {
              action: input.action,
              targetType: input.targetType,
              targetId: input.targetId ?? null,
              parameters: input.parameters ?? {},
              purpose: input.purpose ?? null,
            },
            `ref-${Date.now()}`,
          )

          return {
            allowed: result.decision.allowed,
            decision: result.decision.decision,
            action: result.decision.action,
            targetType: result.decision.targetType,
            targetId: result.decision.targetId,
            riskLevel: result.decision.riskLevel,
            reasonCode: result.decision.reasonCode,
            explanation: result.decision.explanation,
            violatedPolicies: result.decision.violatedPolicies,
            approvalRequired: result.decision.approvalRequired,
            approvalReason: result.decision.approvalReason ?? null,
            trace: result.decision.publicTrace.map((t: GuardrailResult) => ({
              guardrail: t.guardrailName,
              passed: t.passed,
              reason: t.explanation,
              severity: t.severity,
            })),
          }
        },
        proposeNode: async (user, input) => {
          const result = await this.writeBackService.propose(user, {
            nodeType: input.nodeType as WritableNodeType,
            title: input.title,
            content: input.content,
            classification: input.classification as DataClassification,
            workspaceId: input.workspaceId,
            purpose: input.purpose,
            idempotencyKey: input.idempotencyKey,
          })

          return {
            proposalId: result.proposalId,
            decision: result.decision,
            status: result.status,
            nodeId: result.nodeId,
            approvalRequired: result.approvalRequired,
            reasonCode: result.reasonCode,
            validationTrace: result.validationTrace.map((t: ValidationTraceStep) => ({
              step: t.step,
              passed: t.passed,
            })),
            runId: result.runId,
          }
        },
      },
    )
  }

  getRegistry() {
    return {
      agents: this.identityProvider.getAllIdentities(),
      description:
        'Reference multi-agent system demonstrating ContextGraph as shared trusted infrastructure',
    }
  }
}
