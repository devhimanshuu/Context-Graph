import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class DepartmentResponseDto {
  @ApiProperty({ example: '0a1b2c3d-…' })
  id!: string

  @ApiProperty({ example: '0a1b2c3d-…' })
  organizationId!: string

  @ApiPropertyOptional({ example: '0a1b2c3d-…' })
  parentId!: string | null

  @ApiProperty({ example: 'Cardiology' })
  name!: string

  @ApiProperty({ example: 'cardio' })
  code!: string

  @ApiProperty({ example: 2, description: '0 = root; grows downward' })
  hierarchyLevel!: number

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}
