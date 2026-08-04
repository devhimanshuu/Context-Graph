import type { PermissionProfile } from '@/domain/models'
import type {
  CreatePermissionProfileSchema,
  UpdatePermissionProfileSchema,
} from '@/validations/permission-profile'
import type { PublicEntity } from './common'

export type CreatePermissionProfileRequestDto = CreatePermissionProfileSchema

export type UpdatePermissionProfileRequestDto = UpdatePermissionProfileSchema

export type PermissionProfileResponseDto = PublicEntity<PermissionProfile>
