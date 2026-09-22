import type { AuthenticatedUser, EntityId, Score, Timestamp } from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Context Assembly Types
// ---------------------------------------------------------------------------

/** Priority tiers for context budget management. */
export const ContextPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
} as const
export type ContextPriority = (typeof ContextPriority)[keyof typeof ContextPriority]

/** An ordered context item ready for prompt construction. */
export interface ContextItem {
  readonly id: EntityId
  readonly nodeId: EntityId
  readonly title: string
  readonly content: string
  readonly type: string
  readonly importance: Score
  readonly distance: number
  readonly priority: ContextPriority
  readonly compressionHint: string
  readonly inclusionReason: string
  readonly complianceTags: readonly string[]
  readonly source: ContextSource
  readonly tokens: number
  readonly rank: number
}

/** Source attribution for a context item. */
export interface ContextSource {
  readonly nodeId: EntityId
  readonly organizationId: EntityId
  readonly departmentId: EntityId | null
  readonly workspaceId: EntityId
  readonly version: string | null
}

/** The assembled context output from ContextAssembler. */
export interface AssembledContext {
  readonly items: readonly ContextItem[]
  readonly totalTokens: number
  readonly sourceCount: number
  readonly contextVersion: string
  readonly contextHash: string
  readonly assembledAt: Timestamp
  readonly entryNodeId: EntityId
  readonly workspaceId: EntityId
}

// ---------------------------------------------------------------------------
// Context Budget Types
// ---------------------------------------------------------------------------

/** Budget constraints for context assembly. */
export interface ContextBudgetConstraints {
  readonly maxCandidates: number
  readonly maxCharacters: number
  readonly maxTokens: number
  readonly maxContentSize: number
  readonly maxSourceCount: number
}

/** Result of budget fitting. */
export interface BudgetFitResult {
  readonly included: readonly ContextItem[]
  readonly excluded: readonly ContextItem[]
  readonly totalTokens: number
  readonly truncated: boolean
  readonly exclusionReasons: ReadonlyMap<string, string>
}

// ---------------------------------------------------------------------------
// Token Estimation Types
// ---------------------------------------------------------------------------

/** Token usage estimate. */
export interface TokenEstimate {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
}

// ---------------------------------------------------------------------------
// Compression Types
// ---------------------------------------------------------------------------

/** Compression modes. */
export const CompressionMode = {
  FULL: 'FULL',
  SUMMARY: 'SUMMARY',
  COMPRESSED: 'COMPRESSED',
  REFERENCE_ONLY: 'REFERENCE_ONLY',
} as const
export type CompressionMode = (typeof CompressionMode)[keyof typeof CompressionMode]

/** Result of compression. */
export interface CompressionResult {
  readonly originalTokens: number
  readonly compressedTokens: number
  readonly content: string
  readonly mode: CompressionMode
}

// ---------------------------------------------------------------------------
// Prompt Types
// ---------------------------------------------------------------------------

/** Structured prompt request. */
export interface PromptRequest {
  readonly systemInstructions: string
  readonly context: AssembledContext
  readonly userQuery: string
  readonly constraints: PromptConstraints
  readonly outputRequirements: OutputRequirements
  readonly conversationHistory: readonly ConversationTurn[]
  readonly requestId: string
}

/** Prompt constraints. */
export interface PromptConstraints {
  readonly maxOutputTokens: number
  readonly temperature: number
  readonly citationRequired: boolean
  readonly safetyLevel: SafetyLevel
}

/** Output format requirements. */
export interface OutputRequirements {
  readonly format: 'text' | 'json' | 'markdown'
  readonly includeCitations: boolean
  readonly includeSources: boolean
  readonly maxLength: number | null
}

/** Safety levels for prompt handling. */
export const SafetyLevel = {
  STANDARD: 'STANDARD',
  STRICT: 'STRICT',
  PARANOID: 'PARANOID',
} as const
export type SafetyLevel = (typeof SafetyLevel)[keyof typeof SafetyLevel]

/** A single conversation turn. */
export interface ConversationTurn {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly timestamp: Timestamp
}

// ---------------------------------------------------------------------------
// Model Gateway Types
// ---------------------------------------------------------------------------

/** Model configuration. */
export interface ModelConfiguration {
  readonly provider: ModelProvider
  readonly model: string
  readonly temperature: number
  readonly maxOutputTokens: number
  readonly timeout: number
  readonly retryPolicy: RetryPolicy
  readonly isLocal: boolean
}

/** Supported model providers. */
export const ModelProvider = {
  OPENAI: 'OPENAI',
  GROQ: 'GROQ',
  ANTHROPIC: 'ANTHROPIC',
  OPENROUTER: 'OPENROUTER',
  OLLAMA: 'OLLAMA',
} as const
export type ModelProvider = (typeof ModelProvider)[keyof typeof ModelProvider]

/** Retry policy configuration. */
export interface RetryPolicy {
  readonly maxRetries: number
  readonly baseDelayMs: number
  readonly maxDelayMs: number
  readonly backoffMultiplier: number
}

/** Model request to the gateway. */
export interface ModelRequest {
  readonly systemPrompt: string
  readonly userPrompt: string
  readonly contextHash: string
  readonly promptVersion: string
  readonly configuration: ModelConfiguration
  readonly requestId: string
}

/** Model generation result. */
export interface GenerationResult {
  readonly text: string
  readonly model: string
  readonly provider: ModelProvider
  readonly usage: ModelUsage
  readonly finishReason: FinishReason
  readonly latencyMs: number
  readonly requestId: string
  readonly contextVersion: string
  readonly contextHash: string
}

/** Token usage and cost. */
export interface ModelUsage {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly estimatedCost: number
  readonly provider: ModelProvider
  readonly model: string
}

/** Finish reasons. */
export const FinishReason = {
  STOP: 'STOP',
  LENGTH: 'LENGTH',
  CONTENT_FILTER: 'CONTENT_FILTER',
  ERROR: 'ERROR',
  TIMEOUT: 'TIMEOUT',
} as const
export type FinishReason = (typeof FinishReason)[keyof typeof FinishReason]

// ---------------------------------------------------------------------------
// Citation Types
// ---------------------------------------------------------------------------

/** A citation reference in the response. */
export interface Citation {
  readonly index: number
  readonly nodeId: EntityId
  readonly title: string
  readonly source: ContextSource
  readonly valid: boolean
  readonly validationError: string | null
}

/** Citation validation result. */
export interface CitationValidationResult {
  readonly valid: boolean
  readonly citations: readonly Citation[]
  readonly invalidCount: number
  readonly errors: readonly string[]
}

// ---------------------------------------------------------------------------
// Response Validation Types
// ---------------------------------------------------------------------------

/** Response validation result. */
export interface ResponseValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
  readonly sanitizedText: string | null
}

// ---------------------------------------------------------------------------
// AI Response Types
// ---------------------------------------------------------------------------

/** The final AI response contract. */
export interface AiResponse {
  readonly answer: string
  readonly citations: readonly Citation[]
  readonly model: string
  readonly provider: ModelProvider
  readonly usage: ModelUsage
  readonly contextVersion: string
  readonly contextHash: string
  readonly promptHash: string
  readonly latencyMs: number
  readonly requestId: string
  readonly pipelineVersion: string
  /** Persisted conversation this turn belongs to (null when persistence is unavailable). */
  readonly conversationId?: string | null
}

// ---------------------------------------------------------------------------
// AI Request Types
// ---------------------------------------------------------------------------

/** The AI chat request. */
export interface AiChatRequest {
  readonly userQuery: string
  readonly entryNodeId: EntityId
  readonly workspaceId: EntityId
  readonly conversationId: string | null
  readonly conversationHistory: readonly ConversationTurn[]
  readonly configuration: Partial<ModelConfiguration>
  /** Authenticated principal — used to assemble only authorized context. */
  readonly user: AuthenticatedUser
}

// ---------------------------------------------------------------------------
// Circuit Breaker Types
// ---------------------------------------------------------------------------

/** Circuit breaker states. */
export const CircuitState = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const
export type CircuitState = (typeof CircuitState)[keyof typeof CircuitState]

/** Circuit breaker configuration. */
export interface CircuitBreakerConfig {
  readonly failureThreshold: number
  readonly recoveryTimeoutMs: number
  readonly halfOpenMaxAttempts: number
}

// ---------------------------------------------------------------------------
// Streaming Types
// ---------------------------------------------------------------------------

/** A single chunk from a streaming response. */
export interface StreamChunk {
  readonly delta: string
  readonly finishReason: FinishReason | null
  readonly usage: Partial<ModelUsage> | null
  readonly index: number
}

/** Streaming response callback. */
export type StreamCallback = (chunk: StreamChunk) => void

/** Streaming completion result. */
export interface StreamResult {
  readonly text: string
  readonly usage: ModelUsage
  readonly finishReason: FinishReason
  readonly latencyMs: number
}

/** Streaming request to the gateway. */
export interface StreamRequest {
  readonly systemPrompt: string
  readonly userPrompt: string
  readonly contextHash: string
  readonly promptVersion: string
  readonly configuration: ModelConfiguration
  readonly requestId: string
  readonly onChunk: StreamCallback
}
