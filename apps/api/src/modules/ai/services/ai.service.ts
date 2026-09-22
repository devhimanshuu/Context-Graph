import { Inject, Injectable } from '@nestjs/common'
import { type ILogger, LOGGER } from '../../../common/interfaces/logger.interface'
import { getRequestId } from '../../../common/context/request-context'
import { TraversalStrategy } from '../../graph/domain/traversal'
import { IContextAssemblyService } from '../../pipeline/context-assembly/context-assembly.service'
import type {
  AssembledContext,
  AiChatRequest,
  AiResponse,
  ModelRequest,
  CircuitState,
  ModelProvider,
  StreamChunk,
} from '../domain/ai.types'
import {
  IAiService,
  IContextAssembler,
  IContextBudgetManager,
  IPromptBuilder,
  IModelRouter,
  ICitationValidator,
  IResponseValidator,
  IContextHasher,
  ICostCalculator,
  ITokenEstimator,
  IContextCompressor,
  IModelGateway,
  type AiHealthStatus,
} from '../domain/ai.interfaces'

/** Context budget defaults. */
const DEFAULT_BUDGET = {
  maxCandidates: 20,
  maxCharacters: 50000,
  maxTokens: 8000,
  maxContentSize: 100000,
  maxSourceCount: 15,
}

/** Injection token for the provider gateway registry (see AiModule). */
const MODEL_GATEWAYS = 'MODEL_GATEWAYS'

/**
 * AI Service — orchestrates the full AI pipeline.
 *
 * Pipeline:
 * 1. Validate request
 * 2. Assemble context (from ContextGraph pipeline output)
 * 3. Apply budget constraints
 * 4. Build prompt
 * 5. Route to provider
 * 6. Generate response
 * 7. Validate response
 * 8. Validate citations
 * 9. Return AiResponse
 *
 * Key architectural principle:
 * ContextGraph authorization happens BEFORE this service is called.
 * This service receives already-authorized context.
 */
@Injectable()
export class AiService implements IAiService {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(IContextAssembler) private readonly assembler: IContextAssembler,
    @Inject(IContextBudgetManager) private readonly budgetManager: IContextBudgetManager,
    @Inject(IPromptBuilder) private readonly promptBuilder: IPromptBuilder,
    @Inject(IModelRouter) private readonly modelRouter: IModelRouter,
    @Inject(ICitationValidator) private readonly citationValidator: ICitationValidator,
    @Inject(IResponseValidator) private readonly responseValidator: IResponseValidator,
    @Inject(IContextHasher) private readonly contextHasher: IContextHasher,
    @Inject(ICostCalculator) private readonly costCalculator: ICostCalculator,
    @Inject(ITokenEstimator) private readonly tokenEstimator: ITokenEstimator,
    @Inject(IContextCompressor) private readonly compressor: IContextCompressor,
    @Inject(MODEL_GATEWAYS) private readonly gateways: Map<string, IModelGateway>,
    @Inject(IContextAssemblyService)
    private readonly contextAssembly: IContextAssemblyService,
  ) {}

  async chat(request: AiChatRequest): Promise<AiResponse> {
    const requestId = getRequestId()
    const startTime = Date.now()

    this.logger.debug('AI chat request', {
      requestId,
      workspaceId: request.workspaceId,
      entryNodeId: request.entryNodeId,
    })

    try {
      // 1. Route to provider
      const config = await this.modelRouter.route(request)

      // 2. Assemble authorized context via the ContextGraph pipeline
      const context = await this.buildAssembledContext(request)

      // 3. Apply budget constraints
      const budgetResult = this.budgetManager.fitToBudget(context.items, DEFAULT_BUDGET)

      // 4. Build prompt
      const prompt = this.promptBuilder.buildPrompt({
        systemInstructions: this.promptBuilder.getSystemInstructions('contextgraph-system-v1'),
        context: {
          ...context,
          items: budgetResult.included,
        },
        userQuery: request.userQuery,
        constraints: {
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature,
          citationRequired: true,
          safetyLevel: 'STANDARD',
        },
        outputRequirements: {
          format: 'markdown',
          includeCitations: true,
          includeSources: true,
          maxLength: null,
        },
        conversationHistory: request.conversationHistory,
        requestId,
      })

      // 5. Check cost limits
      const estimatedCost = this.costCalculator.estimateCostForRequest(
        this.tokenEstimator.estimateTokens(prompt.systemPrompt + prompt.userPrompt),
        config.maxOutputTokens,
        config.provider,
        config.model,
      )

      const limits = this.costCalculator.getCostLimits()
      if (estimatedCost > limits.maxCostPerRequest) {
        throw new Error(
          `Estimated cost $${estimatedCost.toFixed(4)} exceeds limit $${limits.maxCostPerRequest}`,
        )
      }

      // 6. Generate response
      const modelRequest: ModelRequest = {
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        contextHash: context.contextHash,
        promptVersion: prompt.promptVersion,
        configuration: config,
        requestId,
      }

      const gateway = await this.getGateway(config.provider)
      const generationResult = await gateway.generate(modelRequest)

      // 7. Validate response
      const responseValidation = this.responseValidator.validate(generationResult, context)
      if (!responseValidation.valid) {
        this.logger.warn('Response validation failed', {
          errors: responseValidation.errors,
          requestId,
        })
      }

      // 8. Validate citations
      const citationValidation = this.citationValidator.validate(generationResult.text, context)

      // 9. Build AiResponse
      const latencyMs = Date.now() - startTime

      this.logger.debug('AI chat complete', {
        requestId,
        latencyMs,
        tokens: generationResult.usage.totalTokens,
        citations: citationValidation.citations.length,
      })

      return {
        answer: responseValidation.sanitizedText ?? generationResult.text,
        citations: citationValidation.citations,
        model: generationResult.model,
        provider: generationResult.provider,
        usage: generationResult.usage,
        contextVersion: context.contextVersion,
        contextHash: context.contextHash,
        promptHash: prompt.promptHash,
        latencyMs,
        requestId,
        pipelineVersion: '1.0.0',
      }
    } catch (error) {
      this.logger.error('AI chat failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      })
      throw error
    }
  }

  async chatStream(
    request: AiChatRequest,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<AiResponse> {
    const requestId = getRequestId()
    const startTime = Date.now()

    this.logger.debug('AI chat stream request', {
      requestId,
      workspaceId: request.workspaceId,
      entryNodeId: request.entryNodeId,
    })

    try {
      // 1. Route to provider
      const config = await this.modelRouter.route(request)

      // 2. Assemble authorized context via the ContextGraph pipeline
      const context = await this.buildAssembledContext(request)

      // 3. Apply budget constraints
      const budgetResult = this.budgetManager.fitToBudget(context.items, DEFAULT_BUDGET)

      // 4. Build prompt
      const prompt = this.promptBuilder.buildPrompt({
        systemInstructions: this.promptBuilder.getSystemInstructions('contextgraph-system-v1'),
        context: {
          ...context,
          items: budgetResult.included,
        },
        userQuery: request.userQuery,
        constraints: {
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature,
          citationRequired: true,
          safetyLevel: 'STANDARD',
        },
        outputRequirements: {
          format: 'markdown',
          includeCitations: true,
          includeSources: true,
          maxLength: null,
        },
        conversationHistory: request.conversationHistory,
        requestId,
      })

      // 5. Check cost limits
      const estimatedCost = this.costCalculator.estimateCostForRequest(
        this.tokenEstimator.estimateTokens(prompt.systemPrompt + prompt.userPrompt),
        config.maxOutputTokens,
        config.provider,
        config.model,
      )

      const limits = this.costCalculator.getCostLimits()
      if (estimatedCost > limits.maxCostPerRequest) {
        throw new Error(
          `Estimated cost $${estimatedCost.toFixed(4)} exceeds limit $${limits.maxCostPerRequest}`,
        )
      }

      // 6. Generate streaming response
      const gateway = await this.getGateway(config.provider)
      const streamResult = await gateway.generateStream({
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        contextHash: context.contextHash,
        promptVersion: prompt.promptVersion,
        configuration: config,
        requestId,
        onChunk,
      })

      // 7. Validate citations
      const citationValidation = this.citationValidator.validate(streamResult.text, context)

      // 8. Build AiResponse
      const latencyMs = Date.now() - startTime

      this.logger.debug('AI chat stream complete', {
        requestId,
        latencyMs,
        tokens: streamResult.usage.totalTokens,
        citations: citationValidation.citations.length,
      })

      return {
        answer: streamResult.text,
        citations: citationValidation.citations,
        model: config.model,
        provider: config.provider,
        usage: streamResult.usage,
        contextVersion: context.contextVersion,
        contextHash: context.contextHash,
        promptHash: prompt.promptHash,
        latencyMs,
        requestId,
        pipelineVersion: '1.0.0',
      }
    } catch (error) {
      this.logger.error('AI chat stream failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      })
      throw error
    }
  }

  async health(): Promise<AiHealthStatus> {
    const providersList: Array<{
      readonly provider: ModelProvider
      readonly available: boolean
      readonly circuitState: CircuitState
    }> = []

    for (const provider of ['GROQ', 'OPENROUTER', 'OLLAMA'] as ModelProvider[]) {
      const gateway = await this.getGateway(provider)
      const available = await gateway.isAvailable()
      providersList.push({
        provider,
        available,
        circuitState: 'CLOSED', // Simplified
      })
    }
    const providers = providersList

    return {
      healthy: providers.some((p) => p.available),
      providers,
    }
  }

  private async getGateway(provider: ModelProvider): Promise<IModelGateway> {
    const gateway = this.gateways.get(provider)
    if (gateway === undefined) {
      throw new Error(
        `No model gateway registered for provider "${provider}". ` +
          `Configure the provider credentials (e.g. GROQ_API_KEY) or pick another provider.`,
      )
    }
    return gateway
  }

  /**
   * Assembles authorized context for the request via the ContextGraph
   * context-assembly pipeline (reachability → rules → budget). The caller's
   * identity drives authorization; the LLM never widens access.
   */
  private async buildAssembledContext(request: AiChatRequest): Promise<AssembledContext> {
    const assembly = await this.contextAssembly.assemble(request.user, {
      workspaceId: request.workspaceId,
      entryNodeId: request.entryNodeId,
      maxDepth: 3,
      strategy: TraversalStrategy.BFS,
      tokenBudget: DEFAULT_BUDGET.maxTokens,
    })

    const candidates = assembly.candidates.map((candidate, index) => ({
      id: candidate.id,
      title: candidate.title,
      content: candidate.content,
      type: candidate.type,
      importance: candidate.importance,
      distance: candidate.distance,
      compressionHint: 'FULL' as const,
      inclusionReason: 'PIPELINE_INCLUDED',
      complianceTags: candidate.complianceTags,
      organizationId: request.user.organizationId,
      departmentId: null,
      workspaceId: request.workspaceId,
      version: null,
      rank: index + 1,
      tokens: Math.ceil(candidate.content.length / 4),
    }))

    return this.assembler.assemble({
      candidates,
      entryNodeId: request.entryNodeId,
      workspaceId: request.workspaceId,
      organizationId: request.user.organizationId,
      contextVersion: assembly.packageId,
    })
  }
}
