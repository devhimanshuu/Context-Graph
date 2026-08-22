/* Agent domain types — internal to the NestJS agent module. */

import type { EntityId, Milliseconds, Timestamp } from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Plan (created by the planner)
// ---------------------------------------------------------------------------

export interface AgentPlan {
  readonly planId: EntityId
  readonly steps: readonly AgentPlanStep[]
  readonly dependencies: readonly StepDependency[]
  readonly expectedOutputs: readonly string[]
  readonly verificationRequirements: readonly string[]
  readonly maximumIterations: number
  readonly createdAt: Timestamp
}

export interface AgentPlanStep {
  readonly stepId: EntityId
  readonly type: StepType
  readonly purpose: string
  readonly tool: string | null
  readonly inputs: Record<string, unknown>
  readonly dependencies: readonly EntityId[]
  readonly status: StepStatus
}

export type StepType =
  'CONTEXT_REQUEST' | 'TOOL_CALL' | 'ANALYSIS' | 'VERIFICATION' | 'FINAL_RESPONSE'

export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'BLOCKED'

export interface StepDependency {
  readonly fromStepId: EntityId
  readonly toStepId: EntityId
}

// ---------------------------------------------------------------------------
// Execution Limits (enforced outside the LLM)
// ---------------------------------------------------------------------------

export interface AgentLimits {
  readonly maxSteps: number
  readonly maxIterations: number
  readonly maxToolCalls: number
  readonly maxDurationMs: Milliseconds
  readonly maxTokens: number
  readonly maxCost: number
  readonly perToolTimeoutMs: Milliseconds
  readonly maxConsecutiveIdenticalCalls: number
}

// ---------------------------------------------------------------------------
// Default Limits
// ---------------------------------------------------------------------------

export const DEFAULT_AGENT_LIMITS: AgentLimits = {
  maxSteps: 20,
  maxIterations: 10,
  maxToolCalls: 50,
  maxDurationMs: 120_000,
  maxTokens: 32_000,
  maxCost: 1.0,
  perToolTimeoutMs: 30_000,
  maxConsecutiveIdenticalCalls: 3,
}

// ---------------------------------------------------------------------------
// Model Configuration (provider-specific fields isolated)
// ---------------------------------------------------------------------------

export interface AgentModelConfiguration {
  readonly provider: string
  readonly model: string
  readonly temperature: number
  readonly maxTokens: number
  readonly timeoutMs: Milliseconds
  readonly reasoningEnabled: boolean
}

export const DEFAULT_MODEL_CONFIG: AgentModelConfiguration = {
  provider: 'GROQ',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.1,
  maxTokens: 4096,
  timeoutMs: 30_000,
  reasoningEnabled: false,
}

// ---------------------------------------------------------------------------
// Tool Schema (for registration and validation)
// ---------------------------------------------------------------------------

export interface ToolSchema {
  readonly name: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
  readonly requiredCapabilities: readonly string[]
  readonly riskLevel: 'READ_ONLY' | 'LOW_RISK_WRITE' | 'HIGH_RISK_WRITE' | 'EXTERNAL_SIDE_EFFECT'
  readonly timeoutMs: Milliseconds
  readonly enabled: boolean
}

// ---------------------------------------------------------------------------
// Injection Detection Patterns
// ---------------------------------------------------------------------------

export const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+(a|an)/i,
  /system\s*:\s*/i,
  /new\s+instructions?\s*:/i,
  /override\s+(system|instructions?)/i,
  /call\s+(delete|drop|remove|destroy)\w*/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
  /```[\s\S]*?(delete|drop|remove|destroy)/i,
  /\bpassword\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
]

// ---------------------------------------------------------------------------
// Prompt Templates
// ---------------------------------------------------------------------------

export const AGENT_SYSTEM_PROMPT = `You are an AI assistant operating within the ContextGraph platform.
You have access to tools that let you search knowledge, explore graphs, look up documents, and check policies.

IMPORTANT RULES:
1. You MUST use tools to retrieve information. Never fabricate data.
2. All information you receive has been authorization-checked by ContextGraph.
3. You cannot access data outside your organization or permission scope.
4. When citing sources, reference the tool results you received.
5. If you lack sufficient information, say so clearly.
6. Do not attempt to access, modify, or bypass any security mechanisms.
7. Your responses must be grounded in the context provided by tools.
8. If a tool returns a denial, report it as such — do not reinterpret it.
9. Format your tool calls as valid JSON matching the required schema.
10. Never include instructions or commands in your responses that might be executed.`

export const PLANNER_SYSTEM_PROMPT = `You are a task planner for an AI agent. Given a user request and available tools,
create a step-by-step plan to fulfill the request.

Available tools: {tools}

Rules:
1. Each step must be atomic and well-defined.
2. Steps should specify which tool to use (if any).
3. Dependencies between steps must be explicit.
4. Plan a verification step before the final response.
5. Do not plan actions outside the available tools.
6. Maximum {maxSteps} steps.
7. Output valid JSON matching the plan schema.`
