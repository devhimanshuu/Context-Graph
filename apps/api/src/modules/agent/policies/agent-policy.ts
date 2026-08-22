/* Agent policy engine — determines capabilities, limits, and action permissions.

The agent does NOT define its own policy.
ContextGraph provides the policy boundaries.
*/

import { Injectable } from '@nestjs/common'
import {
  IAgentPolicy,
  type PolicyContext,
  type AgentPolicyResult,
  type ToolAuthorizationDecision,
} from '../domain/agent.interfaces'
import { DEFAULT_AGENT_LIMITS } from '../domain/agent.types'

/**
 * Default capability sets by role.
 */
const ROLE_CAPABILITIES: Record<string, readonly string[]> = {
  ADMIN: [
    'CONTEXT_READ',
    'GRAPH_READ',
    'KNOWLEDGE_READ',
    'DOCUMENT_READ',
    'POLICY_READ',
    'CALCULATOR',
  ],
  HOD: [
    'CONTEXT_READ',
    'GRAPH_READ',
    'KNOWLEDGE_READ',
    'DOCUMENT_READ',
    'POLICY_READ',
    'CALCULATOR',
  ],
  EDITOR: ['CONTEXT_READ', 'GRAPH_READ', 'KNOWLEDGE_READ', 'DOCUMENT_READ', 'CALCULATOR'],
  VIEWER: ['CONTEXT_READ', 'GRAPH_READ', 'KNOWLEDGE_READ', 'CALCULATOR'],
  QUALITY: [
    'CONTEXT_READ',
    'GRAPH_READ',
    'KNOWLEDGE_READ',
    'DOCUMENT_READ',
    'POLICY_READ',
    'CALCULATOR',
  ],
  AUDITOR: [
    'CONTEXT_READ',
    'GRAPH_READ',
    'KNOWLEDGE_READ',
    'DOCUMENT_READ',
    'POLICY_READ',
    'CALCULATOR',
  ],
}

/**
 * Tools that are always blocked for agents (too risky).
 */
const ALWAYS_BLOCKED_TOOLS: readonly string[] = [
  // Future: write tools, email, etc.
]

/**
 * Role-specific limits for agent execution.
 */
const ROLE_LIMITS: Record<string, Partial<typeof DEFAULT_AGENT_LIMITS>> = {
  ADMIN: { maxIterations: 15, maxToolCalls: 75, maxCost: 2.0 },
  HOD: { maxIterations: 12, maxToolCalls: 60, maxCost: 1.5 },
  EDITOR: { maxIterations: 10, maxToolCalls: 50, maxCost: 1.0 },
  VIEWER: { maxIterations: 8, maxToolCalls: 30, maxCost: 0.5 },
  QUALITY: { maxIterations: 10, maxToolCalls: 50, maxCost: 1.0 },
  AUDITOR: { maxIterations: 10, maxToolCalls: 50, maxCost: 1.0 },
}

@Injectable()
export class AgentPolicy implements IAgentPolicy {
  async getCapabilities(context: PolicyContext): Promise<AgentPolicyResult> {
    const roleCaps = ROLE_CAPABILITIES[context.userRole] ?? ROLE_CAPABILITIES['VIEWER'] ?? []
    const roleLimits = ROLE_LIMITS[context.userRole] ?? ROLE_LIMITS['VIEWER'] ?? {}

    const maxIterations = roleLimits.maxIterations ?? DEFAULT_AGENT_LIMITS.maxIterations
    const maxToolCalls = roleLimits.maxToolCalls ?? DEFAULT_AGENT_LIMITS.maxToolCalls
    const maxCost = roleLimits.maxCost ?? DEFAULT_AGENT_LIMITS.maxCost

    return {
      capabilities: [...roleCaps],
      maxIterations,
      maxToolCalls,
      maxTokens: DEFAULT_AGENT_LIMITS.maxTokens,
      maxCost,
      maxDurationMs: DEFAULT_AGENT_LIMITS.maxDurationMs,
      allowedTools: [],
      blockedTools: [...ALWAYS_BLOCKED_TOOLS],
    }
  }

  async checkAction(action: string, context: PolicyContext): Promise<ToolAuthorizationDecision> {
    // Only READ_ONLY actions are allowed by default for agents
    if (action === 'READ_ONLY') {
      return { allowed: true, reason: null, policyId: 'default-read-only' }
    }

    // Higher-risk actions require explicit authorization
    return {
      allowed: false,
      reason: `Action '${action}' requires explicit authorization for role '${context.userRole}'`,
      policyId: 'risk-classification',
    }
  }
}
