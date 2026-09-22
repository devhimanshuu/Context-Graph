import type { User } from '@prisma/client'
import { UserEntity } from './user.entity'
import { type UserResponseDto } from './user.dto'
import { type CreateUserInput } from './user.validation'

/* Prisma → domain boundary for users. This is the ONLY place Prisma user */
export function prismaUserToEntity(row: User): UserEntity {
  return new UserEntity(
    row.id,
    row.organizationId,
    row.departmentId,
    row.email,
    row.name,
    row.passwordHash,
    row.role,
    row.permissionLevel,
    row.complianceClearance,
    row.status,
    row.authProviderUserId,
    row.metadata as Record<string, unknown>,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  )
}

/** Domain → API response (drops internal fields like authProviderUserId). */
export function entityToUserResponse(entity: UserEntity): UserResponseDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    departmentId: entity.departmentId,
    email: entity.email,
    name: entity.name,
    role: entity.role,
    permissionLevel: entity.permissionLevel,
    complianceClearance: entity.complianceClearance,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

/** Validated create input → Prisma-safe record. */
export function createUserInputToPrisma(
  input: CreateUserInput,
  organizationId: string,
): Record<string, unknown> {
  return {
    organizationId,
    email: input.email,
    name: input.name,
    role: input.role,
    permissionLevel: input.permissionLevel,
    complianceClearance: input.complianceClearance,
    departmentId: input.departmentId ?? null,
    metadata: input.metadata,
  }
}
