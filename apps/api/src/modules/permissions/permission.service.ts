import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, EntityId } from '@contextgraph/types'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { IProfilesRepository } from './permission.repository'
import { type PermissionProfileResponseDto, type CompiledPermissionsDto } from './permission.dto'
import { entityToProfileResponse } from './permission.mapper'
import type { CreateProfileInput } from './permission.validation'

export abstract class IPermissionService {
  abstract listProfiles(organizationId: EntityId): Promise<PermissionProfileResponseDto[]>
  abstract getProfile(id: EntityId): Promise<PermissionProfileResponseDto>
  abstract createProfile(
    organizationId: EntityId,
    input: CreateProfileInput,
  ): Promise<PermissionProfileResponseDto>
  abstract compileUserPermissions(user: AuthenticatedUser): Promise<CompiledPermissionsDto>
  abstract assignProfile(
    profileId: EntityId,
    userId: EntityId,
    actorId: EntityId | null,
  ): Promise<void>
}

/* Scaffold: `compileUserPermissions` resolves the user's profiles. The */
@Injectable()
export class PermissionService implements IPermissionService {
  constructor(@Inject(IProfilesRepository) private readonly repository: IProfilesRepository) {}

  async listProfiles(organizationId: EntityId): Promise<PermissionProfileResponseDto[]> {
    const profiles = await this.repository.findByOrganization(organizationId)
    return profiles.map((profile) => entityToProfileResponse(profile))
  }

  async getProfile(id: EntityId): Promise<PermissionProfileResponseDto> {
    const profile = await this.repository.findById(id)
    if (profile === null) throw new NotFoundException('Permission profile not found')
    return entityToProfileResponse(profile)
  }

  async createProfile(
    organizationId: EntityId,
    input: CreateProfileInput,
  ): Promise<PermissionProfileResponseDto> {
    const profile = await this.repository.create({
      organizationId,
      name: input.name,
      description: input.description ?? null,
      workspaceId: input.workspaceId ?? null,
      rules: input.rules,
      isDefault: input.isDefault,
    })
    return entityToProfileResponse(profile)
  }

  async compileUserPermissions(user: AuthenticatedUser): Promise<CompiledPermissionsDto> {
    const profiles = await this.repository.findProfilesForUser(user.id)
    // Coarse scaffold: base grants from the principal's own level.
    const grants = [`knowledge-node:${user.permissionLevel}`, ...profiles.map((p) => p.name)]
    return {
      userId: user.id,
      grants,
      compiledFromVersion: Math.max(1, ...profiles.map((p) => p.version)),
    }
  }

  async assignProfile(
    profileId: EntityId,
    userId: EntityId,
    actorId: EntityId | null,
  ): Promise<void> {
    await this.getProfile(profileId)
    await this.repository.assign(profileId, userId, actorId)
  }
}
