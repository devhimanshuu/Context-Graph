import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AuthenticatedUser } from '@contextgraph/types'
import { UnauthorizedException } from '../exceptions/unauthorized.exception'

export interface AuthenticatedRequest {
  user?: AuthenticatedUser
}

/* Resolves the authenticated principal attached by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    if (request.user === undefined) {
      throw new UnauthorizedException('No authenticated user on request')
    }
    return request.user
  },
)
