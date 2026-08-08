import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { type AccessTokenPayload, type AuthenticatedUser, UserStatus } from '@contextgraph/types'
import { ConfigService } from '../../config/config.service'
import { IUsersRepository } from '../users/user.repository'
import { UnauthorizedException } from '../../common/exceptions/unauthorized.exception'

/* Validates the JWT and loads a fresh principal from the repository on every */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @Inject(IUsersRepository) private readonly usersRepository: IUsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccessSecret,
    })
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const user = await this.usersRepository.findById(payload.sub)
    if (user === null || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is no longer active')
    }
    return {
      id: user.id,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      email: user.email,
      name: user.name,
      role: user.role,
      permissionLevel: user.permissionLevel,
      complianceClearance: user.complianceClearance,
    }
  }
}
