import { Module } from '@nestjs/common'
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '../../config/config.service'
import { UsersModule } from '../users/users.module'
import { JwtStrategy } from './jwt.strategy'
import { IAuthService, AuthService } from './auth.service'
import { AuthController } from './auth.controller'

/* Auth module — JWT issuance and validation. No repository here by design: the JWT strategy resolves principals through */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.jwtAccessSecret,
        signOptions: { expiresIn: config.jwtAccessTtl as JwtSignOptions['expiresIn'] },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, { provide: IAuthService, useClass: AuthService }],
  exports: [JwtModule, JwtStrategy, IAuthService],
})
export class AuthModule {}
