/* Agent governance repository — Prisma-based persistence for agent definitions. */

import { Injectable } from '@nestjs/common'
import type { AgentDefinition, AgentDefinitionStatus, EntityId } from '@contextgraph/types'
import { PrismaService } from '../../../database/prisma.service'
import type {
  IAgentGovernanceRepository,
  AgentDefinitionCreateData,
} from '../domain/governance.interfaces'

function toAgentDefinition(row: Record<string, unknown>): AgentDefinition {
  return {
    agentId: row.id as string,
    organizationId: row.organizationId as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    version: row.version as number,
    status: row.status as AgentDefinitionStatus,
    capabilities: (row.capabilities as string[]) ?? [],
    allowedTools: (row.allowedTools as string[]) ?? [],
    modelProvider: (row.modelProvider as string) ?? null,
    modelName: (row.modelName as string) ?? null,
    maxIterations: row.maxIterations as number,
    maxToolCalls: row.maxToolCalls as number,
    maxTokens: row.maxTokens as number,
    maxCost: row.maxCost as number,
    maxExecutionDurationMs: row.maxExecutionDurationMs as number,
    policyReferences: (row.policyReferences as string[]) ?? [],
    createdBy: (row.createdBy as string) ?? '',
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : (row.createdAt as string),
    updatedAt:
      row.updatedAt instanceof Date ? row.updatedAt.toISOString() : (row.updatedAt as string),
  }
}

@Injectable()
export class AgentGovernancePrismaRepository implements IAgentGovernanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: AgentDefinitionCreateData): Promise<AgentDefinition> {
    const latest = await this.prisma.agentDefinitionModel.findFirst({
      where: { organizationId: data.organizationId, name: data.name },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const nextVersion = (latest?.version ?? 0) + 1

    const row = await this.prisma.agentDefinitionModel.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        version: nextVersion,
        status: 'DRAFT',
        capabilities: data.capabilities as never,
        allowedTools: data.allowedTools as never,
        modelProvider: data.modelProvider,
        modelName: data.modelName,
        maxIterations: data.maxIterations,
        maxToolCalls: data.maxToolCalls,
        maxTokens: data.maxTokens,
        maxCost: data.maxCost,
        maxExecutionDurationMs: data.maxExecutionDurationMs,
        policyReferences: data.policyReferences as never,
        createdBy: data.createdBy,
      },
    })
    return toAgentDefinition(row as unknown as Record<string, unknown>)
  }

  async findById(agentId: EntityId): Promise<AgentDefinition | null> {
    const row = await this.prisma.agentDefinitionModel.findUnique({ where: { id: agentId } })
    return row === null ? null : toAgentDefinition(row as unknown as Record<string, unknown>)
  }

  async findByOrganization(
    organizationId: EntityId,
    status?: AgentDefinitionStatus,
  ): Promise<readonly AgentDefinition[]> {
    const where: Record<string, unknown> = { organizationId }
    if (status) where.status = status
    const rows = await this.prisma.agentDefinitionModel.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => toAgentDefinition(r as unknown as Record<string, unknown>))
  }

  async findByNameAndVersion(
    organizationId: EntityId,
    name: string,
    version: number,
  ): Promise<AgentDefinition | null> {
    const row = await this.prisma.agentDefinitionModel.findUnique({
      where: { organizationId_name_version: { organizationId, name, version } },
    })
    return row === null ? null : toAgentDefinition(row as unknown as Record<string, unknown>)
  }

  async updateStatus(agentId: EntityId, status: AgentDefinitionStatus): Promise<void> {
    await this.prisma.agentDefinitionModel.update({ where: { id: agentId }, data: { status } })
  }

  async incrementVersion(organizationId: EntityId, name: string): Promise<number> {
    const latest = await this.prisma.agentDefinitionModel.findFirst({
      where: { organizationId, name },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    return (latest?.version ?? 0) + 1
  }

  async delete(agentId: EntityId): Promise<void> {
    await this.prisma.agentDefinitionModel.update({
      where: { id: agentId },
      data: { status: 'ARCHIVED' },
    })
  }
}
