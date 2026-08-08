import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PermissionProfileResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  organizationId!: string

  @ApiPropertyOptional()
  workspaceId!: string | null

  @ApiProperty({ example: 'Cardiologists — Full Access' })
  name!: string

  @ApiPropertyOptional()
  description!: string | null

  @ApiPropertyOptional({ description: 'Role → entity → action grants (JSON)' })
  rules?: Record<string, unknown>

  @ApiProperty()
  isDefault!: boolean

  @ApiProperty({ example: 1 })
  version!: number

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}

/** Compiled grant surface returned to the permission compiler consumers. */
export class CompiledPermissionsDto {
  @ApiProperty({ example: 'user-1' })
  userId!: string

  @ApiProperty({ example: ['knowledge-node:READ', 'knowledge-node:WRITE'] })
  grants!: string[]

  @ApiProperty({ example: 1, description: 'Profile version used for the compile' })
  compiledFromVersion!: number
}
