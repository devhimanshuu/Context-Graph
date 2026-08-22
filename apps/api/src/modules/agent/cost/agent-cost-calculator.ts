/* Agent cost calculator — tracks and limits token usage and estimated cost. */

import { Injectable } from '@nestjs/common'
import { IAgentCostCalculator } from '../domain/agent.interfaces'

/**
 * Approximate cost per 1K tokens by provider/model.
 * These are ballpark figures — real costs vary by provider pricing changes.
 */
const COST_PER_1K_TOKENS: Record<string, Record<string, number>> = {
  GROQ: {
    'llama-3.3-70b-versatile': 0.00059,
    'llama-3.1-8b-instant': 0.00005,
    'mixtral-8x7b-32768': 0.00027,
  },
  OPENROUTER: {
    'anthropic/claude-3.5-sonnet': 0.003,
    'openai/gpt-4o': 0.0025,
    'meta-llama/llama-3.3-70b-instruct': 0.0003,
  },
  OLLAMA: {
    default: 0, // Local models have no token cost
  },
}

@Injectable()
export class AgentCostCalculator implements IAgentCostCalculator {
  calculate(inputTokens: number, outputTokens: number, provider: string, model: string): number {
    const providerCosts = COST_PER_1K_TOKENS[provider]
    if (providerCosts === undefined) return 0

    const modelCost = providerCosts[model] ?? providerCosts['default'] ?? 0
    if (modelCost === 0) return 0

    const inputCost = (inputTokens / 1000) * modelCost
    const outputCost = (outputTokens / 1000) * modelCost * 2 // Output tokens are typically 2x cost

    return Math.round((inputCost + outputCost) * 10_000) / 10_000
  }

  checkBudget(estimatedCost: number, maxCost: number): boolean {
    return estimatedCost <= maxCost
  }
}
