import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { ContextRuleStatus } from '@contextgraph/types'

export class ContextRuleResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  organizationId!: string

  @ApiPropertyOptional()
  workspaceId!: string | null

  @ApiProperty({ example: 'If BP > 140 then flag as HYPERTENSION' })
  name!: string

  @ApiPropertyOptional()
  description!: string | null

  @ApiProperty({ description: 'Condition as a JSON expression tree' })
  condition!: Record<string, unknown>

  @ApiProperty({ description: 'Action emitted when the rule fires' })
  action!: Record<string, unknown>

  @ApiProperty({ example: 10 })
  priority!: number

  @ApiProperty({ enum: ['DRAFT', 'ACTIVE', 'DISABLED', 'ARCHIVED'] })
  status!: ContextRuleStatus

  @ApiProperty({ example: false })
  isEnabled!: boolean

  @ApiProperty({ example: 1 })
  version!: number

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}
