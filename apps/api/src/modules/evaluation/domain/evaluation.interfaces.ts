import type {
  EvaluationDataset,
  EvaluationCase,
  EvaluationRun,
  EvaluationExperiment,
  EvaluationMetrics,
  EvaluationCaseResult,
  QualityGate,
  QualityGateResult,
  EvaluationBaseline,
  RegressionResult,
  RetrievalMetrics,
  RankingMetrics,
  ContextMetrics,
  CitationMetrics,
  AnswerMetrics,
  SecurityMetrics,
  RetrievalModeComparison,
  EvaluationReport,
} from './evaluation.types'

// ---------------------------------------------------------------------------
// Dataset Service Interface
// ---------------------------------------------------------------------------

/** Manages evaluation datasets. */
export abstract class IDatasetService {
  abstract createDataset(
    dataset: Omit<EvaluationDataset, 'datasetId' | 'createdAt' | 'updatedAt'>,
  ): Promise<EvaluationDataset>
  abstract getDataset(datasetId: string): Promise<EvaluationDataset | null>
  abstract getDatasetByVersion(version: string): Promise<EvaluationDataset | null>
  abstract listDatasets(category?: string): Promise<readonly EvaluationDataset[]>
  abstract updateDataset(
    datasetId: string,
    updates: Partial<EvaluationDataset>,
  ): Promise<EvaluationDataset>
  abstract deleteDataset(datasetId: string): Promise<void>
  abstract addCaseToDataset(datasetId: string, evaluationCase: EvaluationCase): Promise<void>
  abstract removeCaseFromDataset(datasetId: string, caseId: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Evaluation Runner Interface
// ---------------------------------------------------------------------------

/** Executes evaluation runs. */
export abstract class IEvaluationRunner {
  abstract runExperiment(experimentId: string, datasetId: string): Promise<EvaluationRun>
  abstract runCase(
    evaluationCase: EvaluationCase,
    configuration: Record<string, unknown>,
  ): Promise<EvaluationCaseResult>
  abstract getRun(runId: string): Promise<EvaluationRun | null>
  abstract listRuns(experimentId?: string): Promise<readonly EvaluationRun[]>
  abstract cancelRun(runId: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Retrieval Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates retrieval quality. */
export abstract class IRetrievalEvaluator {
  abstract evaluateRetrieval(
    retrievedNodes: readonly string[],
    expectedRelevantNodes: readonly string[],
    expectedExcludedNodes: readonly string[],
  ): RetrievalMetrics

  abstract calculatePrecisionAtK(
    retrieved: readonly string[],
    relevant: readonly string[],
    k: number,
  ): number
  abstract calculateRecallAtK(
    retrieved: readonly string[],
    relevant: readonly string[],
    k: number,
  ): number
  abstract calculateMRR(retrieved: readonly string[], relevant: readonly string[]): number
  abstract calculateNDCG(
    retrieved: readonly string[],
    relevanceScores: Readonly<Record<string, number>>,
    k: number,
  ): number
  abstract calculateHitRate(
    retrieved: readonly string[],
    relevant: readonly string[],
    k: number,
  ): number
}

// ---------------------------------------------------------------------------
// Ranking Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates candidate ranking quality. */
export abstract class IRankingEvaluator {
  abstract evaluateRanking(
    rankedCandidates: readonly { nodeId: string; score: number; rank: number }[],
    expectedRelevance: Readonly<Record<string, number>>,
  ): RankingMetrics
}

// ---------------------------------------------------------------------------
// Context Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates context quality. */
export abstract class IContextEvaluator {
  abstract evaluateContext(
    contextItems: readonly { nodeId: string; content: string; relevanceScore: number }[],
    expectedRelevantNodes: readonly string[],
    budgetConstraints: { maxTokens: number; maxItems: number },
  ): ContextMetrics
}

// ---------------------------------------------------------------------------
// Citation Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates citation quality. */
export abstract class ICitationEvaluator {
  abstract evaluateCitations(
    responseText: string,
    citations: readonly { nodeId: string; claim: string; position: number }[],
    contextNodes: readonly { nodeId: string; content: string }[],
    expectedCitations: readonly { nodeId: string; expectedClaim: string }[],
  ): CitationMetrics
}

// ---------------------------------------------------------------------------
// Answer Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates answer quality. */
export abstract class IAnswerEvaluator {
  abstract evaluateAnswer(
    answer: string,
    query: string,
    context: readonly string[],
    expectedCharacteristics: {
      mustContainConcepts: readonly string[]
      mustNotContainConcepts: readonly string[]
      minRelevanceScore: number
    },
  ): AnswerMetrics
}

// ---------------------------------------------------------------------------
// Security Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates security properties. */
export abstract class ISecurityEvaluator {
  abstract evaluateAuthorization(
    contextItems: readonly { organizationId: string; nodeId: string }[],
    authorizedOrganizationId: string,
    forbiddenNodeIds: readonly string[],
  ): SecurityMetrics

  abstract evaluatePromptInjection(
    response: string,
    injectedInstructions: readonly string[],
    systemPromptLeakageIndicators: readonly string[],
  ): SecurityMetrics

  abstract evaluateTenantIsolation(
    results: readonly { organizationId: string; data: unknown }[],
    expectedOrganizationId: string,
  ): SecurityMetrics
}

// ---------------------------------------------------------------------------
// Groundedness Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates answer groundedness in context. */
export abstract class IGroundednessEvaluator {
  abstract evaluateGroundedness(
    answer: string,
    context: readonly string[],
    claims: readonly { claim: string; startIndex: number; endIndex: number }[],
  ): {
    groundedClaims: number
    ungroundedClaims: number
    groundednessScore: number
  }
}

// ---------------------------------------------------------------------------
// Hallucination Detector Interface
// ---------------------------------------------------------------------------

/** Detects hallucinations in generated answers. */
export abstract class IHallucinationDetector {
  abstract detectHallucinations(
    answer: string,
    context: readonly string[],
    query: string,
  ): {
    hallucinationRate: number
    unsupportedClaims: readonly { claim: string; reason: string }[]
    hallucinationDetected: boolean
  }
}

// ---------------------------------------------------------------------------
// Quality Gate Evaluator Interface
// ---------------------------------------------------------------------------

/** Evaluates quality gates. */
export abstract class IQualityGateEvaluator {
  abstract evaluateGates(metrics: EvaluationMetrics, gate: QualityGate): QualityGateResult

  abstract getDefaultGate(): QualityGate
}

// ---------------------------------------------------------------------------
// Baseline Service Interface
// ---------------------------------------------------------------------------

/** Manages evaluation baselines. */
export abstract class IBaselineService {
  abstract createBaseline(name: string, runId: string): Promise<EvaluationBaseline>
  abstract getBaseline(baselineId: string): Promise<EvaluationBaseline | null>
  abstract getBaselineByVersion(version: string): Promise<EvaluationBaseline | null>
  abstract listBaselines(): Promise<readonly EvaluationBaseline[]>
  abstract compareWithBaseline(runId: string, baselineId: string): Promise<RegressionResult>
}

// ---------------------------------------------------------------------------
// Experiment Service Interface
// ---------------------------------------------------------------------------

/** Manages evaluation experiments. */
export abstract class IExperimentService {
  abstract createExperiment(
    experiment: Omit<EvaluationExperiment, 'experimentId' | 'createdAt'>,
  ): Promise<EvaluationExperiment>
  abstract getExperiment(experimentId: string): Promise<EvaluationExperiment | null>
  abstract listExperiments(): Promise<readonly EvaluationExperiment[]>
  abstract updateExperiment(
    experimentId: string,
    updates: Partial<EvaluationExperiment>,
  ): Promise<EvaluationExperiment>
  abstract deleteExperiment(experimentId: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Report Generator Interface
// ---------------------------------------------------------------------------

/** Generates evaluation reports. */
export abstract class IReportGenerator {
  abstract generateReport(runId: string): Promise<EvaluationReport>
  abstract generateComparisonReport(experimentIds: readonly string[]): Promise<{
    experiments: readonly EvaluationExperiment[]
    metrics: readonly EvaluationMetrics[]
    comparison: RetrievalModeComparison
  }>
}

// ---------------------------------------------------------------------------
// Evaluation Metrics Collector Interface
// ---------------------------------------------------------------------------

/** Collects and aggregates evaluation metrics. */
export abstract class IEvaluationMetricsCollector {
  abstract recordCaseResult(result: EvaluationCaseResult): void
  abstract aggregateMetrics(results: readonly EvaluationCaseResult[]): EvaluationMetrics
  abstract getMetricsSummary(): EvaluationMetrics
  abstract reset(): void
}
