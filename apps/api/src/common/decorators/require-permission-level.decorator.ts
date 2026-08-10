import { SetMetadata } from '@nestjs/common'
import type { PermissionLevel } from '@contextgraph/types'

export const LEVEL_KEY = 'requiredPermissionLevel'

/** Requires the principal's permission level to dominate the given level. Consumed by AuthorizationGuard. */
export const RequirePermissionLevel = (level: PermissionLevel): MethodDecorator & ClassDecorator =>
  SetMetadata(LEVEL_KEY, level)
