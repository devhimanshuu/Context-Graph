import { Inject, Injectable } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { IRulesRepository } from './rule.repository'
import { type ContextRuleResponseDto } from './rule.dto'
import { entityToRuleResponse } from './rule.mapper'
import type { CreateRuleInput, UpdateRuleInput } from './rule.validation'

export abstract class IRulesService {
  abstract findById(id: EntityId): Promise<ContextRuleResponseDto>
  abstract findActiveByWorkspace(workspaceId: EntityId): Promise<ContextRuleResponseDto[]>
  abstract create(
    organizationId: EntityId,
    actorId: EntityId,
    input: CreateRuleInput,
  ): Promise<ContextRuleResponseDto>
  abstract update(id: EntityId, input: UpdateRuleInput): Promise<ContextRuleResponseDto>
  abstract remove(id: EntityId): Promise<void>
}

@Injectable()
export class RulesService implements IRulesService {
  constructor(@Inject(IRulesRepository) private readonly repository: IRulesRepository) {}

  async findById(id: EntityId): Promise<ContextRuleResponseDto> {
    const rule = await this.repository.findById(id)
    if (rule === null) throw new NotFoundException('Rule not found')
    return entityToRuleResponse(rule)
  }

  async findActiveByWorkspace(workspaceId: EntityId): Promise<ContextRuleResponseDto[]> {
    const rules = await this.repository.findActiveByWorkspace(workspaceId)
    return rules.map((rule) => entityToRuleResponse(rule))
  }

  async create(
    organizationId: EntityId,
    actorId: EntityId,
    input: CreateRuleInput,
  ): Promise<ContextRuleResponseDto> {
    const rule = await this.repository.create({
      organizationId,
      workspaceId: input.workspaceId ?? null,
      name: input.name,
      description: input.description ?? null,
      condition: input.condition,
      action: input.action,
      priority: input.priority,
      status: input.status,
      isEnabled: input.isEnabled,
      createdById: actorId,
    })
    return entityToRuleResponse(rule)
  }

  async update(id: EntityId, input: UpdateRuleInput): Promise<ContextRuleResponseDto> {
    await this.ensureExists(id)
    const rule = await this.repository.update(id, input)
    return entityToRuleResponse(rule)
  }

  async remove(id: EntityId): Promise<void> {
    await this.ensureExists(id)
    await this.repository.softDelete(id)
  }

  private async ensureExists(id: EntityId): Promise<void> {
    const rule = await this.repository.findById(id)
    if (rule === null) throw new NotFoundException('Rule not found')
  }
}
