import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common'
import { ForbiddenException } from '../exceptions/forbidden.exception'
import type { AuthenticatedRequest } from '../decorators/current-user.decorator'

interface ParametrizedRequest extends AuthenticatedRequest {
  params?: Record<string, string | undefined>
}

/* Tenant-isolation guard. When a route carries an `:organizationId` path param, this guard verifies */
@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ParametrizedRequest>()
    const user = request.user
    if (user === undefined) return true // handled by JwtAuthGuard

    const orgParam = request.params?.organizationId
    if (orgParam !== undefined && orgParam !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant access is not allowed', {
        organizationId: orgParam,
      })
    }
    return true
  }
}
