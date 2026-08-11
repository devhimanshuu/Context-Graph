import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { Role } from '@contextgraph/types'

/** A seeded demo user the UI may log in as (for exploring permission-aware results). */
export class DemoUserDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  name!: string

  @ApiProperty({ enum: ['ADMIN', 'HOD', 'EDITOR', 'VIEWER', 'QUALITY', 'AUDITOR'] })
  role!: Role

  @ApiPropertyOptional()
  departmentName!: string | null
}

/** Demo tenant discovery payload — lets the web UI log in and explore live features. */
export class DemoBootstrapDto {
  @ApiProperty()
  organizationId!: string

  @ApiProperty()
  organizationName!: string

  @ApiProperty()
  workspaceId!: string

  @ApiProperty()
  workspaceName!: string

  @ApiProperty({ type: DemoUserDto, isArray: true })
  users!: DemoUserDto[]
}
