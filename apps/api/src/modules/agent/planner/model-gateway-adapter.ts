/* Model Gateway Adapter — bridges the AI module's ModelGateway to the agent planner.

This adapter implements IAgentModelGenerator by calling the existing
GroqAdapter/OpenRouterAdapter through the MODEL_GATEWAYS registry.

The agent module never directly depends on specific model providers.
It depends only on the IAgentModelGenerator abstraction.
*/

import { Inject, Injectable } from '@nestjs/common'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import { LOGGER } from '../../../common/interfaces/logger.interface'
import type { IModelGateway } from '../../ai/domain/ai.interfaces'
import type { ModelRequest } from '../../ai/domain/ai.types'
import {
  IAgentModelGenerator,
  type AgentModelGenInput,
  type AgentModelGenResult,
} from './llm-planner'

/** Token for the AI model gateways registry (from AiModule). */
export const MODEL_GATEWAYS = 'MODEL_GATEWAYS'

@Injectable()
export class ModelGatewayAdapter implements IAgentModelGenerator {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(MODEL_GATEWAYS) private readonly gateways: Map<string, IModelGateway>,
  ) {}

  async generate(input: AgentModelGenInput): Promise<AgentModelGenResult> {
    const startTime = performance.now()

    // Select the best available gateway
    const gateway = await this.selectGateway()
    if (gateway === null) {
      throw new Error('No model gateway available')
    }

    const provider = gateway.getProvider()

    this.logger.debug('Agent model generation', {
      provider,
      systemPromptLength: input.systemPrompt.length,
      userPromptLength: input.userPrompt.length,
    })

    const modelRequest: ModelRequest = {
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      contextHash: 'agent-planner',
      promptVersion: 'agent-planner-v1',
      configuration: {
        provider,
        model: this.getDefaultModel(provider),
        temperature: input.temperature,
        maxOutputTokens: input.maxTokens,
        timeout: 30_000,
        retryPolicy: { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000, backoffMultiplier: 2 },
        isLocal: provider === 'OLLAMA',
      },
      requestId: `agent-planner-${Date.now()}`,
    }

    const result = await gateway.generate(modelRequest)
    const durationMs = performance.now() - startTime

    this.logger.debug('Agent model generation complete', {
      provider,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      durationMs,
    })

    return {
      text: result.text,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      durationMs,
    }
  }

  /**
   * Select the best available gateway.
   * Prefers GROQ (fast, free), then OPENROUTER, then OLLAMA (local).
   */
  private async selectGateway(): Promise<IModelGateway | null> {
    const preferenceOrder = ['GROQ', 'OPENROUTER', 'OLLAMA', 'OPENAI', 'ANTHROPIC']

    for (const provider of preferenceOrder) {
      const gateway = this.gateways.get(provider)
      if (gateway !== undefined) {
        try {
          if (await gateway.isAvailable()) {
            return gateway
          }
        } catch {
          // Gateway check failed, try next
        }
      }
    }

    return null
  }

  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      GROQ: 'llama-3.3-70b-versatile',
      OPENROUTER: 'meta-llama/llama-3.3-70b-instruct:free',
      OLLAMA: 'llama3.2',
      OPENAI: 'gpt-4o',
      ANTHROPIC: 'claude-3-5-sonnet-20241022',
    }
    return defaults[provider] ?? 'llama-3.3-70b-versatile'
  }
}
