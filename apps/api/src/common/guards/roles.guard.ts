import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@contextgraph/types'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { ForbiddenException } from '../exceptions/forbidden.exception'
import type { AuthenticatedRequest } from '../decorators/current-user.decorator'

/* Enforces @Roles(...) on routes. Runs after JwtAuthGuard so the principal */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (required === undefined || required.length === 0) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user
    if (user === undefined || !required.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this operation')
    }
    return true
  }
}
