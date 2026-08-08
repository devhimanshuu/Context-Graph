import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { Industry, OrganizationStatus } from '@contextgraph/types'

export class OrganizationResponseDto {
  @ApiProperty({ example: '0a1b2c3d-…' })
  id!: string

  @ApiProperty({ example: 'Meridian Health' })
  name!: string

  @ApiProperty({ example: 'meridian-health' })
  slug!: string

  @ApiProperty({
    enum: [
      'HEALTHCARE',
      'FINANCE',
      'LEGAL',
      'TECHNOLOGY',
      'EDUCATION',
      'MANUFACTURING',
      'RETAIL',
      'GOVERNMENT',
      'OTHER',
    ],
  })
  industry!: Industry

  @ApiProperty({ enum: ['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'] })
  status!: OrganizationStatus

  @ApiPropertyOptional()
  configuration?: Record<string, unknown>

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}
