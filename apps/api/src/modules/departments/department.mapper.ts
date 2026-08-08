import type { Department } from '@prisma/client'
import { DepartmentEntity } from './department.entity'
import { type DepartmentResponseDto } from './department.dto'

export function prismaDepartmentToEntity(row: Department): DepartmentEntity {
  return new DepartmentEntity(
    row.id,
    row.organizationId,
    row.parentId,
    row.name,
    row.code,
    row.hierarchyLevel,
    row.metadata as Record<string, unknown>,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  )
}

export function entityToDepartmentResponse(entity: DepartmentEntity): DepartmentResponseDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    parentId: entity.parentId,
    name: entity.name,
    code: entity.code,
    hierarchyLevel: entity.hierarchyLevel,
    metadata: entity.metadata,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
