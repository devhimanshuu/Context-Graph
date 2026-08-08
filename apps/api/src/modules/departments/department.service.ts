import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { ConflictException } from '../../common/exceptions/conflict.exception'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { IDepartmentsRepository } from './department.repository'
import { type DepartmentResponseDto } from './department.dto'
import { entityToDepartmentResponse } from './department.mapper'
import type { CreateDepartmentInput, UpdateDepartmentInput } from './department.validation'

export abstract class IDepartmentsService {
  abstract findByOrganization(organizationId: EntityId): Promise<DepartmentResponseDto[]>
  abstract findById(id: EntityId): Promise<DepartmentResponseDto>
  abstract create(
    organizationId: EntityId,
    input: CreateDepartmentInput,
  ): Promise<DepartmentResponseDto>
  abstract update(id: EntityId, input: UpdateDepartmentInput): Promise<DepartmentResponseDto>
  abstract remove(id: EntityId): Promise<void>
}

@Injectable()
export class DepartmentsService implements IDepartmentsService {
  constructor(
    @Inject(IDepartmentsRepository) private readonly repository: IDepartmentsRepository,
  ) {}

  async findByOrganization(organizationId: EntityId): Promise<DepartmentResponseDto[]> {
    const departments = await this.repository.findByOrganization(organizationId)
    return departments.map((d) => entityToDepartmentResponse(d))
  }

  async findById(id: EntityId): Promise<DepartmentResponseDto> {
    const department = await this.repository.findById(id)
    if (department === null) throw new NotFoundException('Department not found')
    return entityToDepartmentResponse(department)
  }

  async create(
    organizationId: EntityId,
    input: CreateDepartmentInput,
  ): Promise<DepartmentResponseDto> {
    const existing = await this.repository.findByOrganizationAndCode(organizationId, input.code)
    if (existing !== null) {
      throw new ConflictException('A department with this code already exists in the organization')
    }
    const department = await this.repository.create({
      organizationId,
      ...input,
      parentId: input.parentId ?? null,
      hierarchyLevel: input.hierarchyLevel ?? 0,
      metadata: input.metadata,
    })
    return entityToDepartmentResponse(department)
  }

  async update(id: EntityId, input: UpdateDepartmentInput): Promise<DepartmentResponseDto> {
    await this.ensureExists(id)
    const department = await this.repository.update(id, input)
    return entityToDepartmentResponse(department)
  }

  async remove(id: EntityId): Promise<void> {
    await this.ensureExists(id)
    await this.repository.softDelete(id)
  }

  private async ensureExists(id: EntityId): Promise<void> {
    const department = await this.repository.findById(id)
    if (department === null) throw new NotFoundException('Department not found')
  }
}
