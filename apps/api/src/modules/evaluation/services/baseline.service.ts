import { Injectable } from '@nestjs/common'
import { IBaselineService } from '../domain/evaluation.interfaces'
import type {
  EvaluationBaseline,
  EvaluationMetrics,
  RegressionResult,
  Regression,
  BaselineComparison,
} from '../domain/evaluation.types'

/**
 * Baseline Service
 *
 * Manages evaluation baselines for regression detection.
 *
 * Every future experiment can compare against the baseline.
 * Do not overwrite the baseline automatically.
 */
@Injectable()
export class BaselineService implements IBaselineService {
  private baselines: Map<string, EvaluationBaseline> = new Map()

  /**
   * Create a new baseline from an evaluation run
   */
  async createBaseline(name: string, _runId: string): Promise<EvaluationBaseline> {
    // In production, this would fetch the run metrics from database
    // For now, we'll create a placeholder
    const baseline: EvaluationBaseline = {
      baselineId: `baseline-${Date.now()}`,
      name,
      version: `v${Date.now()}`,
      metrics: this.getEmptyMetrics(),
      createdAt: new Date(),
      metadata: {
        datasetVersion: 'unknown',
        pipelineVersion: 'unknown',
        embeddingModel: 'unknown',
        embeddingVersion: 'unknown',
        llmProvider: 'unknown',
        llmModel: 'unknown',
        promptVersion: 'unknown',
        codeVersion: 'unknown',
        environment: 'production',
      },
    }

    this.baselines.set(baseline.baselineId, baseline)
    return baseline
  }

  /**
   * Get baseline by ID
   */
  async getBaseline(baselineId: string): Promise<EvaluationBaseline | null> {
    return this.baselines.get(baselineId) || null
  }

  /**
   * Get baseline by version
   */
  async getBaselineByVersion(version: string): Promise<EvaluationBaseline | null> {
    for (const baseline of this.baselines.values()) {
      if (baseline.version === version) {
        return baseline
      }
    }
    return null
  }

  /**
   * List all baselines
   */
  async listBaselines(): Promise<readonly EvaluationBaseline[]> {
    return Array.from(this.baselines.values())
  }

  /**
   * Compare a run with a baseline
   */
  async compareWithBaseline(runId: string, baselineId: string): Promise<RegressionResult> {
    const baseline = await this.getBaseline(baselineId)
    if (!baseline) {
      throw new Error(`Baseline ${baselineId} not found`)
    }

    // In production, this would fetch the run metrics from database
    // For now, we'll compare with empty metrics
    const currentMetrics = this.getEmptyMetrics()

    return this.detectRegressions(baseline.metrics, currentMetrics, runId, baselineId)
  }

  /**
   * Detect regressions between two metric sets
   */
  private detectRegressions(
    baselineMetrics: EvaluationMetrics,
    currentMetrics: EvaluationMetrics,
    currentRunId: string,
    baselineId: string,
  ): RegressionResult {
    const regressions: Regression[] = []
    const improvements: Regression[] = []

    // Compare retrieval metrics
    this.compareMetric(
      'retrieval.recallAt10',
      baselineMetrics.retrieval.recallAt10,
      currentMetrics.retrieval.recallAt10,
      regressions,
      improvements,
      true,
    )
    this.compareMetric(
      'retrieval.precisionAt10',
      baselineMetrics.retrieval.precisionAt10,
      currentMetrics.retrieval.precisionAt10,
      regressions,
      improvements,
      true,
    )
    this.compareMetric(
      'retrieval.mrr',
      baselineMetrics.retrieval.mrr,
      currentMetrics.retrieval.mrr,
      regressions,
      improvements,
      true,
    )
    this.compareMetric(
      'retrieval.ndcgAt10',
      baselineMetrics.retrieval.ndcgAt10,
      currentMetrics.retrieval.ndcgAt10,
      regressions,
      improvements,
      true,
    )

    // Compare citation metrics
    this.compareMetric(
      'citation.citationPrecision',
      baselineMetrics.citation.citationPrecision,
      currentMetrics.citation.citationPrecision,
      regressions,
      improvements,
      true,
    )
    this.compareMetric(
      'citation.citationRecall',
      baselineMetrics.citation.citationRecall,
      currentMetrics.citation.citationRecall,
      regressions,
      improvements,
      true,
    )

    // Compare answer metrics
    this.compareMetric(
      'answer.groundednessScore',
      baselineMetrics.answer.groundednessScore,
      currentMetrics.answer.groundednessScore,
      regressions,
      improvements,
      true,
    )
    this.compareMetric(
      'answer.hallucinationRate',
      baselineMetrics.answer.hallucinationRate,
      currentMetrics.answer.hallucinationRate,
      regressions,
      improvements,
      false,
    )

    // Compare latency metrics
    this.compareMetric(
      'latency.p95LatencyMs',
      baselineMetrics.latency.p95LatencyMs,
      currentMetrics.latency.p95LatencyMs,
      regressions,
      improvements,
      false,
    )

    // Compare cost metrics
    this.compareMetric(
      'cost.averageCostPerQuery',
      baselineMetrics.cost.averageCostPerQuery,
      currentMetrics.cost.averageCostPerQuery,
      regressions,
      improvements,
      false,
    )

    // Compare security metrics
    this.compareMetric(
      'security.authorizationViolations',
      baselineMetrics.security.authorizationViolations,
      currentMetrics.security.authorizationViolations,
      regressions,
      improvements,
      false,
    )
    this.compareMetric(
      'security.tenantIsolationViolations',
      baselineMetrics.security.tenantIsolationViolations,
      currentMetrics.security.tenantIsolationViolations,
      regressions,
      improvements,
      false,
    )

    const hasRegressions = regressions.some(
      (r) => r.severity === 'major' || r.severity === 'critical',
    )

    const baselineComparison: BaselineComparison = {
      baselineId,
      currentRunId,
      comparisonTimestamp: new Date(),
      overallScore: this.calculateOverallScore(currentMetrics),
    }

    return {
      hasRegressions,
      regressions,
      improvements,
      baselineComparison,
    }
  }

  /**
   * Compare a single metric
   */
  private compareMetric(
    metricName: string,
    baselineValue: number,
    currentValue: number,
    regressions: Regression[],
    improvements: Regression[],
    higherIsBetter: boolean,
  ): void {
    const change = currentValue - baselineValue
    const changePercent = baselineValue !== 0 ? (change / baselineValue) * 100 : 0

    // Determine if this is a regression or improvement
    const isRegression = higherIsBetter ? change < 0 : change > 0
    const isImprovement = higherIsBetter ? change > 0 : change < 0

    if (Math.abs(changePercent) < 1) {
      return // Ignore negligible changes
    }

    const severity = this.determineRegressionSeverity(Math.abs(changePercent))

    const regression: Regression = {
      metric: metricName,
      baselineValue,
      currentValue,
      change,
      changePercent,
      severity,
    }

    if (isRegression) {
      regressions.push(regression)
    } else if (isImprovement) {
      improvements.push(regression)
    }
  }

  /**
   * Determine regression severity based on percentage change
   */
  private determineRegressionSeverity(
    changePercent: number,
  ): 'minor' | 'moderate' | 'major' | 'critical' {
    if (changePercent < 5) return 'minor'
    if (changePercent < 10) return 'moderate'
    if (changePercent < 20) return 'major'
    return 'critical'
  }

  /**
   * Calculate overall score from metrics
   */
  private calculateOverallScore(metrics: EvaluationMetrics): number {
    // Weighted average of key metrics
    const weights = {
      retrieval: 0.3,
      citation: 0.2,
      answer: 0.3,
      security: 0.2,
    }

    const retrievalScore =
      metrics.retrieval.recallAt10 * 0.4 +
      metrics.retrieval.precisionAt10 * 0.3 +
      metrics.retrieval.mrr * 0.3

    const citationScore =
      metrics.citation.citationPrecision * 0.5 + metrics.citation.citationRecall * 0.5

    const answerScore =
      metrics.answer.groundednessScore * 0.5 +
      (1 - metrics.answer.hallucinationRate) * 0.3 +
      metrics.answer.relevanceScore * 0.2

    const securityScore =
      (1 - Math.min(metrics.security.authorizationViolations / 10, 1)) * 0.4 +
      (1 - Math.min(metrics.security.tenantIsolationViolations / 10, 1)) * 0.4 +
      (1 - metrics.security.promptInjectionSuccessRate) * 0.2

    return (
      retrievalScore * weights.retrieval +
      citationScore * weights.citation +
      answerScore * weights.answer +
      securityScore * weights.security
    )
  }

  private getEmptyMetrics(): EvaluationMetrics {
    return {
      retrieval: {
        precisionAt1: 0,
        precisionAt5: 0,
        precisionAt10: 0,
        precisionAt20: 0,
        recallAt1: 0,
        recallAt5: 0,
        recallAt10: 0,
        recallAt20: 0,
        mrr: 0,
        ndcgAt5: 0,
        ndcgAt10: 0,
        hitRateAt5: 0,
        hitRateAt10: 0,
      },
      ranking: {
        orderingAccuracy: 0,
        topCandidateAccuracy: 0,
        scoreConsistency: 0,
        tieBreakingConsistency: 0,
        meanRankOfRelevant: 0,
      },
      context: {
        relevantContextRate: 0,
        irrelevantContextRate: 0,
        missingRelevantContext: 0,
        contextDuplication: 0,
        contextDiversity: 0,
        budgetUtilization: 0,
        averageContextSize: 0,
      },
      citation: {
        citationPrecision: 0,
        citationRecall: 0,
        citationCorrectness: 0,
        citationCompleteness: 0,
        validCitations: 0,
        invalidCitations: 0,
        missingCitations: 0,
        hallucinatedCitations: 0,
      },
      answer: {
        relevanceScore: 0,
        groundednessScore: 0,
        hallucinationRate: 0,
        insufficientContextRate: 0,
        conflictDetectionRate: 0,
        conceptCoverage: 0,
      },
      security: {
        authorizationViolations: 0,
        tenantIsolationViolations: 0,
        promptInjectionSuccessRate: 0,
        systemPromptLeakage: 0,
        contextLeakage: 0,
        citationSpoofing: 0,
        totalSecurityTests: 0,
        passedSecurityTests: 0,
      },
      latency: {
        averageRetrievalLatencyMs: 0,
        averageAssemblyLatencyMs: 0,
        averagePromptBuildLatencyMs: 0,
        averageModelLatencyMs: 0,
        averageCitationValidationLatencyMs: 0,
        averageTotalLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
      },
      cost: {
        totalCostUsd: 0,
        averageCostPerQuery: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        costByProvider: {},
        costByModel: {},
      },
    }
  }
}
