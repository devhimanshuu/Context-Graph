import type { GraphEdge } from '@/domain/models'
import type { CreateGraphEdgeSchema, UpdateGraphEdgeSchema } from '@/validations/graph-edge'
import type { PublicEntity } from './common'

export type CreateGraphEdgeRequestDto = CreateGraphEdgeSchema

export type UpdateGraphEdgeRequestDto = UpdateGraphEdgeSchema

export type GraphEdgeResponseDto = PublicEntity<GraphEdge>
