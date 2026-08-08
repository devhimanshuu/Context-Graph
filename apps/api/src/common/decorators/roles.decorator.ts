import { SetMetadata } from '@nestjs/common'
import type { Role } from '@contextgraph/types'

export const ROLES_KEY = 'roles'

/** Restricts a route to the given functional roles. */
export const Roles = (...roles: readonly Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles)
