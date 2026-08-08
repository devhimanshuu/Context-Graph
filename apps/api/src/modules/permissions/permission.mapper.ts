import type { PermissionProfile } from '@prisma/client'
import { PermissionProfileEntity } from './permission-profile.entity'
import { type PermissionProfileResponseDto } from './permission.dto'

export function prismaProfileToEntity(row: PermissionProfile): PermissionProfileEntity {
  return new PermissionProfileEntity(
    row.id,
    row.organizationId,
    row.workspaceId,
    row.name,
    row.description,
    row.rules as Record<string, unknown>,
    row.isDefault,
    row.version,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  )
}

export function entityToProfileResponse(
  entity: PermissionProfileEntity,
): PermissionProfileResponseDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    workspaceId: entity.workspaceId,
    name: entity.name,
    description: entity.description,
    rules: entity.rules,
    isDefault: entity.isDefault,
    version: entity.version,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
