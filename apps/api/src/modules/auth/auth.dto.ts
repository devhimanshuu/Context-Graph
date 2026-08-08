import { ApiProperty } from '@nestjs/swagger'
import type { UserResponseDto } from '../users/user.dto'

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token (Bearer)' })
  accessToken!: string

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer'

  @ApiProperty({ example: 900, description: 'Token lifetime in seconds' })
  expiresIn!: number

  @ApiProperty({ description: 'Resolved principal' })
  user!: UserResponseDto
}
