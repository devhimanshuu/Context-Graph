import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { ComplianceTag, NodeStatus, NodeType } from '@contextgraph/types'

export class KnowledgeNodeResponseDto {
  @ApiProperty({ example: '0a1b2c3d-…' })
  id!: string

  @ApiProperty({ example: '0a1b2c3d-…' })
  organizationId!: string

  @ApiProperty({ example: '0a1b2c3d-…' })
  workspaceId!: string

  @ApiPropertyOptional({ example: '0a1b2c3d-…' })
  departmentId!: string | null

  @ApiProperty({ example: 'Systolic BP must be < 120 for normal range' })
  title!: string

  @ApiProperty()
  content!: string

  @ApiProperty({ enum: ['FACT', 'CONSTRAINT', 'DECISION', 'ANTI_PATTERN'] })
  type!: NodeType

  @ApiProperty({
    enum: ['DRAFT', 'ACTIVE', 'SUPERSEDED', 'EXPIRED', 'LEGAL_HOLD', 'REVIEW_REQUIRED', 'ARCHIVED'],
  })
  status!: NodeStatus

  @ApiProperty({ example: 80 })
  importance!: number

  @ApiProperty({ example: 40 })
  derivabilityScore!: number

  @ApiProperty({ example: 3 })
  version!: number

  @ApiPropertyOptional()
  validFrom!: string | null

  @ApiPropertyOptional()
  validTo!: string | null

  @ApiProperty({ example: ['HIPAA'] })
  complianceTags!: ComplianceTag[]

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}
