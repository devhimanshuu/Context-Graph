import type { Organization } from '@prisma/client'
import { OrganizationEntity } from './organization.entity'
import { type OrganizationResponseDto } from './organization.dto'

export function prismaOrganizationToEntity(row: Organization): OrganizationEntity {
  return new OrganizationEntity(
    row.id,
    row.name,
    row.slug,
    row.industry,
    row.status,
    row.configuration as Record<string, unknown>,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  )
}

export function entityToOrganizationResponse(entity: OrganizationEntity): OrganizationResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    slug: entity.slug,
    industry: entity.industry,
    status: entity.status,
    configuration: entity.configuration,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
