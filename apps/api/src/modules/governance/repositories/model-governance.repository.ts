/* Model governance repository — Prisma-based persistence for model provider configurations. */

import { Injectable } from '@nestjs/common'
import type { ModelProviderConfiguration, ModelProviderStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IModelGovernanceRepository,
  ModelConfigCreateData,
} from '../domain/governance.interfaces'

function toModelConfig(row: Record<string, unknown>): ModelProviderConfiguration {
  return {
    configId: row.id as string,
    organizationId: row.organizationId as string,
    provider: row.provider as string,
    status: row.status as ModelProviderStatus,
    allowedModels: (row.allowedModels as string[]) ?? [],
    blockedModels: (row.blockedModels as string[]) ?? [],
    defaultModel: (row.defaultModel as string) ?? null,
    fallbackModel: (row.fallbackModel as string) ?? null,
    maxTokensPerRequest: row.maxTokensPerRequest as number,
    costPerInputToken: row.costPerInputToken as number,
    costPerOutputToken: row.costPerOutputToken as number,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }
}

@Injectable()
export class ModelGovernancePrismaRepository implements IModelGovernanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ModelConfigCreateData): Promise<ModelProviderConfiguration> {
    const row = await this.prisma.modelProviderConfiguration.create({
      data: {
        organizationId: data.organizationId,
        provider: data.provider,
        status: data.status,
        allowedModels: data.allowedModels as never,
        blockedModels: data.blockedModels as never,
        defaultModel: data.defaultModel,
        fallbackModel: data.fallbackModel,
        maxTokensPerRequest: data.maxTokensPerRequest,
        costPerInputToken: data.costPerInputToken,
        costPerOutputToken: data.costPerOutputToken,
        metadata: data.metadata as never,
      },
    })
    return toModelConfig(row as unknown as Record<string, unknown>)
  }

  async findById(configId: EntityId): Promise<ModelProviderConfiguration | null> {
    const row = await this.prisma.modelProviderConfiguration.findUnique({ where: { id: configId } })
    return row === null ? null : toModelConfig(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
  ): Promise<readonly ModelProviderConfiguration[]> {
    const rows = await this.prisma.modelProviderConfiguration.findMany({
      where: { organizationId },
    })
    return rows.map((r) => toModelConfig(r as unknown as Record<string, unknown>))
  }

  async findByProvider(
    organizationId: EntityId,
    provider: string,
  ): Promise<ModelProviderConfiguration | null> {
    const row = await this.prisma.modelProviderConfiguration.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    })
    return row === null ? null : toModelConfig(row as unknown as Record<string, unknown>)
  }

  async update(
    configId: EntityId,
    data: Partial<ModelConfigCreateData>,
  ): Promise<ModelProviderConfiguration> {
    const updateData: Record<string, unknown> = {}
    if (data.status !== undefined) updateData.status = data.status
    if (data.allowedModels !== undefined) updateData.allowedModels = data.allowedModels
    if (data.blockedModels !== undefined) updateData.blockedModels = data.blockedModels
    if (data.defaultModel !== undefined) updateData.defaultModel = data.defaultModel
    if (data.fallbackModel !== undefined) updateData.fallbackModel = data.fallbackModel
    if (data.maxTokensPerRequest !== undefined)
      updateData.maxTokensPerRequest = data.maxTokensPerRequest
    if (data.costPerInputToken !== undefined) updateData.costPerInputToken = data.costPerInputToken
    if (data.costPerOutputToken !== undefined)
      updateData.costPerOutputToken = data.costPerOutputToken
    const row = await this.prisma.modelProviderConfiguration.update({
      where: { id: configId },
      data: updateData,
    })
    return toModelConfig(row as unknown as Record<string, unknown>)
  }

  async delete(configId: EntityId): Promise<void> {
    await this.prisma.modelProviderConfiguration.delete({ where: { id: configId } })
  }

  async isModelAllowed(
    organizationId: EntityId,
    provider: string,
    model: string,
  ): Promise<boolean> {
    const config = await this.findByProvider(organizationId, provider)
    if (!config || config.status !== 'ACTIVE') return false
    if (config.blockedModels.includes(model)) return false
    if (config.allowedModels.length > 0 && !config.allowedModels.includes(model)) return false
    return true
  }
}
