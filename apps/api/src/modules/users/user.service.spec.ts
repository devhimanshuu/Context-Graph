import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { type IUsersRepository } from './user.repository'
import { type IUsersService, UsersService } from './user.service'
import { UserEntity } from './user.entity'
import { UsersController } from './user.controller'
import { Role, PermissionLevel, ComplianceClearance, UserStatus } from '@contextgraph/types'

function makeEntity(): UserEntity {
  return new UserEntity(
    'user-1',
    'org-1',
    null,
    'amelia@meridian.health',
    'Amelia Chen',
    Role.ADMIN,
    PermissionLevel.ADMIN,
    ComplianceClearance.CRITICAL,
    UserStatus.ACTIVE,
    null,
    {},
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z',
    null,
  )
}

function makeRepository(): IUsersRepository {
  return {
    findById: vi.fn(async () => makeEntity()),
    findMany: vi.fn(async () => [makeEntity()]),
    findByEmail: vi.fn(async () => null),
    findByOrganization: vi.fn(async () => [makeEntity()]),
    countByOrganization: vi.fn(async () => 1),
    findByAuthProviderUserId: vi.fn(async () => null),
    create: vi.fn(async () => makeEntity()),
    update: vi.fn(async () => makeEntity()),
    softDelete: vi.fn(async () => undefined),
  } as unknown as IUsersRepository
}

describe('UsersService', () => {
  let service: IUsersService
  let repository: IUsersRepository

  beforeEach(() => {
    repository = makeRepository()
    service = new UsersService(repository)
  })

  it('finds a user by id within the caller organization', async () => {
    const result = await service.findById('org-1', 'user-1')
    expect(result.id).toBe('user-1')
    expect(result.email).toBe('amelia@meridian.health')
  })

  it('throws NotFoundException for an unknown user', async () => {
    vi.mocked(repository.findById).mockResolvedValueOnce(null)
    await expect(service.findById('org-1', 'missing')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('throws NotFoundException when the user belongs to another organization', async () => {
    const foreignUser = makeEntity()
    vi.mocked(repository.findById).mockResolvedValueOnce(foreignUser)
    await expect(service.findById('other-org', 'user-1')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('rejects duplicate emails on create', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValueOnce(makeEntity())
    await expect(
      service.create('org-1', {
        email: 'dup@meridian.health',
        name: 'Dup',
        role: Role.VIEWER,
        permissionLevel: PermissionLevel.READ,
        complianceClearance: ComplianceClearance.STANDARD,
        metadata: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('creates a user when the email is free', async () => {
    const result = await service.create('org-1', {
      email: 'new@meridian.health',
      name: 'New User',
      role: Role.EDITOR,
      permissionLevel: PermissionLevel.WRITE,
      complianceClearance: ComplianceClearance.SENSITIVE,
      metadata: {},
    })
    expect(result.email).toBe('amelia@meridian.health')
    expect(repository.create).toHaveBeenCalledOnce()
  })
})

describe('UsersController', () => {
  it('delegates list to the service with the caller organization', async () => {
    const service = {
      list: vi.fn(async () => ({ items: [], meta: {} })),
    } as unknown as IUsersService
    const controller = new UsersController(service)
    const user = makeEntity()
    const result = await controller.list(
      {
        id: user.id,
        organizationId: user.organizationId,
        departmentId: user.departmentId,
        email: user.email,
        name: user.name,
        role: user.role,
        permissionLevel: user.permissionLevel,
        complianceClearance: user.complianceClearance,
      },
      { page: 1, limit: 20 },
    )
    expect(service.list).toHaveBeenCalledWith('org-1', { page: 1, limit: 20 })
    expect(result).toEqual({ items: [], meta: {} })
  })
})
