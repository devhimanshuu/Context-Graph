import { Inject, Injectable } from '@nestjs/common'
import { type Paginated, type PaginationParams } from '@contextgraph/shared'
import type { EntityId } from '@contextgraph/types'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { IUsersRepository } from './user.repository'
import { type UserEntity } from './user.entity'
import { type UserResponseDto } from './user.dto'
import { createUserInputToPrisma, entityToUserResponse } from './user.mapper'
import type { CreateUserInput, UpdateUserInput } from './user.validation'

export abstract class IUsersService {
  abstract findById(organizationId: EntityId, id: EntityId): Promise<UserResponseDto>
  abstract findByOrganization(organizationId: EntityId): Promise<UserResponseDto[]>
  abstract list(
    organizationId: EntityId,
    pagination: PaginationParams,
  ): Promise<Paginated<UserResponseDto>>
  abstract create(organizationId: EntityId, input: CreateUserInput): Promise<UserResponseDto>
  abstract update(
    organizationId: EntityId,
    id: EntityId,
    input: UpdateUserInput,
  ): Promise<UserResponseDto>
  abstract remove(organizationId: EntityId, id: EntityId): Promise<void>
}

/* Thin orchestration layer: maps DTOs → repository calls and back. Business */
@Injectable()
export class UsersService implements IUsersService {
  constructor(@Inject(IUsersRepository) private readonly repository: IUsersRepository) {}

  async findById(organizationId: EntityId, id: EntityId): Promise<UserResponseDto> {
    const user = await this.ensureExists(id, organizationId)
    return entityToUserResponse(user)
  }

  async findByOrganization(organizationId: EntityId): Promise<UserResponseDto[]> {
    const users = await this.repository.findByOrganization(organizationId)
    return users.map((user) => entityToUserResponse(user))
  }

  async list(
    organizationId: EntityId,
    pagination: PaginationParams,
  ): Promise<Paginated<UserResponseDto>> {
    const users = await this.repository.findByOrganization(organizationId)
    const total = await this.repository.countByOrganization(organizationId)
    const start = (pagination.page - 1) * pagination.limit
    const pageItems = users.slice(start, start + pagination.limit)
    const totalPages = Math.max(1, Math.ceil(total / pagination.limit))

    return {
      items: pageItems.map((user) => entityToUserResponse(user)),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1,
      },
    }
  }

  async create(organizationId: EntityId, input: CreateUserInput): Promise<UserResponseDto> {
    const existing = await this.repository.findByEmail(organizationId, input.email)
    if (existing !== null) {
      throw new ConflictException('A user with this email already exists in the organization')
    }
    const user = await this.repository.create(createUserInputToPrisma(input, organizationId))
    return entityToUserResponse(user)
  }

  async update(
    organizationId: EntityId,
    id: EntityId,
    input: UpdateUserInput,
  ): Promise<UserResponseDto> {
    await this.ensureExists(id, organizationId)
    const user = await this.repository.update(id, input)
    return entityToUserResponse(user)
  }

  async remove(organizationId: EntityId, id: EntityId): Promise<void> {
    await this.ensureExists(id, organizationId)
    await this.repository.softDelete(id)
  }

  /** Fails with 404 when the user is missing OR belongs to another tenant. */
  private async ensureExists(id: EntityId, organizationId: EntityId): Promise<UserEntity> {
    const user = await this.repository.findById(id)
    if (user === null || user.organizationId !== organizationId) {
      throw new NotFoundException('User not found')
    }
    return user
  }
}
