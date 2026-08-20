import { Module } from '@nestjs/common'
import { EvaluationController } from './controllers/evaluation.controller'
import { EvaluationService } from './services/evaluation.service'
import { RetrievalEvaluatorService } from './services/retrieval-evaluator.service'
import { RankingEvaluatorService } from './services/ranking-evaluator.service'
import { ContextEvaluatorService } from './services/context-evaluator.service'
import { CitationEvaluatorService } from './services/citation-evaluator.service'
import { AnswerEvaluatorService } from './services/answer-evaluator.service'
import { SecurityEvaluatorService } from './services/security-evaluator.service'
import { GroundednessEvaluatorService } from './services/groundedness-evaluator.service'
import { HallucinationDetectorService } from './services/hallucination-detector.service'
import { QualityGateEvaluatorService } from './services/quality-gate-evaluator.service'
import { BaselineService } from './services/baseline.service'
import { ExperimentService } from './services/experiment.service'
import { DatasetService } from './services/dataset.service'
import {
  IEvaluationRunner,
  IRetrievalEvaluator,
  IRankingEvaluator,
  IContextEvaluator,
  ICitationEvaluator,
  IAnswerEvaluator,
  ISecurityEvaluator,
  IGroundednessEvaluator,
  IHallucinationDetector,
  IQualityGateEvaluator,
  IBaselineService,
  IExperimentService,
  IDatasetService,
} from './domain/evaluation.interfaces'

/**
 * Evaluation Module
 *
 * Provides AI evaluation, quality, and reliability framework for ContextGraph.
 *
 * Architecture:
 * - Evaluation code must NEVER become part of the production authorization path
 * - This module measures results, it does not modify production decisions
 * - Evaluation infrastructure must follow the same security rules as production
 */
@Module({
  controllers: [EvaluationController],
  providers: [
    // Core evaluation service
    {
      provide: IEvaluationRunner,
      useClass: EvaluationService,
    },
    EvaluationService,

    // Retrieval evaluation
    {
      provide: IRetrievalEvaluator,
      useClass: RetrievalEvaluatorService,
    },
    RetrievalEvaluatorService,

    // Ranking evaluation
    {
      provide: IRankingEvaluator,
      useClass: RankingEvaluatorService,
    },
    RankingEvaluatorService,

    // Context evaluation
    {
      provide: IContextEvaluator,
      useClass: ContextEvaluatorService,
    },
    ContextEvaluatorService,

    // Citation evaluation
    {
      provide: ICitationEvaluator,
      useClass: CitationEvaluatorService,
    },
    CitationEvaluatorService,

    // Answer evaluation
    {
      provide: IAnswerEvaluator,
      useClass: AnswerEvaluatorService,
    },
    AnswerEvaluatorService,

    // Security evaluation
    {
      provide: ISecurityEvaluator,
      useClass: SecurityEvaluatorService,
    },
    SecurityEvaluatorService,

    // Groundedness evaluation
    {
      provide: IGroundednessEvaluator,
      useClass: GroundednessEvaluatorService,
    },
    GroundednessEvaluatorService,

    // Hallucination detection
    {
      provide: IHallucinationDetector,
      useClass: HallucinationDetectorService,
    },
    HallucinationDetectorService,

    // Quality gates
    {
      provide: IQualityGateEvaluator,
      useClass: QualityGateEvaluatorService,
    },
    QualityGateEvaluatorService,

    // Baseline management
    {
      provide: IBaselineService,
      useClass: BaselineService,
    },
    BaselineService,

    // Experiment management
    {
      provide: IExperimentService,
      useClass: ExperimentService,
    },
    ExperimentService,

    // Dataset management
    {
      provide: IDatasetService,
      useClass: DatasetService,
    },
    DatasetService,
  ],
  exports: [
    IEvaluationRunner,
    EvaluationService,
    IRetrievalEvaluator,
    IRankingEvaluator,
    IContextEvaluator,
    ICitationEvaluator,
    IAnswerEvaluator,
    ISecurityEvaluator,
    IGroundednessEvaluator,
    IHallucinationDetector,
    IQualityGateEvaluator,
    IBaselineService,
    IExperimentService,
    IDatasetService,
  ],
})
export class EvaluationModule {}
