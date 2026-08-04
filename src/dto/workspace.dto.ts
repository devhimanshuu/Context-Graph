import type { Workspace } from '@/domain/models'
import type { CreateWorkspaceSchema, UpdateWorkspaceSchema } from '@/validations/workspace'
import type { PublicEntity } from './common'

export type CreateWorkspaceRequestDto = CreateWorkspaceSchema

export type UpdateWorkspaceRequestDto = UpdateWorkspaceSchema

export type WorkspaceResponseDto = PublicEntity<Workspace>
