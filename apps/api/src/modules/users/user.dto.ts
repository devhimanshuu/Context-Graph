import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { ComplianceClearance, PermissionLevel, Role, UserStatus } from '@contextgraph/types'

/** Response shape of a user. */
export class UserResponseDto {
  @ApiProperty({ example: '0a1b2c3d-…' })
  id!: string

  @ApiProperty({ example: '0a1b2c3d-…' })
  organizationId!: string

  @ApiPropertyOptional({ example: '0a1b2c3d-…' })
  departmentId!: string | null

  @ApiProperty({ example: 'amelia.chen@meridian.health' })
  email!: string

  @ApiProperty({ example: 'Amelia Chen' })
  name!: string

  @ApiProperty({ enum: ['ADMIN', 'HOD', 'EDITOR', 'VIEWER', 'QUALITY', 'AUDITOR'] })
  role!: Role

  @ApiProperty({ enum: ['NONE', 'READ', 'WRITE', 'ADMIN'] })
  permissionLevel!: PermissionLevel

  @ApiProperty({ enum: ['NONE', 'STANDARD', 'SENSITIVE', 'RESTRICTED', 'CRITICAL'] })
  complianceClearance!: ComplianceClearance

  @ApiProperty({ enum: ['INVITED', 'ACTIVE', 'DISABLED'] })
  status!: UserStatus

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}
