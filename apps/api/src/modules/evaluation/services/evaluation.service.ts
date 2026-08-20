import { Injectable } from '@nestjs/common'
import { IEvaluationRunner } from '../domain/evaluation.interfaces'
import type {
  EvaluationRun,
  EvaluationCase,
  EvaluationCaseResult,
  EvaluationMetrics,
  CaseRetrievalMetrics,
  CaseContextMetrics,
  CaseCitationMetrics,
  CaseAnswerMetrics,
  CaseSecurityMetrics,
  CaseLatencyMetrics,
  CaseTokenUsage,
} from '../domain/evaluation.types'
import { RetrievalEvaluatorService } from './retrieval-evaluator.service'
import { RankingEvaluatorService } from './ranking-evaluator.service'
import { ContextEvaluatorService } from './context-evaluator.service'
import { CitationEvaluatorService } from './citation-evaluator.service'
import { AnswerEvaluatorService } from './answer-evaluator.service'
import { SecurityEvaluatorService } from './security-evaluator.service'
import { GroundednessEvaluatorService } from './groundedness-evaluator.service'
import { HallucinationDetectorService } from './hallucination-detector.service'

/**
 * Evaluation Service
 *
 * Main orchestrator for evaluation runs.
 *
 * Evaluation code must NEVER become part of the production authorization path.
 * This service measures results, it does not modify production decisions.
 */
@Injectable()
export class EvaluationService implements IEvaluationRunner {
  private runs: Map<string, EvaluationRun> = new Map()

  constructor(
    private readonly retrievalEvaluator: RetrievalEvaluatorService,
    private readonly rankingEvaluator: RankingEvaluatorService,
    private readonly contextEvaluator: ContextEvaluatorService,
    private readonly citationEvaluator: CitationEvaluatorService,
    private readonly answerEvaluator: AnswerEvaluatorService,
    private readonly securityEvaluator: SecurityEvaluatorService,
    private readonly groundednessEvaluator: GroundednessEvaluatorService,
    private readonly hallucinationDetector: HallucinationDetectorService,
  ) {}

  /**
   * Run evaluation experiment
   */
  async runExperiment(experimentId: string, datasetId: string): Promise<EvaluationRun> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const run: EvaluationRun = {
      runId,
      experimentId,
      status: 'running',
      startedAt: new Date(),
      totalCases: 0,
      passedCases: 0,
      failedCases: 0,
      metrics: this.getEmptyMetrics(),
      errors: [],
      metadata: {
        datasetVersion: datasetId,
        pipelineVersion: 'current',
        embeddingModel: 'current',
        embeddingVersion: 'current',
        llmProvider: 'unknown',
        llmModel: 'unknown',
        promptVersion: 'v1',
        codeVersion: 'current',
        environment: 'evaluation',
      },
    }

    this.runs.set(runId, run)

    // In production, this would:
    // 1. Load dataset cases
    // 2. Execute each case through the pipeline
    // 3. Collect results
    // 4. Calculate aggregate metrics

    return run
  }

  /**
   * Run single evaluation case
   */
  async runCase(
    evaluationCase: EvaluationCase,
    _configuration: Record<string, unknown>,
  ): Promise<EvaluationCaseResult> {
    // Simulate evaluation (in production, this would call actual services)
    const result: EvaluationCaseResult = {
      caseId: evaluationCase.caseId,
      status: 'passed',
      retrievalMetrics: this.getEmptyCaseRetrievalMetrics(),
      contextMetrics: this.getEmptyCaseContextMetrics(),
      citationMetrics: this.getEmptyCaseCitationMetrics(),
      answerMetrics: this.getEmptyCaseAnswerMetrics(),
      securityMetrics: this.getEmptyCaseSecurityMetrics(),
      latency: this.getEmptyCaseLatencyMetrics(),
      tokenUsage: this.getEmptyCaseTokenUsage(),
      cost: 0,
      errors: [],
    }

    return result
  }

  /**
   * Get run by ID
   */
  async getRun(runId: string): Promise<EvaluationRun | null> {
    return this.runs.get(runId) || null
  }

  /**
   * List runs
   */
  async listRuns(experimentId?: string): Promise<readonly EvaluationRun[]> {
    const runs = Array.from(this.runs.values())
    if (experimentId) {
      return runs.filter((run) => run.experimentId === experimentId)
    }
    return runs
  }

  /**
   * Cancel run
   */
  async cancelRun(runId: string): Promise<void> {
    const run = await this.getRun(runId)
    if (!run) {
      throw new Error(`Run ${runId} not found`)
    }

    const updatedRun: EvaluationRun = {
      ...run,
      status: 'cancelled',
      completedAt: new Date(),
    }

    this.runs.set(runId, updatedRun)
  }

  /**
   * Evaluate retrieval metrics for a case
   */
  evaluateRetrieval(
    retrievedNodes: readonly string[],
    expectedRelevantNodes: readonly string[],
    expectedExcludedNodes: readonly string[],
  ): CaseRetrievalMetrics {
    const metrics = this.retrievalEvaluator.evaluateRetrieval(
      retrievedNodes,
      expectedRelevantNodes,
      expectedExcludedNodes,
    )

    const relevantRetrieved = retrievedNodes.filter((node) => expectedRelevantNodes.includes(node))
    const missedRelevant = expectedRelevantNodes.filter((node) => !retrievedNodes.includes(node))
    const irrelevantRetrieved = retrievedNodes.filter(
      (node) => !expectedRelevantNodes.includes(node) && !expectedExcludedNodes.includes(node),
    )

    const precisionAtK: Record<number, number> = {}
    const recallAtK: Record<number, number> = {}

    for (const k of [1, 5, 10, 20]) {
      precisionAtK[k] = this.retrievalEvaluator.calculatePrecisionAtK(
        retrievedNodes,
        expectedRelevantNodes,
        k,
      )
      recallAtK[k] = this.retrievalEvaluator.calculateRecallAtK(
        retrievedNodes,
        expectedRelevantNodes,
        k,
      )
    }

    return {
      retrievedNodes,
      relevantRetrieved,
      missedRelevant,
      irrelevantRetrieved,
      precisionAtK,
      recallAtK,
      mrr: metrics.mrr,
    }
  }

  /**
   * Evaluate context quality for a case
   */
  evaluateContext(
    contextItems: readonly { nodeId: string; content: string; relevanceScore: number }[],
    expectedRelevantNodes: readonly string[],
    budgetConstraints: { maxTokens: number; maxItems: number },
  ): CaseContextMetrics {
    const metrics = this.contextEvaluator.evaluateContext(
      contextItems,
      expectedRelevantNodes,
      budgetConstraints,
    )

    return {
      contextSize: contextItems.length,
      relevantItems: contextItems.filter(
        (item) => expectedRelevantNodes.includes(item.nodeId) || item.relevanceScore > 0.5,
      ).length,
      irrelevantItems: contextItems.filter(
        (item) => !expectedRelevantNodes.includes(item.nodeId) && item.relevanceScore <= 0.5,
      ).length,
      budgetUtilization: metrics.budgetUtilization,
      duplicationRate: metrics.contextDuplication,
    }
  }

  /**
   * Evaluate citations for a case
   */
  evaluateCitations(
    responseText: string,
    citations: readonly { nodeId: string; claim: string; position: number }[],
    contextNodes: readonly { nodeId: string; content: string }[],
    expectedCitations: readonly { nodeId: string; expectedClaim: string }[],
  ): CaseCitationMetrics {
    const metrics = this.citationEvaluator.evaluateCitations(
      responseText,
      citations,
      contextNodes,
      expectedCitations,
    )

    return {
      expectedCitations: expectedCitations.length,
      actualCitations: citations.length,
      validCitations: metrics.validCitations,
      invalidCitations: metrics.invalidCitations,
      precision: metrics.citationPrecision,
      recall: metrics.citationRecall,
    }
  }

  /**
   * Evaluate answer quality for a case
   */
  evaluateAnswer(
    answer: string,
    query: string,
    context: readonly string[],
    expectedCharacteristics: {
      mustContainConcepts: readonly string[]
      mustNotContainConcepts: readonly string[]
      minRelevanceScore: number
    },
  ): CaseAnswerMetrics {
    const answerMetrics = this.answerEvaluator.evaluateAnswer(
      answer,
      query,
      context,
      expectedCharacteristics,
    )

    const groundednessResult = this.groundednessEvaluator.evaluateGroundedness(answer, context, [])

    const hallucinationResult = this.hallucinationDetector.detectHallucinations(
      answer,
      context,
      query,
    )

    return {
      relevanceScore: answerMetrics.relevanceScore,
      groundednessScore: groundednessResult.groundednessScore,
      containsRequiredConcepts: answerMetrics.conceptCoverage > 0.7,
      containsForbiddenConcepts: answerMetrics.conceptCoverage < 0.3,
      hallucinationDetected: hallucinationResult.hallucinationDetected,
    }
  }

  /**
   * Evaluate security for a case
   */
  evaluateSecurity(
    contextItems: readonly { organizationId: string; nodeId: string }[],
    authorizedOrganizationId: string,
    forbiddenNodeIds: readonly string[],
    response: string,
    injectedInstructions: readonly string[],
  ): CaseSecurityMetrics {
    const authMetrics = this.securityEvaluator.evaluateAuthorization(
      contextItems,
      authorizedOrganizationId,
      forbiddenNodeIds,
    )

    const injectionMetrics = this.securityEvaluator.evaluatePromptInjection(
      response,
      injectedInstructions,
      [],
    )

    return {
      authorizationPassed: authMetrics.authorizationViolations === 0,
      tenantIsolationPassed: authMetrics.tenantIsolationViolations === 0,
      promptInjectionResisted: injectionMetrics.promptInjectionSuccessRate < 0.1,
      systemPromptNotLeaked: injectionMetrics.systemPromptLeakage === 0,
      violations: [
        ...Array(authMetrics.authorizationViolations).fill('AUTHORIZATION'),
        ...Array(authMetrics.tenantIsolationViolations).fill('TENANT_ISOLATION'),
        ...Array(injectionMetrics.systemPromptLeakage).fill('SYSTEM_PROMPT_LEAKAGE'),
      ],
    }
  }

  /**
   * Aggregate metrics across multiple case results
   */
  aggregateMetrics(results: readonly EvaluationCaseResult[]): EvaluationMetrics {
    if (results.length === 0) {
      return this.getEmptyMetrics()
    }

    // Aggregate retrieval metrics
    const retrievalMetrics = this.aggregateRetrievalMetrics(results)

    // Aggregate citation metrics
    const citationMetrics = this.aggregateCitationMetrics(results)

    // Aggregate answer metrics
    const answerMetrics = this.aggregateAnswerMetrics(results)

    // Aggregate security metrics
    const securityMetrics = this.aggregateSecurityMetrics(results)

    // Calculate latency metrics
    const latencyMetrics = this.calculateLatencyMetrics(results)

    // Calculate cost metrics
    const costMetrics = this.calculateCostMetrics(results)

    return {
      retrieval: retrievalMetrics,
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
      citation: citationMetrics,
      answer: answerMetrics,
      security: securityMetrics,
      latency: latencyMetrics,
      cost: costMetrics,
    }
  }

  private aggregateRetrievalMetrics(
    results: readonly EvaluationCaseResult[],
  ): EvaluationMetrics['retrieval'] {
    const aggregated = {
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
    }

    for (const result of results) {
      aggregated.precisionAt1 += result.retrievalMetrics.precisionAtK[1] || 0
      aggregated.precisionAt5 += result.retrievalMetrics.precisionAtK[5] || 0
      aggregated.precisionAt10 += result.retrievalMetrics.precisionAtK[10] || 0
      aggregated.precisionAt20 += result.retrievalMetrics.precisionAtK[20] || 0
      aggregated.recallAt1 += result.retrievalMetrics.recallAtK[1] || 0
      aggregated.recallAt5 += result.retrievalMetrics.recallAtK[5] || 0
      aggregated.recallAt10 += result.retrievalMetrics.recallAtK[10] || 0
      aggregated.recallAt20 += result.retrievalMetrics.recallAtK[20] || 0
      aggregated.mrr += result.retrievalMetrics.mrr
    }

    const n = results.length
    return {
      ...aggregated,
      precisionAt1: aggregated.precisionAt1 / n,
      precisionAt5: aggregated.precisionAt5 / n,
      precisionAt10: aggregated.precisionAt10 / n,
      precisionAt20: aggregated.precisionAt20 / n,
      recallAt1: aggregated.recallAt1 / n,
      recallAt5: aggregated.recallAt5 / n,
      recallAt10: aggregated.recallAt10 / n,
      recallAt20: aggregated.recallAt20 / n,
      mrr: aggregated.mrr / n,
      ndcgAt5: aggregated.ndcgAt5 / n,
      ndcgAt10: aggregated.ndcgAt10 / n,
      hitRateAt5: aggregated.hitRateAt5 / n,
      hitRateAt10: aggregated.hitRateAt10 / n,
    }
  }

  private aggregateCitationMetrics(
    results: readonly EvaluationCaseResult[],
  ): EvaluationMetrics['citation'] {
    const aggregated = {
      citationPrecision: 0,
      citationRecall: 0,
      citationCorrectness: 0,
      citationCompleteness: 0,
      validCitations: 0,
      invalidCitations: 0,
      missingCitations: 0,
      hallucinatedCitations: 0,
    }

    for (const result of results) {
      aggregated.citationPrecision += result.citationMetrics.precision
      aggregated.citationRecall += result.citationMetrics.recall
      aggregated.validCitations += result.citationMetrics.validCitations
      aggregated.invalidCitations += result.citationMetrics.invalidCitations
    }

    const n = results.length
    return {
      ...aggregated,
      citationPrecision: aggregated.citationPrecision / n,
      citationRecall: aggregated.citationRecall / n,
      validCitations: aggregated.validCitations / n,
      invalidCitations: aggregated.invalidCitations / n,
    }
  }

  private aggregateAnswerMetrics(
    results: readonly EvaluationCaseResult[],
  ): EvaluationMetrics['answer'] {
    const aggregated = {
      relevanceScore: 0,
      groundednessScore: 0,
      hallucinationRate: 0,
      insufficientContextRate: 0,
      conflictDetectionRate: 0,
      conceptCoverage: 0,
    }

    for (const result of results) {
      aggregated.relevanceScore += result.answerMetrics.relevanceScore
      aggregated.groundednessScore += result.answerMetrics.groundednessScore
      aggregated.hallucinationRate += result.answerMetrics.hallucinationDetected ? 1 : 0
    }

    const n = results.length
    return {
      ...aggregated,
      relevanceScore: aggregated.relevanceScore / n,
      groundednessScore: aggregated.groundednessScore / n,
      hallucinationRate: aggregated.hallucinationRate / n,
    }
  }

  private aggregateSecurityMetrics(
    results: readonly EvaluationCaseResult[],
  ): EvaluationMetrics['security'] {
    const aggregated = {
      authorizationViolations: 0,
      tenantIsolationViolations: 0,
      promptInjectionSuccessRate: 0,
      systemPromptLeakage: 0,
      contextLeakage: 0,
      citationSpoofing: 0,
      totalSecurityTests: 0,
      passedSecurityTests: 0,
    }

    for (const result of results) {
      if (!result.securityMetrics.authorizationPassed) {
        aggregated.authorizationViolations++
      }
      if (!result.securityMetrics.tenantIsolationPassed) {
        aggregated.tenantIsolationViolations++
      }
      if (!result.securityMetrics.promptInjectionResisted) {
        aggregated.promptInjectionSuccessRate++
      }
      if (!result.securityMetrics.systemPromptNotLeaked) {
        aggregated.systemPromptLeakage++
      }
      aggregated.totalSecurityTests += result.securityMetrics.violations.length + 1
      aggregated.passedSecurityTests += result.securityMetrics.violations.length === 0 ? 1 : 0
    }

    const n = results.length
    return {
      ...aggregated,
      promptInjectionSuccessRate: aggregated.promptInjectionSuccessRate / n,
    }
  }

  private calculateLatencyMetrics(
    results: readonly EvaluationCaseResult[],
  ): EvaluationMetrics['latency'] {
    const latencies = results.map((r) => r.latency.totalMs).sort((a, b) => a - b)
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

    return {
      averageRetrievalLatencyMs:
        results.reduce((sum, r) => sum + r.latency.retrievalMs, 0) / results.length,
      averageAssemblyLatencyMs:
        results.reduce((sum, r) => sum + r.latency.assemblyMs, 0) / results.length,
      averagePromptBuildLatencyMs:
        results.reduce((sum, r) => sum + r.latency.promptBuildMs, 0) / results.length,
      averageModelLatencyMs:
        results.reduce((sum, r) => sum + r.latency.modelMs, 0) / results.length,
      averageCitationValidationLatencyMs:
        results.reduce((sum, r) => sum + r.latency.citationValidationMs, 0) / results.length,
      averageTotalLatencyMs: avgLatency,
      p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] || 0,
    }
  }

  private calculateCostMetrics(
    results: readonly EvaluationCaseResult[],
  ): EvaluationMetrics['cost'] {
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0)
    const totalInputTokens = results.reduce((sum, r) => sum + r.tokenUsage.inputTokens, 0)
    const totalOutputTokens = results.reduce((sum, r) => sum + r.tokenUsage.outputTokens, 0)

    return {
      totalCostUsd: totalCost,
      averageCostPerQuery: results.length > 0 ? totalCost / results.length : 0,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      costByProvider: {},
      costByModel: {},
    }
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

  private getEmptyCaseRetrievalMetrics(): CaseRetrievalMetrics {
    return {
      retrievedNodes: [],
      relevantRetrieved: [],
      missedRelevant: [],
      irrelevantRetrieved: [],
      precisionAtK: {},
      recallAtK: {},
      mrr: 0,
    }
  }

  private getEmptyCaseContextMetrics(): CaseContextMetrics {
    return {
      contextSize: 0,
      relevantItems: 0,
      irrelevantItems: 0,
      budgetUtilization: 0,
      duplicationRate: 0,
    }
  }

  private getEmptyCaseCitationMetrics(): CaseCitationMetrics {
    return {
      expectedCitations: 0,
      actualCitations: 0,
      validCitations: 0,
      invalidCitations: 0,
      precision: 0,
      recall: 0,
    }
  }

  private getEmptyCaseAnswerMetrics(): CaseAnswerMetrics {
    return {
      relevanceScore: 0,
      groundednessScore: 0,
      containsRequiredConcepts: false,
      containsForbiddenConcepts: false,
      hallucinationDetected: false,
    }
  }

  private getEmptyCaseSecurityMetrics(): CaseSecurityMetrics {
    return {
      authorizationPassed: true,
      tenantIsolationPassed: true,
      promptInjectionResisted: true,
      systemPromptNotLeaked: true,
      violations: [],
    }
  }

  private getEmptyCaseLatencyMetrics(): CaseLatencyMetrics {
    return {
      retrievalMs: 0,
      assemblyMs: 0,
      promptBuildMs: 0,
      modelMs: 0,
      citationValidationMs: 0,
      totalMs: 0,
    }
  }

  private getEmptyCaseTokenUsage(): CaseTokenUsage {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    }
  }
}
