import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { EvaluationService } from '../services/evaluation.service'
import { ExperimentService } from '../services/experiment.service'
import { BaselineService } from '../services/baseline.service'
import { DatasetService } from '../services/dataset.service'
import { QualityGateEvaluatorService } from '../services/quality-gate-evaluator.service'
import type {
  EvaluationRun,
  EvaluationExperiment,
  EvaluationBaseline,
  EvaluationDataset,
  QualityGate,
  QualityGateResult,
  EvaluationMetrics,
} from '../domain/evaluation.types'

@ApiTags('Evaluations')
@Controller('api/v1/evaluations')
export class EvaluationController {
  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly experimentService: ExperimentService,
    private readonly baselineService: BaselineService,
    private readonly datasetService: DatasetService,
    private readonly qualityGateEvaluator: QualityGateEvaluatorService,
  ) {}

  // ---------------------------------------------------------------------------
  // Evaluation Runs
  // ---------------------------------------------------------------------------

  @Post('runs')
  @ApiOperation({ summary: 'Start a new evaluation run' })
  @ApiResponse({ status: 201, description: 'Evaluation run started' })
  async startRun(
    @Body() body: { experimentId: string; datasetId: string },
  ): Promise<EvaluationRun> {
    return this.evaluationService.runExperiment(body.experimentId, body.datasetId)
  }

  @Get('runs')
  @ApiOperation({ summary: 'List evaluation runs' })
  @ApiQuery({ name: 'experimentId', required: false, description: 'Filter by experiment ID' })
  @ApiResponse({ status: 200, description: 'List of evaluation runs' })
  async listRuns(@Query('experimentId') experimentId?: string): Promise<readonly EvaluationRun[]> {
    return this.evaluationService.listRuns(experimentId)
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get evaluation run by ID' })
  @ApiResponse({ status: 200, description: 'Evaluation run details' })
  async getRun(@Param('id') id: string): Promise<EvaluationRun | null> {
    return this.evaluationService.getRun(id)
  }

  @Post('runs/:id/cancel')
  @ApiOperation({ summary: 'Cancel an evaluation run' })
  @ApiResponse({ status: 200, description: 'Run cancelled' })
  async cancelRun(@Param('id') id: string): Promise<void> {
    return this.evaluationService.cancelRun(id)
  }

  // ---------------------------------------------------------------------------
  // Experiments
  // ---------------------------------------------------------------------------

  @Post('experiments')
  @ApiOperation({ summary: 'Create a new evaluation experiment' })
  @ApiResponse({ status: 201, description: 'Experiment created' })
  async createExperiment(
    @Body() body: Omit<EvaluationExperiment, 'experimentId' | 'createdAt'>,
  ): Promise<EvaluationExperiment> {
    return this.experimentService.createExperiment(body)
  }

  @Get('experiments')
  @ApiOperation({ summary: 'List all experiments' })
  @ApiResponse({ status: 200, description: 'List of experiments' })
  async listExperiments(): Promise<readonly EvaluationExperiment[]> {
    return this.experimentService.listExperiments()
  }

  @Get('experiments/:id')
  @ApiOperation({ summary: 'Get experiment by ID' })
  @ApiResponse({ status: 200, description: 'Experiment details' })
  async getExperiment(@Param('id') id: string): Promise<EvaluationExperiment | null> {
    return this.experimentService.getExperiment(id)
  }

  @Put('experiments/:id')
  @ApiOperation({ summary: 'Update experiment' })
  @ApiResponse({ status: 200, description: 'Experiment updated' })
  async updateExperiment(
    @Param('id') id: string,
    @Body() body: Partial<EvaluationExperiment>,
  ): Promise<EvaluationExperiment> {
    return this.experimentService.updateExperiment(id, body)
  }

  @Delete('experiments/:id')
  @ApiOperation({ summary: 'Delete experiment' })
  @ApiResponse({ status: 200, description: 'Experiment deleted' })
  async deleteExperiment(@Param('id') id: string): Promise<void> {
    return this.experimentService.deleteExperiment(id)
  }

  // ---------------------------------------------------------------------------
  // Datasets
  // ---------------------------------------------------------------------------

  @Post('datasets')
  @ApiOperation({ summary: 'Create a new evaluation dataset' })
  @ApiResponse({ status: 201, description: 'Dataset created' })
  async createDataset(
    @Body() body: Omit<EvaluationDataset, 'datasetId' | 'createdAt' | 'updatedAt'>,
  ): Promise<EvaluationDataset> {
    return this.datasetService.createDataset(body)
  }

  @Get('datasets')
  @ApiOperation({ summary: 'List all datasets' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'List of datasets' })
  async listDatasets(@Query('category') category?: string): Promise<readonly EvaluationDataset[]> {
    return this.datasetService.listDatasets(category)
  }

  @Get('datasets/:id')
  @ApiOperation({ summary: 'Get dataset by ID' })
  @ApiResponse({ status: 200, description: 'Dataset details' })
  async getDataset(@Param('id') id: string): Promise<EvaluationDataset | null> {
    return this.datasetService.getDataset(id)
  }

  @Get('datasets/version/:version')
  @ApiOperation({ summary: 'Get dataset by version' })
  @ApiResponse({ status: 200, description: 'Dataset details' })
  async getDatasetByVersion(@Param('version') version: string): Promise<EvaluationDataset | null> {
    return this.datasetService.getDatasetByVersion(version)
  }

  // ---------------------------------------------------------------------------
  // Baselines
  // ---------------------------------------------------------------------------

  @Post('baselines')
  @ApiOperation({ summary: 'Create a new baseline' })
  @ApiResponse({ status: 201, description: 'Baseline created' })
  async createBaseline(@Body() body: { name: string; runId: string }): Promise<EvaluationBaseline> {
    return this.baselineService.createBaseline(body.name, body.runId)
  }

  @Get('baselines')
  @ApiOperation({ summary: 'List all baselines' })
  @ApiResponse({ status: 200, description: 'List of baselines' })
  async listBaselines(): Promise<readonly EvaluationBaseline[]> {
    return this.baselineService.listBaselines()
  }

  @Get('baselines/:id')
  @ApiOperation({ summary: 'Get baseline by ID' })
  @ApiResponse({ status: 200, description: 'Baseline details' })
  async getBaseline(@Param('id') id: string): Promise<EvaluationBaseline | null> {
    return this.baselineService.getBaseline(id)
  }

  @Post('baselines/:id/compare')
  @ApiOperation({ summary: 'Compare run with baseline' })
  @ApiResponse({ status: 200, description: 'Regression analysis' })
  async compareWithBaseline(@Param('id') baselineId: string, @Body() body: { runId: string }) {
    return this.baselineService.compareWithBaseline(body.runId, baselineId)
  }

  // ---------------------------------------------------------------------------
  // Quality Gates
  // ---------------------------------------------------------------------------

  @Post('quality-gates/evaluate')
  @ApiOperation({ summary: 'Evaluate quality gates for metrics' })
  @ApiResponse({ status: 200, description: 'Quality gate evaluation result' })
  async evaluateQualityGates(
    @Body() body: { metrics: EvaluationMetrics; gateId?: string },
  ): Promise<QualityGateResult> {
    const gate = body.gateId
      ? await this.baselineService.getBaseline(body.gateId)
      : this.qualityGateEvaluator.getDefaultGate()

    return this.qualityGateEvaluator.evaluateGates(body.metrics, gate as QualityGate)
  }

  @Get('quality-gates/default')
  @ApiOperation({ summary: 'Get default quality gate configuration' })
  @ApiResponse({ status: 200, description: 'Default quality gate' })
  async getDefaultQualityGate() {
    return this.qualityGateEvaluator.getDefaultGate()
  }

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------

  @Post('runs/:id/metrics')
  @ApiOperation({ summary: 'Get metrics for a run' })
  @ApiResponse({ status: 200, description: 'Evaluation metrics' })
  async getRunMetrics(@Param('id') id: string): Promise<EvaluationMetrics | null> {
    const run = await this.evaluationService.getRun(id)
    return run?.metrics || null
  }
}
