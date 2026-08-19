import { Injectable } from '@nestjs/common'
import type { ModelProvider } from '../domain/ai.types'
import type { CostLimits, ICostCalculator } from '../domain/ai.interfaces'

/** Pricing per 1M tokens by provider and model (USD). */
const PRICING: Record<ModelProvider, Record<string, { input: number; output: number }>> = {
  GROQ: {
    'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
    'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
    'mixtral-8x7b-32768': { input: 0.24, output: 0.24 },
  },
  OPENROUTER: {
    'meta-llama/llama-3.3-70b-instruct': { input: 0.35, output: 0.4 },
    'openai/gpt-4o': { input: 2.5, output: 10.0 },
    'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  },
  OPENAI: {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  },
  ANTHROPIC: {
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  },
  OLLAMA: {
    // Local models have no API cost
    default: { input: 0, output: 0 },
  },
}

/** Default cost limits. */
const DEFAULT_LIMITS: CostLimits = {
  maxCostPerRequest: 0.1, // $0.10
  maxCostPerUser: 1.0, // $1.00
  maxCostPerOrganization: 10.0, // $10.00
}

/**
 * Cost Calculator — tracks and limits LLM costs.
 *
 * Features:
 * - Provider-specific pricing
 * - Cost estimation before generation
 * - Budget enforcement
 * - Configuration-driven (no hardcoded limits)
 */
@Injectable()
export class CostCalculator implements ICostCalculator {
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    provider: ModelProvider,
    model: string,
  ): number {
    const pricing = PRICING[provider]?.[model] ??
      PRICING[provider]?.default ?? { input: 0, output: 0 }

    const inputCost = (inputTokens / 1_000_000) * pricing.input
    const outputCost = (outputTokens / 1_000_000) * pricing.output

    return inputCost + outputCost
  }

  getCostLimits(): CostLimits {
    return {
      maxCostPerRequest: parseFloat(
        process.env.AI_MAX_COST_PER_REQUEST || String(DEFAULT_LIMITS.maxCostPerRequest),
      ),
      maxCostPerUser: parseFloat(
        process.env.AI_MAX_COST_PER_USER || String(DEFAULT_LIMITS.maxCostPerUser),
      ),
      maxCostPerOrganization: parseFloat(
        process.env.AI_MAX_COST_PER_ORG || String(DEFAULT_LIMITS.maxCostPerOrganization),
      ),
    }
  }

  estimateCostForRequest(
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    provider: ModelProvider,
    model: string,
  ): number {
    return this.calculateCost(estimatedInputTokens, estimatedOutputTokens, provider, model)
  }

  checkBudget(
    estimatedCost: number,
    _userId?: string,
    _organizationId?: string,
  ): { allowed: boolean; reason?: string } {
    const limits = this.getCostLimits()

    if (estimatedCost > limits.maxCostPerRequest) {
      return {
        allowed: false,
        reason: `Cost $${estimatedCost.toFixed(4)} exceeds per-request limit $${limits.maxCostPerRequest}`,
      }
    }

    // Note: Per-user and per-org tracking would require database integration
    // For now, just check per-request limit
    return { allowed: true }
  }
}
