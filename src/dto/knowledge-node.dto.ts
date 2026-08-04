import type { KnowledgeNode } from '@/domain/models'
import type {
  CreateKnowledgeNodeSchema,
  UpdateKnowledgeNodeSchema,
} from '@/validations/knowledge-node'
import type { PublicEntity } from './common'

export type CreateKnowledgeNodeRequestDto = CreateKnowledgeNodeSchema

export type UpdateKnowledgeNodeRequestDto = UpdateKnowledgeNodeSchema

export type KnowledgeNodeResponseDto = PublicEntity<KnowledgeNode>
