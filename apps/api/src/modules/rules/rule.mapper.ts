import type { ContextRule } from '@prisma/client'
import { ContextRuleEntity } from './rule.entity'
import { type ContextRuleResponseDto } from './rule.dto'

export function prismaRuleToEntity(row: ContextRule): ContextRuleEntity {
  return new ContextRuleEntity(
    row.id,
    row.organizationId,
    row.workspaceId,
    row.name,
    row.description,
    row.condition as Record<string, unknown>,
    row.action as Record<string, unknown>,
    row.priority,
    row.status,
    row.isEnabled,
    row.version,
    row.createdById,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  )
}

export function entityToRuleResponse(entity: ContextRuleEntity): ContextRuleResponseDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    workspaceId: entity.workspaceId,
    name: entity.name,
    description: entity.description,
    condition: entity.condition,
    action: entity.action,
    priority: entity.priority,
    status: entity.status,
    isEnabled: entity.isEnabled,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
