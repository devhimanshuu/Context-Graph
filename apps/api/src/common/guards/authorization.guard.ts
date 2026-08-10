import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { ComplianceClearance, PermissionLevel, Role } from '@contextgraph/types'
import { IAuthorizationService } from '../../modules/authorization/services/authorization.service'
import { PermissionDeniedException } from '../../modules/authorization/errors/authorization-errors'
import { POLICY_NAMES } from '../../modules/authorization/policies/authorization-policy.interface'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { PERMISSIONS_KEY, type RequiredPermission } from '../decorators/permissions.decorator'
import { CLEARANCE_KEY } from '../decorators/require-clearance.decorator'
import { LEVEL_KEY } from '../decorators/require-permission-level.decorator'
import type { AuthenticatedRequest } from '../decorators/current-user.decorator'

/**
 * The single route-level authorization guard. It carries NO authorization
 * business logic: every requirement (@Roles, @RequirePermissions,
 * @RequireClearance, @RequirePermissionLevel) is delegated to the
 * authorization engine, which compiles a fresh server-derived context and
 * evaluates through the policy pipeline. Replaces the previous inline
 * RolesGuard/PermissionsGuard so decisions are centralized and auditable.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IAuthorizationService) private readonly authorization: IAuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    )
    const requiredClearance = this.reflector.getAllAndOverride<ComplianceClearance>(CLEARANCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const requiredLevel = this.reflector.getAllAndOverride<PermissionLevel>(LEVEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (
      (requiredRoles === undefined || requiredRoles.length === 0) &&
      (requiredPermissions === undefined || requiredPermissions.length === 0) &&
      requiredClearance === undefined &&
      requiredLevel === undefined
    ) {
      // No authorization metadata: nothing to enforce (fast path, no I/O).
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user
    if (user === undefined) {
      throw new PermissionDeniedException('No authenticated user to authorize')
    }

    if (requiredRoles !== undefined && requiredRoles.length > 0) {
      const allowed = await this.authorization.isRoleAllowed(user, requiredRoles)
      if (!allowed) {
        throw new PermissionDeniedException('Insufficient role for this operation', {
          reason: `Role ${user.role} is not in the allowed set`,
          failedPolicy: POLICY_NAMES.ROLE,
        })
      }
    }

    if (requiredPermissions !== undefined) {
      for (const requirement of requiredPermissions) {
        await this.authorization.checkAction(user, requirement.resource, requirement.action)
      }
    }

    if (requiredClearance !== undefined) {
      const allowed = await this.authorization.hasComplianceClearance(user, requiredClearance)
      if (!allowed) {
        throw new PermissionDeniedException('Insufficient compliance clearance', {
          reason: `Clearance ${user.complianceClearance} does not dominate ${requiredClearance}`,
          failedPolicy: POLICY_NAMES.COMPLIANCE,
        })
      }
    }

    if (requiredLevel !== undefined) {
      const allowed = await this.authorization.hasPermissionLevel(user, requiredLevel)
      if (!allowed) {
        throw new PermissionDeniedException('Insufficient permission level', {
          reason: `Level ${user.permissionLevel} does not dominate ${requiredLevel}`,
          failedPolicy: POLICY_NAMES.PERMISSION_LEVEL,
        })
      }
    }

    return true
  }
}
