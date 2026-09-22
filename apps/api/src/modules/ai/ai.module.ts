import { Module } from '@nestjs/common'
import { PipelineModule } from '../pipeline/pipeline.module'
import { AuthorizationModule } from '../authorization/authorization.module'
import { AiController } from './controllers/ai.controller'
import { ConversationsController } from './controllers/conversations.controller'
import { AiService } from './services/ai.service'
import { ConversationService } from './services/conversation.service'
import { ContextAssembler } from './services/context-assembler.service'
import { ContextBudgetManager } from './services/context-budget-manager.service'
import { GenericTokenEstimator } from './services/token-estimator.service'
import { ContextCompressor } from './services/context-compressor.service'
import { PromptBuilder } from './services/prompt-builder.service'
import { ModelRouter } from './services/model-router.service'
import { CitationValidator } from './services/citation-validator.service'
import { ResponseValidator } from './services/response-validator.service'
import { ContextHasher } from './services/context-hasher.service'
import { CostCalculator } from './services/cost-calculator.service'
import { GroqAdapter } from './adapters/groq.adapter'
import { OpenRouterAdapter } from './adapters/openrouter.adapter'
import { OllamaAdapter } from './adapters/ollama.adapter'
import {
  IAiService,
  IContextAssembler,
  IContextBudgetManager,
  ITokenEstimator,
  IContextCompressor,
  IPromptBuilder,
  IModelRouter,
  ICitationValidator,
  IResponseValidator,
  IContextHasher,
  ICostCalculator,
} from './domain/ai.interfaces'

/**
 * AI Module — Phase 11 composition boundary.
 *
 * Provides the AI Context Layer on top of ContextGraph.
 *
 * Architecture:
 * - ContextGraph authorization happens BEFORE this module
 * - This module receives already-authorized context
 * - The LLM never determines what information the user can access
 *
 * Dependencies:
 * - PipelineModule: for context assembly
 * - AuthorizationModule: for user context
 */
@Module({
  imports: [PipelineModule, AuthorizationModule],
  controllers: [AiController, ConversationsController],
  providers: [
    // Core services
    { provide: IAiService, useClass: AiService },
    ConversationService,
    { provide: IContextAssembler, useClass: ContextAssembler },
    { provide: IContextBudgetManager, useClass: ContextBudgetManager },
    { provide: ITokenEstimator, useClass: GenericTokenEstimator },
    { provide: IContextCompressor, useClass: ContextCompressor },
    { provide: IPromptBuilder, useClass: PromptBuilder },
    { provide: IModelRouter, useClass: ModelRouter },
    { provide: ICitationValidator, useClass: CitationValidator },
    { provide: IResponseValidator, useClass: ResponseValidator },
    { provide: IContextHasher, useClass: ContextHasher },
    { provide: ICostCalculator, useClass: CostCalculator },

    // Context assembly (authorized context from the ContextGraph pipeline)
    // IContextAssemblyService is provided and exported by PipelineModule.

    // Provider adapters
    GroqAdapter,
    OpenRouterAdapter,
    OllamaAdapter,

    // Gateway registry
    {
      provide: 'MODEL_GATEWAYS',
      useFactory: (groq: GroqAdapter, openrouter: OpenRouterAdapter, ollama: OllamaAdapter) => {
        const gateways = new Map()
        gateways.set('GROQ', groq)
        gateways.set('OPENROUTER', openrouter)
        gateways.set('OLLAMA', ollama)
        return gateways
      },
      inject: [GroqAdapter, OpenRouterAdapter, OllamaAdapter],
    },
  ],
  exports: [
    IAiService,
    IContextAssembler,
    IContextBudgetManager,
    ITokenEstimator,
    IContextCompressor,
    IPromptBuilder,
    IModelRouter,
    ICitationValidator,
    IResponseValidator,
    IContextHasher,
    ICostCalculator,
    'MODEL_GATEWAYS',
  ],
})
export class AiModule {}
