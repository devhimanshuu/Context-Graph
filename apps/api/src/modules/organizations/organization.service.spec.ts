import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Industry, OrganizationStatus } from '@contextgraph/types'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { type IOrganizationsRepository } from './organization.repository'
import { type IOrganizationsService, OrganizationsService } from './organization.service'
import { OrganizationEntity } from './organization.entity'

function makeEntity(): OrganizationEntity {
  return new OrganizationEntity(
    'org-1',
    'Meridian Health',
    'meridian-health',
    Industry.HEALTHCARE,
    OrganizationStatus.ACTIVE,
    {},
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z',
    null,
  )
}

describe('OrganizationsService', () => {
  let service: IOrganizationsService
  let repository: IOrganizationsRepository

  beforeEach(() => {
    repository = {
      findById: vi.fn(async () => makeEntity()),
      findMany: vi.fn(async () => [makeEntity()]),
      findBySlug: vi.fn(async () => null),
      create: vi.fn(async () => makeEntity()),
      update: vi.fn(async () => makeEntity()),
      softDelete: vi.fn(async () => undefined),
    } as unknown as IOrganizationsRepository
    service = new OrganizationsService(repository)
  })

  it('throws NotFoundException for unknown ids', async () => {
    vi.mocked(repository.findById).mockResolvedValueOnce(null)
    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('rejects duplicate slugs on create', async () => {
    vi.mocked(repository.findBySlug).mockResolvedValueOnce(makeEntity())
    await expect(
      service.create({
        name: 'Dup',
        slug: 'meridian-health',
        industry: Industry.HEALTHCARE,
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('returns the entity through the response mapper', async () => {
    const result = await service.findById('org-1')
    expect(result.slug).toBe('meridian-health')
  })
})
