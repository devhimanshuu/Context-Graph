import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionAction, PermissionLevel } from '@contextgraph/types'
import { PERMISSIONS_KEY, type RequiredPermission } from '../decorators/permissions.decorator'
import { ForbiddenException } from '../exceptions/forbidden.exception'
import type { AuthenticatedRequest } from '../decorators/current-user.decorator'

/** Minimum PermissionLevel that grants an action (coarse scaffold). */
function levelForAction(action: PermissionAction): PermissionLevel {
  switch (action) {
    case PermissionAction.READ:
      return PermissionLevel.READ
    case PermissionAction.WRITE:
      return PermissionLevel.WRITE
    case PermissionAction.DELETE:
    case PermissionAction.MANAGE:
      return PermissionLevel.ADMIN
    default:
      return PermissionLevel.ADMIN
  }
}

function levelRank(level: PermissionLevel): number {
  switch (level) {
    case PermissionLevel.NONE:
      return 0
    case PermissionLevel.READ:
      return 1
    case PermissionLevel.WRITE:
      return 2
    case PermissionLevel.ADMIN:
      return 3
    default:
      return 0
  }
}

/* Enforces @RequirePermissions(...) on routes. SCAFFOLD: until the permission compiler (Phase 6) materializes per-profile */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (required === undefined || required.length === 0) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user
    if (user === undefined) {
      throw new ForbiddenException('Authentication required for permission check')
    }

    const allowed = required.every(
      (requirement) =>
        levelRank(user.permissionLevel) >= levelRank(levelForAction(requirement.action)),
    )
    if (!allowed) {
      throw new ForbiddenException('Missing required permission')
    }
    return true
  }
}
