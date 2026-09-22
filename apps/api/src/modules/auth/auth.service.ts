import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import bcrypt from 'bcryptjs'
import { type AccessTokenPayload, type AuthenticatedUser, UserStatus } from '@contextgraph/types'
import { IUsersRepository } from '../users/user.repository'
import { UnauthorizedException } from '../../common/exceptions/unauthorized.exception'
import { ForbiddenException } from '../../common/exceptions/forbidden.exception'
import { entityToUserResponse } from '../users/user.mapper'
import { entityToAuthenticatedUser } from './auth.mapper'
import type { LoginInput } from './auth.validation'
import type { LoginResponseDto } from './auth.dto'

export abstract class IAuthService {
  abstract login(input: LoginInput): Promise<LoginResponseDto>
  abstract me(user: AuthenticatedUser): Promise<LoginResponseDto['user']>
}

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(IUsersRepository) private readonly usersRepository: IUsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(input: LoginInput): Promise<LoginResponseDto> {
    const user = await this.usersRepository.findByEmail(input.organizationId, input.email)
    // Uniform error for unknown email / wrong password — never leak which one failed.
    if (user === null) {
      throw new UnauthorizedException('Invalid credentials')
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is not active')
    }

    // Credential check: users backed by an external IdP (no local hash) cannot
    // log in through this endpoint.
    if (user.passwordHash === null) {
      throw new UnauthorizedException('Invalid credentials')
    }
    const passwordMatches = await bcrypt.compare(input.password ?? '', user.passwordHash)
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload: AccessTokenPayload = {
      sub: user.id,
      org: user.organizationId,
      iat: Math.floor(Date.now() / 1000),
    }
    const accessToken = await this.jwtService.signAsync(payload)

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: entityToUserResponse(user),
    }
  }

  async me(user: AuthenticatedUser): Promise<LoginResponseDto['user']> {
    const entity = await this.usersRepository.findById(user.id)
    if (entity === null) {
      throw new UnauthorizedException('Account no longer exists')
    }
    return entityToUserResponse(entity)
  }
}

export { entityToAuthenticatedUser }
