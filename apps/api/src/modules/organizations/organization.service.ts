import { Inject, Injectable } from '@nestjs/common'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { IOrganizationsRepository } from './organization.repository'
import { type OrganizationResponseDto } from './organization.dto'
import { entityToOrganizationResponse } from './organization.mapper'
import type { CreateOrganizationInput, UpdateOrganizationInput } from './organization.validation'

export abstract class IOrganizationsService {
  abstract findById(id: string): Promise<OrganizationResponseDto>
  abstract findBySlug(slug: string): Promise<OrganizationResponseDto>
  abstract list(): Promise<OrganizationResponseDto[]>
  abstract create(input: CreateOrganizationInput): Promise<OrganizationResponseDto>
  abstract update(id: string, input: UpdateOrganizationInput): Promise<OrganizationResponseDto>
  abstract remove(id: string): Promise<void>
}

@Injectable()
export class OrganizationsService implements IOrganizationsService {
  constructor(
    @Inject(IOrganizationsRepository) private readonly repository: IOrganizationsRepository,
  ) {}

  async findById(id: string): Promise<OrganizationResponseDto> {
    const org = await this.repository.findById(id)
    if (org === null) throw new NotFoundException('Organization not found')
    return entityToOrganizationResponse(org)
  }

  async findBySlug(slug: string): Promise<OrganizationResponseDto> {
    const org = await this.repository.findBySlug(slug)
    if (org === null) throw new NotFoundException('Organization not found')
    return entityToOrganizationResponse(org)
  }

  async list(): Promise<OrganizationResponseDto[]> {
    const orgs = await this.repository.findMany()
    return orgs.map((org) => entityToOrganizationResponse(org))
  }

  async create(input: CreateOrganizationInput): Promise<OrganizationResponseDto> {
    const existing = await this.repository.findBySlug(input.slug)
    if (existing !== null) {
      throw new ConflictException('An organization with this slug already exists')
    }
    const org = await this.repository.create({ ...input, configuration: input.configuration })
    return entityToOrganizationResponse(org)
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<OrganizationResponseDto> {
    await this.ensureExists(id)
    const org = await this.repository.update(id, input)
    return entityToOrganizationResponse(org)
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id)
    await this.repository.softDelete(id)
  }

  private async ensureExists(id: string): Promise<void> {
    const org = await this.repository.findById(id)
    if (org === null) throw new NotFoundException('Organization not found')
  }
}
