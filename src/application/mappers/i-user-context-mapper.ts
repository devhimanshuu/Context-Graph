import { type UserContextDto } from '@/application/dto'
import { type User } from '@/domain/models'

/**
 * Maps a domain `User` into the `UserContextDto` carried through the
 * pipeline. Workspace selection (the caller's active workspace) is resolved
 * by the caller and passed in.
 */
export interface IUserContextMapper {
  toContext(user: User, workspaceId: string | null): UserContextDto
}
