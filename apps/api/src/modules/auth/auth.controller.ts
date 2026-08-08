import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IAuthService } from './auth.service'
import { LoginResponseDto } from './auth.dto'
import { loginSchema, type LoginInput } from './auth.validation'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(IAuthService) private readonly authService: IAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange credentials for a JWT (public)' })
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.login(body)
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve the current principal' })
  @ApiOkResponse({ type: LoginResponseDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user)
  }
}
