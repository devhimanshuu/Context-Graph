import { Injectable } from '@nestjs/common'
import { IExperimentService } from '../domain/evaluation.interfaces'
import type { EvaluationExperiment, ExperimentConfiguration } from '../domain/evaluation.types'

/**
 * Experiment Service
 *
 * Manages evaluation experiments for comparing different configurations.
 *
 * Each experiment must record its configuration for reproducibility.
 */
@Injectable()
export class ExperimentService implements IExperimentService {
  private experiments: Map<string, EvaluationExperiment> = new Map()

  /**
   * Create a new experiment
   */
  async createExperiment(
    experiment: Omit<EvaluationExperiment, 'experimentId' | 'createdAt'>,
  ): Promise<EvaluationExperiment> {
    const newExperiment: EvaluationExperiment = {
      ...experiment,
      experimentId: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date(),
    }

    this.experiments.set(newExperiment.experimentId, newExperiment)
    return newExperiment
  }

  /**
   * Get experiment by ID
   */
  async getExperiment(experimentId: string): Promise<EvaluationExperiment | null> {
    return this.experiments.get(experimentId) || null
  }

  /**
   * List all experiments
   */
  async listExperiments(): Promise<readonly EvaluationExperiment[]> {
    return Array.from(this.experiments.values())
  }

  /**
   * Update experiment
   */
  async updateExperiment(
    experimentId: string,
    updates: Partial<EvaluationExperiment>,
  ): Promise<EvaluationExperiment> {
    const existing = await this.getExperiment(experimentId)
    if (!existing) {
      throw new Error(`Experiment ${experimentId} not found`)
    }

    const updated: EvaluationExperiment = {
      ...existing,
      ...updates,
      experimentId: existing.experimentId, // Prevent ID change
      createdAt: existing.createdAt, // Prevent date change
    }

    this.experiments.set(experimentId, updated)
    return updated
  }

  /**
   * Delete experiment
   */
  async deleteExperiment(experimentId: string): Promise<void> {
    if (!this.experiments.has(experimentId)) {
      throw new Error(`Experiment ${experimentId} not found`)
    }
    this.experiments.delete(experimentId)
  }

  /**
   * Create experiment for model comparison
   */
  async createModelComparisonExperiment(
    name: string,
    models: readonly { provider: string; model: string }[],
    datasetVersion: string,
  ): Promise<readonly EvaluationExperiment[]> {
    const experiments: EvaluationExperiment[] = []

    for (const modelConfig of models) {
      const experiment = await this.createExperiment({
        name: `${name} - ${modelConfig.provider}/${modelConfig.model}`,
        description: `Comparing ${modelConfig.provider}/${modelConfig.model}`,
        datasetVersion,
        retrievalVersion: 'current',
        pipelineVersion: 'current',
        embeddingVersion: 'current',
        model: modelConfig.model,
        provider: modelConfig.provider,
        configuration: this.getDefaultConfiguration(),
      })
      experiments.push(experiment)
    }

    return experiments
  }

  /**
   * Create experiment for retrieval comparison
   */
  async createRetrievalComparisonExperiment(
    name: string,
    configurations: readonly ExperimentConfiguration[],
    datasetVersion: string,
  ): Promise<readonly EvaluationExperiment[]> {
    const experiments: EvaluationExperiment[] = []

    for (let i = 0; i < configurations.length; i++) {
      const config = configurations[i]!
      const experiment = await this.createExperiment({
        name: `${name} - Config ${i + 1}`,
        description: `Retrieval configuration ${i + 1}`,
        datasetVersion,
        retrievalVersion: 'current',
        pipelineVersion: 'current',
        embeddingVersion: 'current',
        model: 'none',
        provider: 'none',
        configuration: config,
      })
      experiments.push(experiment)
    }

    return experiments
  }

  /**
   * Create experiment for embedding model comparison
   */
  async createEmbeddingComparisonExperiment(
    name: string,
    embeddingModels: readonly { provider: string; model: string; dimensions: number }[],
    datasetVersion: string,
  ): Promise<readonly EvaluationExperiment[]> {
    const experiments: EvaluationExperiment[] = []

    for (const embeddingModel of embeddingModels) {
      const experiment = await this.createExperiment({
        name: `${name} - ${embeddingModel.provider}/${embeddingModel.model}`,
        description: `Embedding model: ${embeddingModel.provider}/${embeddingModel.model}`,
        datasetVersion,
        retrievalVersion: 'current',
        pipelineVersion: 'current',
        embeddingVersion: `${embeddingModel.provider}/${embeddingModel.model}`,
        model: 'none',
        provider: 'none',
        configuration: {
          ...this.getDefaultConfiguration(),
          chunkSize: 512,
          chunkOverlap: 50,
        },
      })
      experiments.push(experiment)
    }

    return experiments
  }

  /**
   * Create ablation study experiment
   */
  async createAblationStudyExperiment(
    name: string,
    baseConfiguration: ExperimentConfiguration,
    ablatedComponents: readonly string[],
    datasetVersion: string,
  ): Promise<readonly EvaluationExperiment[]> {
    const experiments: EvaluationExperiment[] = []

    // Base configuration (no ablation)
    const baseExperiment = await this.createExperiment({
      name: `${name} - Full Hybrid`,
      description: 'Full hybrid retrieval (baseline)',
      datasetVersion,
      retrievalVersion: 'current',
      pipelineVersion: 'current',
      embeddingVersion: 'current',
      model: 'none',
      provider: 'none',
      configuration: baseConfiguration,
    })
    experiments.push(baseExperiment)

    // Ablated configurations
    for (const component of ablatedComponents) {
      const ablatedConfig = this.createAblatedConfiguration(baseConfiguration, component)
      const experiment = await this.createExperiment({
        name: `${name} - Without ${component}`,
        description: `Ablation: removing ${component}`,
        datasetVersion,
        retrievalVersion: 'current',
        pipelineVersion: 'current',
        embeddingVersion: 'current',
        model: 'none',
        provider: 'none',
        configuration: ablatedConfig,
      })
      experiments.push(experiment)
    }

    return experiments
  }

  /**
   * Create ablated configuration
   */
  private createAblatedConfiguration(
    baseConfig: ExperimentConfiguration,
    componentToAblate: string,
  ): ExperimentConfiguration {
    const config = { ...baseConfig }

    switch (componentToAblate) {
      case 'graph':
        config.graphWeight = 0
        break
      case 'semantic':
        config.semanticWeight = 0
        break
      case 'lexical':
        config.lexicalWeight = 0
        break
      case 'metadata':
        // Would disable metadata filtering
        break
      default:
        break
    }

    return config
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): ExperimentConfiguration {
    return {
      retrievalMode: 'HYBRID',
      topK: 20,
      chunkSize: 512,
      chunkOverlap: 50,
      graphDepth: 3,
      semanticWeight: 0.4,
      lexicalWeight: 0.3,
      graphWeight: 0.3,
      rrfParameters: {
        k: 60,
        graphBoost: 1.0,
        semanticBoost: 1.0,
        lexicalBoost: 1.0,
      },
    }
  }
}
