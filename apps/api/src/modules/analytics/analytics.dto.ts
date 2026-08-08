import { ApiProperty } from '@nestjs/swagger'

export class AnalyticsSummaryDto {
  @ApiProperty({ example: 1284 })
  totalAuditEvents!: number

  @ApiProperty({ example: { 'KNOWLEDGE_NODE.CREATE': 42 } })
  eventsByAction!: Record<string, number>
}
