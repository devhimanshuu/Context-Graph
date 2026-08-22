/* LLM-based planner — generates execution plans by calling the ModelGateway.

This planner constructs a structured prompt describing the user request,
available tools, and planning constraints, then asks the LLM to produce
a JSON plan. The output is validated and converted to an AgentPlan.

If the LLM output is invalid or the model fails, the planner returns null
so the caller can fall back to the rule-based planner.
*/

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { AgentPlan, AgentPlanStep, AgentLimits } from '../domain/agent.types'
import { uuid } from '../../../common/utils/uuid'

/** Injection token for the agent's model generation function. */
export const AGENT_MODEL_GENERATOR = Symbol('AgentModelGenerator')

/**
 * Thin abstraction over the model gateway for the agent planner.
 * This avoids coupling the agent module to the full AI module types.
 */
export abstract class IAgentModelGenerator {
  abstract generate(input: AgentModelGenInput): Promise<AgentModelGenResult>
}

export interface AgentModelGenInput {
  readonly systemPrompt: string
  readonly userPrompt: string
  readonly temperature: number
  readonly maxTokens: number
}

export interface AgentModelGenResult {
  readonly text: string
  readonly inputTokens: number
  readonly outputTokens: number
  readonly durationMs: number
}

/** Structured plan output from the LLM. */
interface LLMPlanOutput {
  readonly steps: readonly LLMPlanStepOutput[]
  readonly reasoning?: string
}

interface LLMPlanStepOutput {
  readonly type: string
  readonly purpose: string
  readonly tool?: string
  readonly inputs?: Record<string, unknown>
}

/** System prompt for the planner LLM. */
const PLANNER_SYSTEM_PROMPT = `You are a task planner for an AI agent operating within the ContextGraph platform.

Given a user request and a list of available tools, create a step-by-step execution plan.

AVAILABLE TOOLS:
{tools}

PLANNING RULES:
1. Each step must be atomic and well-defined.
2. Steps should specify which tool to use (if any), or "analysis", "verification", or "final_response".
3. Always include an analysis step after tool calls.
4. Always include a verification step before the final response.
5. Always end with a final_response step.
6. Do NOT plan write actions — the agent only has read access.
7. Maximum {maxSteps} steps.
8. Consider information dependencies between steps.
9. Do not plan steps outside the available tools.

OUTPUT FORMAT: Return ONLY valid JSON matching this schema:
{
  "steps": [
    {
      "type": "CONTEXT_REQUEST | TOOL_CALL | ANALYSIS | VERIFICATION | FINAL_RESPONSE",
      "purpose": "Brief description of what this step accomplishes",
      "tool": "tool_name (if type is CONTEXT_REQUEST or TOOL_CALL)",
      "inputs": { "key": "value" }
    }
  ],
  "reasoning": "Brief explanation of the plan strategy"
}

Do NOT include any text outside the JSON block. Do NOT use markdown code fences.`

@Injectable()
export class LLMAgentPlanner {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(AGENT_MODEL_GENERATOR) private readonly generator: IAgentModelGenerator,
  ) {}

  /**
   * Attempt to generate a plan via LLM.
   * Returns null if the LLM output is invalid or the model fails.
   */
  async generatePlan(
    userRequest: string,
    availableTools: readonly { name: string; description: string }[],
    limits: AgentLimits,
  ): Promise<AgentPlan | null> {
    const startTime = performance.now()

    // Build the tools description
    const toolsDesc = availableTools
      .map((t) => `- ${t.name}: ${t.description || 'No description'}`)
      .join('\n')

    const systemPrompt = PLANNER_SYSTEM_PROMPT.replace('{tools}', toolsDesc).replace(
      '{maxSteps}',
      String(limits.maxSteps),
    )

    const userPrompt = `Create an execution plan for this request:\n\n"${userRequest}"`

    this.logger.debug('LLM planner: generating plan', {
      requestLength: userRequest.length,
      toolCount: availableTools.length,
    })

    try {
      const result = await this.generator.generate({
        systemPrompt,
        userPrompt,
        temperature: 0.1, // Low temperature for deterministic planning
        maxTokens: 2048,
      })

      const durationMs = performance.now() - startTime
      this.logger.info('LLM planner: model response received', {
        durationMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      })

      // Parse the LLM output
      const parsed = this.parsePlanOutput(result.text)
      if (parsed === null) {
        this.logger.warn('LLM planner: failed to parse model output', {
          outputLength: result.text.length,
        })
        return null
      }

      // Convert to AgentPlan
      const plan = this.toAgentPlan(parsed, limits)

      this.logger.info('LLM planner: plan generated', {
        planId: plan.planId,
        stepCount: plan.steps.length,
        durationMs,
      })

      return plan
    } catch (error) {
      this.logger.error('LLM planner: model call failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: performance.now() - startTime,
      })
      return null
    }
  }

  /**
   * Parse the LLM output into a structured plan.
   * Handles JSON extraction from potential markdown fences.
   */
  private parsePlanOutput(text: string): LLMPlanOutput | null {
    try {
      // Try direct JSON parse first
      const trimmed = text.trim()

      // Extract JSON from markdown code fences if present
      const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch !== null ? (jsonMatch[1]?.trim() ?? trimmed) : trimmed

      const parsed = JSON.parse(jsonStr) as Record<string, unknown>

      // Validate structure
      if (typeof parsed !== 'object' || parsed === null) return null
      if (!Array.isArray(parsed.steps)) return null

      const steps = parsed.steps as unknown[]
      for (const step of steps) {
        if (typeof step !== 'object' || step === null) return null
        const s = step as Record<string, unknown>
        if (typeof s.type !== 'string') return null
        if (typeof s.purpose !== 'string') return null
      }

      return parsed as unknown as LLMPlanOutput
    } catch {
      return null
    }
  }

  /**
   * Convert parsed LLM output to an AgentPlan.
   */
  private toAgentPlan(output: LLMPlanOutput, limits: AgentLimits): AgentPlan {
    const validTypes = new Set([
      'CONTEXT_REQUEST',
      'TOOL_CALL',
      'ANALYSIS',
      'VERIFICATION',
      'FINAL_RESPONSE',
    ])

    const planSteps: AgentPlanStep[] = output.steps
      .filter((s) => validTypes.has(s.type))
      .slice(0, limits.maxSteps)
      .map((s, index) => ({
        stepId: uuid(),
        type: s.type as AgentPlanStep['type'],
        purpose: s.purpose,
        tool: s.tool ?? null,
        inputs: s.inputs ?? {},
        dependencies: index > 0 ? [] : [], // Dependencies are flat for now
        status: 'PENDING' as const,
      }))

    // Ensure required steps exist
    const hasAnalysis = planSteps.some((s) => s.type === 'ANALYSIS')
    const hasVerification = planSteps.some((s) => s.type === 'VERIFICATION')
    const hasFinalResponse = planSteps.some((s) => s.type === 'FINAL_RESPONSE')

    if (!hasAnalysis) {
      planSteps.splice(planSteps.length - (hasFinalResponse ? 1 : 0), 0, {
        stepId: uuid(),
        type: 'ANALYSIS',
        purpose: 'Analyze gathered information and formulate response',
        tool: null,
        inputs: {},
        dependencies: [],
        status: 'PENDING',
      })
    }

    if (!hasVerification) {
      const insertIndex = planSteps.findIndex((s) => s.type === 'FINAL_RESPONSE')
      planSteps.splice(insertIndex >= 0 ? insertIndex : planSteps.length, 0, {
        stepId: uuid(),
        type: 'VERIFICATION',
        purpose: 'Verify the response is grounded, complete, and policy-compliant',
        tool: null,
        inputs: {},
        dependencies: [],
        status: 'PENDING',
      })
    }

    if (!hasFinalResponse) {
      planSteps.push({
        stepId: uuid(),
        type: 'FINAL_RESPONSE',
        purpose: 'Generate the final response to the user',
        tool: null,
        inputs: {},
        dependencies: [],
        status: 'PENDING',
      })
    }

    return {
      planId: uuid(),
      steps: planSteps,
      dependencies: planSteps.flatMap((step, i) => {
        if (i === 0) return []
        const prev = planSteps[i - 1]
        return prev !== undefined ? [{ fromStepId: prev.stepId, toStepId: step.stepId }] : []
      }),
      expectedOutputs: ['context_results', 'analysis', 'verified_response'],
      verificationRequirements: ['citation_check', 'groundedness_check', 'policy_check'],
      maximumIterations: limits.maxIterations,
      createdAt: new Date().toISOString(),
    }
  }
}
