import { Inject, Injectable } from '@nestjs/common'
import type { AuthenticatedUser, EntityId } from '@contextgraph/types'
import { NotFoundException } from '../../common/exceptions/not-found.exception'
import { IKnowledgeRepository } from './knowledge.repository'
import { type KnowledgeNodeResponseDto } from './knowledge.dto'
import { createKnowledgeNodeInputToPrisma, entityToKnowledgeNodeResponse } from './knowledge.mapper'
import type { CreateKnowledgeNodeInput, UpdateKnowledgeNodeInput } from './knowledge.validation'

export abstract class IKnowledgeService {
  abstract findByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeResponseDto[]>
  abstract findById(organizationId: EntityId, id: EntityId): Promise<KnowledgeNodeResponseDto>
  abstract create(
    user: AuthenticatedUser,
    workspaceId: EntityId,
    input: CreateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto>
  abstract update(
    organizationId: EntityId,
    id: EntityId,
    input: UpdateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto>
  abstract remove(organizationId: EntityId, id: EntityId): Promise<void>
}

@Injectable()
export class KnowledgeService implements IKnowledgeService {
  constructor(@Inject(IKnowledgeRepository) private readonly repository: IKnowledgeRepository) {}

  async findByWorkspace(
    organizationId: EntityId,
    workspaceId: EntityId,
  ): Promise<KnowledgeNodeResponseDto[]> {
    const nodes = await this.repository.findByWorkspace(organizationId, workspaceId)
    return nodes.map((node) => entityToKnowledgeNodeResponse(node))
  }

  async findById(organizationId: EntityId, id: EntityId): Promise<KnowledgeNodeResponseDto> {
    const node = await this.ensureExists(id, organizationId)
    return entityToKnowledgeNodeResponse(node)
  }

  async create(
    user: AuthenticatedUser,
    workspaceId: EntityId,
    input: CreateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto> {
    const node = await this.repository.create(
      createKnowledgeNodeInputToPrisma(input, user.organizationId, workspaceId, user.id),
    )
    return entityToKnowledgeNodeResponse(node)
  }

  async update(
    organizationId: EntityId,
    id: EntityId,
    input: UpdateKnowledgeNodeInput,
  ): Promise<KnowledgeNodeResponseDto> {
    await this.ensureExists(id, organizationId)
    const node = await this.repository.update(id, input)
    return entityToKnowledgeNodeResponse(node)
  }

  async remove(organizationId: EntityId, id: EntityId): Promise<void> {
    await this.ensureExists(id, organizationId)
    await this.repository.softDelete(id)
  }

  /** Fails with 404 when the node is missing OR belongs to another tenant. */
  private async ensureExists(id: EntityId, organizationId: EntityId) {
    const node = await this.repository.findById(id)
    if (node === null || node.organizationId !== organizationId) {
      throw new NotFoundException('Knowledge node not found')
    }
    return node
  }
}
