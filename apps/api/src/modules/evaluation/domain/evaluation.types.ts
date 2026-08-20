import type { EntityId } from '@contextgraph/types'

// ---------------------------------------------------------------------------
// Evaluation Dataset Types
// ---------------------------------------------------------------------------

/** Versioned evaluation dataset. */
export interface EvaluationDataset {
  readonly datasetId: string
  readonly name: string
  readonly version: string
  readonly description: string
  readonly cases: readonly EvaluationCase[]
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly metadata: DatasetMetadata
}

export interface DatasetMetadata {
  readonly author: string
  readonly tags: readonly string[]
  readonly totalCases: number
  readonly category: DatasetCategory
}

export type DatasetCategory =
  | 'golden'
  | 'retrieval'
  | 'security'
  | 'citation'
  | 'groundedness'
  | 'hallucination'
  | 'injection'
  | 'regression'
  | 'performance'

/** Individual evaluation case. */
export interface EvaluationCase {
  readonly caseId: string
  readonly version: string
  readonly query: string
  readonly userContext: UserContext
  readonly organizationId: EntityId
  readonly entryNodeId?: EntityId
  readonly expectedRelevantNodes: readonly EntityId[]
  readonly expectedExcludedNodes: readonly EntityId[]
  readonly expectedCitations: readonly ExpectedCitation[]
  readonly expectedAnswerCharacteristics: AnswerCharacteristics
  readonly securityExpectations: SecurityExpectations
  readonly metadata: CaseMetadata
}

export interface UserContext {
  readonly userId: EntityId
  readonly organizationId: EntityId
  readonly departmentId?: EntityId
  readonly role: string
  readonly permissions: readonly string[]
}

export interface ExpectedCitation {
  readonly nodeId: EntityId
  readonly nodeTitle: string
  readonly expectedClaim: string
}

export interface AnswerCharacteristics {
  readonly mustContainConcepts: readonly string[]
  readonly mustNotContainConcepts: readonly string[]
  readonly minRelevanceScore: number
  readonly maxHallucinationRate: number
  readonly expectedCitationCount?: { min: number; max: number }
}

export interface SecurityExpectations {
  readonly mustNotRevealSystemPrompt: boolean
  readonly mustNotAccessOtherOrgs: boolean
  readonly mustRespectPermissions: boolean
  readonly mustNotFollowInjectedInstructions: boolean
  readonly forbiddenNodes: readonly EntityId[]
}

export interface CaseMetadata {
  readonly category: string
  readonly difficulty: 'easy' | 'medium' | 'hard'
  readonly tags: readonly string[]
  readonly notes: string
}

// ---------------------------------------------------------------------------
// Evaluation Run Types
// ---------------------------------------------------------------------------

/** Evaluation experiment configuration. */
export interface EvaluationExperiment {
  readonly experimentId: string
  readonly name: string
  readonly description: string
  readonly datasetVersion: string
  readonly retrievalVersion: string
  readonly pipelineVersion: string
  readonly embeddingVersion: string
  readonly model: string
  readonly provider: string
  readonly configuration: ExperimentConfiguration
  readonly createdAt: Date
}

export interface ExperimentConfiguration {
  readonly retrievalMode: string
  readonly topK: number
  readonly chunkSize: number
  readonly chunkOverlap: number
  readonly graphDepth: number
  readonly semanticWeight: number
  readonly lexicalWeight: number
  readonly graphWeight: number
  readonly rrfParameters: RrfParameters
}

export interface RrfParameters {
  readonly k: number
  readonly graphBoost: number
  readonly semanticBoost: number
  readonly lexicalBoost: number
}

/** Evaluation run result. */
export interface EvaluationRun {
  readonly runId: string
  readonly experimentId: string
  readonly status: EvaluationRunStatus
  readonly startedAt: Date
  readonly completedAt?: Date
  readonly totalCases: number
  readonly passedCases: number
  readonly failedCases: number
  readonly metrics: EvaluationMetrics
  readonly errors: readonly EvaluationError[]
  readonly metadata: RunMetadata
}

export type EvaluationRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface RunMetadata {
  readonly datasetVersion: string
  readonly pipelineVersion: string
  readonly embeddingModel: string
  readonly embeddingVersion: string
  readonly llmProvider: string
  readonly llmModel: string
  readonly promptVersion: string
  readonly codeVersion: string
  readonly environment: string
}

export interface EvaluationError {
  readonly caseId: string
  readonly error: string
  readonly stack?: string
  readonly timestamp: Date
}

// ---------------------------------------------------------------------------
// Evaluation Metrics Types
// ---------------------------------------------------------------------------

/** Comprehensive evaluation metrics. */
export interface EvaluationMetrics {
  readonly retrieval: RetrievalMetrics
  readonly ranking: RankingMetrics
  readonly context: ContextMetrics
  readonly citation: CitationMetrics
  readonly answer: AnswerMetrics
  readonly security: SecurityMetrics
  readonly latency: LatencyMetrics
  readonly cost: CostMetrics
}

/** Retrieval quality metrics. */
export interface RetrievalMetrics {
  readonly precisionAt1: number
  readonly precisionAt5: number
  readonly precisionAt10: number
  readonly precisionAt20: number
  readonly recallAt1: number
  readonly recallAt5: number
  readonly recallAt10: number
  readonly recallAt20: number
  readonly mrr: number
  readonly ndcgAt5: number
  readonly ndcgAt10: number
  readonly hitRateAt5: number
  readonly hitRateAt10: number
  readonly graphOnlyMetrics?: RetrievalMetricsSummary
  readonly semanticOnlyMetrics?: RetrievalMetricsSummary
  readonly lexicalOnlyMetrics?: RetrievalMetricsSummary
  readonly hybridMetrics?: RetrievalMetricsSummary
}

export interface RetrievalMetricsSummary {
  readonly precisionAt10: number
  readonly recallAt10: number
  readonly mrr: number
}

/** Ranking quality metrics. */
export interface RankingMetrics {
  readonly orderingAccuracy: number
  readonly topCandidateAccuracy: number
  readonly scoreConsistency: number
  readonly tieBreakingConsistency: number
  readonly meanRankOfRelevant: number
}

/** Context quality metrics. */
export interface ContextMetrics {
  readonly relevantContextRate: number
  readonly irrelevantContextRate: number
  readonly missingRelevantContext: number
  readonly contextDuplication: number
  readonly contextDiversity: number
  readonly budgetUtilization: number
  readonly averageContextSize: number
}

/** Citation quality metrics. */
export interface CitationMetrics {
  readonly citationPrecision: number
  readonly citationRecall: number
  readonly citationCorrectness: number
  readonly citationCompleteness: number
  readonly validCitations: number
  readonly invalidCitations: number
  readonly missingCitations: number
  readonly hallucinatedCitations: number
}

/** Answer quality metrics. */
export interface AnswerMetrics {
  readonly relevanceScore: number
  readonly groundednessScore: number
  readonly hallucinationRate: number
  readonly insufficientContextRate: number
  readonly conflictDetectionRate: number
  readonly conceptCoverage: number
}

/** Security evaluation metrics. */
export interface SecurityMetrics {
  readonly authorizationViolations: number
  readonly tenantIsolationViolations: number
  readonly promptInjectionSuccessRate: number
  readonly systemPromptLeakage: number
  readonly contextLeakage: number
  readonly citationSpoofing: number
  readonly totalSecurityTests: number
  readonly passedSecurityTests: number
}

/** Latency metrics. */
export interface LatencyMetrics {
  readonly averageRetrievalLatencyMs: number
  readonly averageAssemblyLatencyMs: number
  readonly averagePromptBuildLatencyMs: number
  readonly averageModelLatencyMs: number
  readonly averageCitationValidationLatencyMs: number
  readonly averageTotalLatencyMs: number
  readonly p50LatencyMs: number
  readonly p95LatencyMs: number
  readonly p99LatencyMs: number
}

/** Cost metrics. */
export interface CostMetrics {
  readonly totalCostUsd: number
  readonly averageCostPerQuery: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
  readonly totalTokens: number
  readonly costByProvider: Readonly<Record<string, number>>
  readonly costByModel: Readonly<Record<string, number>>
}

// ---------------------------------------------------------------------------
// Case Result Types
// ---------------------------------------------------------------------------

/** Individual case evaluation result. */
export interface EvaluationCaseResult {
  readonly caseId: string
  readonly status: CaseResultStatus
  readonly retrievalMetrics: CaseRetrievalMetrics
  readonly contextMetrics: CaseContextMetrics
  readonly citationMetrics: CaseCitationMetrics
  readonly answerMetrics: CaseAnswerMetrics
  readonly securityMetrics: CaseSecurityMetrics
  readonly latency: CaseLatencyMetrics
  readonly tokenUsage: CaseTokenUsage
  readonly cost: number
  readonly errors: readonly string[]
}

export type CaseResultStatus = 'passed' | 'failed' | 'error' | 'skipped'

export interface CaseRetrievalMetrics {
  readonly retrievedNodes: readonly EntityId[]
  readonly relevantRetrieved: readonly EntityId[]
  readonly missedRelevant: readonly EntityId[]
  readonly irrelevantRetrieved: readonly EntityId[]
  readonly precisionAtK: Readonly<Record<number, number>>
  readonly recallAtK: Readonly<Record<number, number>>
  readonly mrr: number
}

export interface CaseContextMetrics {
  readonly contextSize: number
  readonly relevantItems: number
  readonly irrelevantItems: number
  readonly budgetUtilization: number
  readonly duplicationRate: number
}

export interface CaseCitationMetrics {
  readonly expectedCitations: number
  readonly actualCitations: number
  readonly validCitations: number
  readonly invalidCitations: number
  readonly precision: number
  readonly recall: number
}

export interface CaseAnswerMetrics {
  readonly relevanceScore: number
  readonly groundednessScore: number
  readonly containsRequiredConcepts: boolean
  readonly containsForbiddenConcepts: boolean
  readonly hallucinationDetected: boolean
}

export interface CaseSecurityMetrics {
  readonly authorizationPassed: boolean
  readonly tenantIsolationPassed: boolean
  readonly promptInjectionResisted: boolean
  readonly systemPromptNotLeaked: boolean
  readonly violations: readonly string[]
}

export interface CaseLatencyMetrics {
  readonly retrievalMs: number
  readonly assemblyMs: number
  readonly promptBuildMs: number
  readonly modelMs: number
  readonly citationValidationMs: number
  readonly totalMs: number
}

export interface CaseTokenUsage {
  readonly inputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
}

// ---------------------------------------------------------------------------
// Quality Gate Types
// ---------------------------------------------------------------------------

/** Quality gate configuration. */
export interface QualityGate {
  readonly gateId: string
  readonly name: string
  readonly description: string
  readonly thresholds: QualityThresholds
  readonly securityOverrides: SecurityOverrides
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface QualityThresholds {
  readonly retrievalRecallAt10: number
  readonly citationPrecision: number
  readonly groundednessScore: number
  readonly hallucinationRateMax: number
  readonly authorizationViolationsMax: number
  readonly tenantIsolationViolationsMax: number
  readonly regressionFailuresMax: number
  readonly latencyP95Ms: number
  readonly costPerQueryMax: number
}

export interface SecurityOverrides {
  readonly crossTenantLeakage: 'BLOCK' | 'WARN'
  readonly unauthorizedContext: 'BLOCK' | 'WARN'
  readonly systemPromptLeakage: 'BLOCK' | 'WARN'
  readonly promptInjectionSuccess: 'BLOCK' | 'WARN'
}

/** Quality gate evaluation result. */
export interface QualityGateResult {
  readonly passed: boolean
  readonly gates: readonly GateEvaluation[]
  readonly securityViolations: readonly SecurityViolation[]
  readonly recommendations: readonly string[]
}

export interface GateEvaluation {
  readonly gateName: string
  readonly metric: string
  readonly expected: number
  readonly actual: number
  readonly passed: boolean
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL'
}

export interface SecurityViolation {
  readonly violationType: string
  readonly severity: 'HIGH' | 'CRITICAL'
  readonly description: string
  readonly caseId: string
  readonly details: string
}

// ---------------------------------------------------------------------------
// Baseline Types
// ---------------------------------------------------------------------------

/** Evaluation baseline for regression detection. */
export interface EvaluationBaseline {
  readonly baselineId: string
  readonly name: string
  readonly version: string
  readonly metrics: EvaluationMetrics
  readonly createdAt: Date
  readonly metadata: RunMetadata
}

/** Regression detection result. */
export interface RegressionResult {
  readonly hasRegressions: boolean
  readonly regressions: readonly Regression[]
  readonly improvements: readonly Regression[]
  readonly baselineComparison: BaselineComparison
}

export interface Regression {
  readonly metric: string
  readonly baselineValue: number
  readonly currentValue: number
  readonly change: number
  readonly changePercent: number
  readonly severity: 'minor' | 'moderate' | 'major' | 'critical'
}

export interface BaselineComparison {
  readonly baselineId: string
  readonly currentRunId: string
  readonly comparisonTimestamp: Date
  readonly overallScore: number
}

// ---------------------------------------------------------------------------
// Hybrid Retrieval Comparison Types
// ---------------------------------------------------------------------------

/** Comparison of different retrieval modes. */
export interface RetrievalModeComparison {
  readonly graphOnly: RetrievalMetricsSummary
  readonly semanticOnly: RetrievalMetricsSummary
  readonly lexicalOnly: RetrievalMetricsSummary
  readonly hybrid: RetrievalMetricsSummary
  readonly winner: string
  readonly improvementOverBaseline: number
}

// ---------------------------------------------------------------------------
// Evaluation Report Types
// ---------------------------------------------------------------------------

/** Comprehensive evaluation report. */
export interface EvaluationReport {
  readonly reportId: string
  readonly runId: string
  readonly experimentId: string
  readonly generatedAt: Date
  readonly summary: ReportSummary
  readonly metrics: EvaluationMetrics
  readonly caseResults: readonly EvaluationCaseResult[]
  readonly regressions: RegressionResult
  readonly qualityGates: QualityGateResult
  readonly recommendations: readonly string[]
}

export interface ReportSummary {
  readonly totalCases: number
  readonly passedCases: number
  readonly failedCases: number
  readonly skippedCases: number
  readonly overallScore: number
  readonly securityScore: number
  readonly retrievalScore: number
  readonly answerQualityScore: number
}
