import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { AuditEntityType } from '@contextgraph/types'

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  organizationId!: string

  @ApiPropertyOptional()
  workspaceId!: string | null

  @ApiPropertyOptional()
  actorId!: string | null

  @ApiProperty({ example: 'KNOWLEDGE_NODE.CREATE' })
  action!: string

  @ApiProperty({ example: 'KNOWLEDGE_NODE' })
  entityType!: AuditEntityType

  @ApiProperty()
  entityId!: string

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>

  @ApiPropertyOptional()
  ipAddress!: string | null

  @ApiProperty()
  occurredAt!: string
}
