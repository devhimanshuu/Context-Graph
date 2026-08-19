import type { EntityId } from '@contextgraph/types'
import type {
  AssembledContext,
  BudgetFitResult,
  CircuitState,
  CompressionMode,
  CompressionResult,
  ContextBudgetConstraints,
  ContextItem,
  ContextPriority,
  ModelConfiguration,
  ModelProvider,
  ModelRequest,
  GenerationResult,
  PromptRequest,
  CitationValidationResult,
  ResponseValidationResult,
  AiChatRequest,
  AiResponse,
  StreamRequest,
  StreamResult,
  StreamChunk,
} from './ai.types'

// ---------------------------------------------------------------------------
// Context Assembler
// ---------------------------------------------------------------------------

/** Converts CandidateSet into ordered context representation. */
export abstract class IContextAssembler {
  abstract assemble(input: AssembleContextInput): Promise<AssembledContext>
}

export interface AssembleContextInput {
  readonly candidates: readonly AssembleCandidateInput[]
  readonly entryNodeId: EntityId
  readonly workspaceId: EntityId
  readonly organizationId: EntityId
  readonly contextVersion: string
}

export interface AssembleCandidateInput {
  readonly id: EntityId
  readonly title: string
  readonly content: string
  readonly type: string
  readonly importance: number
  readonly distance: number
  readonly compressionHint: string
  readonly inclusionReason: string
  readonly complianceTags: readonly string[]
  readonly organizationId: EntityId
  readonly departmentId: EntityId | null
  readonly workspaceId: EntityId
  readonly version: string | null
  readonly rank: number
  readonly tokens: number
}

// ---------------------------------------------------------------------------
// Context Budget Manager
// ---------------------------------------------------------------------------

/** Manages token budgets and priority-based filtering. */
export abstract class IContextBudgetManager {
  abstract fitToBudget(
    items: readonly ContextItem[],
    constraints: ContextBudgetConstraints,
  ): BudgetFitResult
  abstract assignPriority(item: ContextItem): ContextPriority
}

// ---------------------------------------------------------------------------
// Token Estimator
// ---------------------------------------------------------------------------

/** Provider-independent token estimation. */
export abstract class ITokenEstimator {
  abstract estimateTokens(text: string): number
  abstract estimateTokensForItems(items: readonly ContextItem[]): number
  abstract getProvider(): string
}

// ---------------------------------------------------------------------------
// Context Compressor
// ---------------------------------------------------------------------------

/** Compresses context content based on compression hints. */
export abstract class IContextCompressor {
  abstract compress(content: string, mode: CompressionMode, maxTokens: number): CompressionResult
  abstract getSupportedModes(): readonly CompressionMode[]
}

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

/** Builds structured prompts from context and requests. */
export abstract class IPromptBuilder {
  abstract buildPrompt(request: PromptRequest): BuiltPrompt
  abstract getSystemInstructions(version: string): string
  abstract getPromptVersion(): string
}

export interface BuiltPrompt {
  readonly systemPrompt: string
  readonly userPrompt: string
  readonly contextSection: string
  readonly promptHash: string
  readonly promptVersion: string
}

// ---------------------------------------------------------------------------
// Model Gateway
// ---------------------------------------------------------------------------

/** Abstraction for LLM provider communication. */
export abstract class IModelGateway {
  abstract generate(request: ModelRequest): Promise<GenerationResult>
  abstract generateStream(request: StreamRequest): Promise<StreamResult>
  abstract getProvider(): ModelProvider
  abstract isAvailable(): Promise<boolean>
}

// ---------------------------------------------------------------------------
// Model Router
// ---------------------------------------------------------------------------

/** Routes requests to appropriate model providers. */
export abstract class IModelRouter {
  abstract route(request: AiChatRequest): Promise<ModelConfiguration>
  abstract getPrimaryProvider(): ModelProvider
  abstract getFallbackProviders(): readonly ModelProvider[]
}

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

/** Circuit breaker for provider resilience. */
export abstract class IModelCircuitBreaker {
  abstract getState(provider: ModelProvider): CircuitState
  abstract recordSuccess(provider: ModelProvider): void
  abstract recordFailure(provider: ModelProvider): void
  abstract canExecute(provider: ModelProvider): boolean
  abstract reset(provider: ModelProvider): void
}

// ---------------------------------------------------------------------------
// Citation Validator
// ---------------------------------------------------------------------------

/** Validates citations against assembled context. */
export abstract class ICitationValidator {
  abstract validate(responseText: string, context: AssembledContext): CitationValidationResult
}

// ---------------------------------------------------------------------------
// Response Validator
// ---------------------------------------------------------------------------

/** Validates generated responses. */
export abstract class IResponseValidator {
  abstract validate(response: GenerationResult, context: AssembledContext): ResponseValidationResult
}

// ---------------------------------------------------------------------------
// Cost Calculator
// ---------------------------------------------------------------------------

/** Calculates and tracks LLM costs. */
export abstract class ICostCalculator {
  abstract calculateCost(
    inputTokens: number,
    outputTokens: number,
    provider: ModelProvider,
    model: string,
  ): number
  abstract getCostLimits(): CostLimits
  abstract estimateCostForRequest(
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    provider: ModelProvider,
    model: string,
  ): number
}

export interface CostLimits {
  readonly maxCostPerRequest: number
  readonly maxCostPerUser: number
  readonly maxCostPerOrganization: number
}

// ---------------------------------------------------------------------------
// Context Hasher
// ---------------------------------------------------------------------------

/** Creates deterministic context hashes. */
export abstract class IContextHasher {
  abstract hashContext(context: AssembledContext): string
  abstract hashPrompt(prompt: BuiltPrompt): string
}

// ---------------------------------------------------------------------------
// AI Service (Orchestrator)
// ---------------------------------------------------------------------------

/** Orchestrates the full AI pipeline. */
export abstract class IAiService {
  abstract chat(request: AiChatRequest): Promise<AiResponse>
  abstract chatStream(
    request: AiChatRequest,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<AiResponse>
  abstract health(): Promise<AiHealthStatus>
}

export interface AiHealthStatus {
  readonly healthy: boolean
  readonly providers: ReadonlyArray<{
    readonly provider: ModelProvider
    readonly available: boolean
    readonly circuitState: CircuitState
  }>
}
