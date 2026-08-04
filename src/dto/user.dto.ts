import type { User } from '@/domain/models'
import type { CreateUserSchema, UpdateUserSchema } from '@/validations/user'
import type { PublicEntity } from './common'

export type CreateUserRequestDto = CreateUserSchema

export type UpdateUserRequestDto = UpdateUserSchema

/** User response never exposes internal auth handles. */
export type UserResponseDto = Omit<PublicEntity<User>, 'authProviderUserId'>
