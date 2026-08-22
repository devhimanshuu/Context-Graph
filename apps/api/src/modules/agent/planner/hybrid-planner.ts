/* Hybrid planner — tries LLM-based planning first, falls back to rule-based.

This is the recommended planner for production use:
1. Attempt LLM-based plan generation (dynamic, context-aware)
2. On failure (model timeout, invalid output, etc.), fall back to rule-based
3. The fallback ensures the agent always produces a plan

The LLM planner improves plan quality for complex queries by:
- Understanding natural language intent
- Selecting the right tools based on context
- Ordering steps optimally
- Adjusting depth based on complexity
*/

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import {
  IAgentPlanner,
  type PlannerStateInput,
  type ObservationInput,
} from '../domain/agent.interfaces'
import type { AgentPlan, AgentLimits } from '../domain/agent.types'
import { AgentPlanner } from './agent-planner'
import { LLMAgentPlanner } from './llm-planner'

@Injectable()
export class HybridPlanner implements IAgentPlanner {
  private readonly llmPlanner: LLMAgentPlanner
  private readonly ruleBasedPlanner: AgentPlanner

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    llmPlanner: LLMAgentPlanner,
    ruleBasedPlanner: AgentPlanner,
  ) {
    this.llmPlanner = llmPlanner
    this.ruleBasedPlanner = ruleBasedPlanner
  }

  async createPlan(
    userRequest: string,
    availableTools: readonly { name: string; description: string }[],
    limits: AgentLimits,
    state: PlannerStateInput,
  ): Promise<AgentPlan> {
    // Always try LLM planning first for better plan quality
    this.logger.debug('HybridPlanner: attempting LLM plan generation')

    const llmPlan = await this.llmPlanner.generatePlan(userRequest, availableTools, limits)

    if (llmPlan !== null) {
      this.logger.info('HybridPlanner: using LLM-generated plan', {
        planId: llmPlan.planId,
        stepCount: llmPlan.steps.length,
      })
      return llmPlan
    }

    // Fall back to rule-based planner
    this.logger.info('HybridPlanner: LLM planning failed, using rule-based planner')

    const ruleBasedPlan = await this.ruleBasedPlanner.createPlan(
      userRequest,
      availableTools,
      limits,
      state,
    )

    this.logger.info('HybridPlanner: rule-based plan generated', {
      planId: ruleBasedPlan.planId,
      stepCount: ruleBasedPlan.steps.length,
    })

    return ruleBasedPlan
  }

  async updatePlan(
    currentPlan: AgentPlan,
    observations: readonly ObservationInput[],
    limits: AgentLimits,
  ): Promise<AgentPlan> {
    // Plan updates are always rule-based (too risky to involve LLM for replanning)
    return this.ruleBasedPlanner.updatePlan(currentPlan, observations, limits)
  }
}
