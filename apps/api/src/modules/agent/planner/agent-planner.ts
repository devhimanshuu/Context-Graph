/* Agent planner — creates and updates execution plans.

The planner determines:
- required context
- required tools
- task order
- verification requirements

The planner must NOT determine authorization.
*/

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import {
  IAgentPlanner,
  type PlannerStateInput,
  type ObservationInput,
} from '../domain/agent.interfaces'
import type { AgentPlan, AgentPlanStep, AgentLimits } from '../domain/agent.types'
import { uuid } from '../../../common/utils/uuid'

/**
 * The planner creates execution plans from user requests.
 *
 * In a full implementation, this would call an LLM to generate plans.
 * For now, we implement a rule-based planner that creates sensible
 * default plans for common request patterns.
 */
@Injectable()
export class AgentPlanner implements IAgentPlanner {
  constructor(@Inject(LOGGER) private readonly logger: ILogger) {}

  async createPlan(
    userRequest: string,
    availableTools: readonly { readonly name: string; readonly description: string }[],
    limits: AgentLimits,
    state: PlannerStateInput,
  ): Promise<AgentPlan> {
    this.logger.debug('Creating plan', {
      requestLength: userRequest.length,
      availableTools: availableTools.length,
      iteration: state.iteration,
    })

    const steps: AgentPlanStep[] = []

    // Step 1: Context search (if query seems information-seeking)
    if (this.isInformationSeeking(userRequest)) {
      steps.push(
        this.makeStep(
          'CONTEXT_REQUEST',
          'Search for relevant context matching the user request',
          'context_search',
          { query: userRequest },
        ),
      )
    }

    // Step 2: Graph exploration (if request involves relationships)
    if (this.involvesRelationships(userRequest)) {
      steps.push(
        this.makeStep(
          'TOOL_CALL',
          'Explore graph connections to understand relationships',
          'graph_explore',
          { query: userRequest },
          steps,
        ),
      )
    }

    // Step 3: Knowledge lookup (if request is about specific knowledge)
    if (this.involvesSpecificKnowledge(userRequest)) {
      steps.push(
        this.makeStep(
          'TOOL_CALL',
          'Look up specific knowledge nodes',
          'knowledge_lookup',
          { query: userRequest },
          steps,
        ),
      )
    }

    // Step 4: Analysis
    steps.push(
      this.makeStep(
        'ANALYSIS',
        'Analyze gathered information and formulate response',
        null,
        {},
        steps,
      ),
    )

    // Step 5: Verification
    steps.push(
      this.makeStep(
        'VERIFICATION',
        'Verify the response is grounded, complete, and policy-compliant',
        null,
        {},
        steps,
      ),
    )

    // Step 6: Final response
    steps.push(
      this.makeStep('FINAL_RESPONSE', 'Generate the final response to the user', null, {}, steps),
    )

    // Enforce limits
    const truncatedSteps = steps.slice(0, limits.maxSteps)

    const plan: AgentPlan = {
      planId: uuid(),
      steps: truncatedSteps,
      dependencies: truncatedSteps.flatMap((step) =>
        step.dependencies.map((depId) => ({
          fromStepId: depId,
          toStepId: step.stepId,
        })),
      ),
      expectedOutputs: ['context_results', 'analysis', 'verified_response'],
      verificationRequirements: ['citation_check', 'groundedness_check', 'policy_check'],
      maximumIterations: limits.maxIterations,
      createdAt: new Date().toISOString(),
    }

    this.logger.info('Plan created', {
      planId: plan.planId,
      stepCount: plan.steps.length,
    })

    return plan
  }

  async updatePlan(
    currentPlan: AgentPlan,
    observations: readonly ObservationInput[],
    limits: AgentLimits,
  ): Promise<AgentPlan> {
    this.logger.debug('Updating plan based on observations', {
      planId: currentPlan.planId,
      observationCount: observations.length,
    })

    const hasInformation = observations.some(
      (o) =>
        o.summary.includes('result') ||
        o.summary.includes('found') ||
        o.summary.includes('returned'),
    )

    if (!hasInformation && currentPlan.steps.length < limits.maxSteps) {
      const additionalStep: AgentPlanStep = {
        stepId: uuid(),
        type: 'CONTEXT_REQUEST',
        purpose: 'Refined context search based on initial observations',
        tool: 'context_search',
        inputs: { refined: true, observations: observations.map((o) => o.summary) },
        dependencies: [],
        status: 'PENDING',
      }

      return {
        ...currentPlan,
        steps: [...currentPlan.steps.slice(0, -2), additionalStep, ...currentPlan.steps.slice(-2)],
      }
    }

    return currentPlan
  }

  private makeStep(
    type: AgentPlanStep['type'],
    purpose: string,
    tool: string | null,
    inputs: Record<string, unknown>,
    existingSteps?: readonly AgentPlanStep[],
  ): AgentPlanStep {
    const lastStep =
      existingSteps !== undefined && existingSteps.length > 0
        ? existingSteps[existingSteps.length - 1]
        : undefined
    const lastStepId = lastStep?.stepId

    return {
      stepId: uuid(),
      type,
      purpose,
      tool,
      inputs,
      dependencies: lastStepId !== undefined ? [lastStepId] : [],
      status: 'PENDING',
    }
  }

  private isInformationSeeking(request: string): boolean {
    const patterns = [
      /what\s+(is|are|was|were)/i,
      /tell\s+me\s+about/i,
      /explain/i,
      /describe/i,
      /how\s+(do|does|did|should)/i,
      /find/i,
      /search/i,
      /look\s+up/i,
      /retrieve/i,
      /get\s+me/i,
      /summarize/i,
      /summarise/i,
    ]
    return patterns.some((p) => p.test(request))
  }

  private involvesRelationships(request: string): boolean {
    const patterns = [
      /connected/i,
      /relationship/i,
      /related/i,
      /depends?\s+on/i,
      /linked/i,
      /graph/i,
      /travers/i,
      /path/i,
      /neighbor/i,
    ]
    return patterns.some((p) => p.test(request))
  }

  private involvesSpecificKnowledge(request: string): boolean {
    const patterns = [
      /node/i,
      /knowledge/i,
      /document/i,
      /specific/i,
      /particular/i,
      /uuid/i,
      /[0-9a-f]{8}-[0-9a-f]{4}/i,
    ]
    return patterns.some((p) => p.test(request))
  }
}
