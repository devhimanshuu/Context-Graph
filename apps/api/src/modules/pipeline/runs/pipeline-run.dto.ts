import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PipelineRunErrorDto {
  @ApiProperty({ example: 'ERR_PIPELINE' })
  code!: string

  @ApiProperty({ example: 'Pipeline stage exceeded its deadline' })
  message!: string
}

export class PipelineRunResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  organizationId!: string

  @ApiProperty()
  workspaceId!: string

  @ApiProperty({ nullable: true })
  actorId!: string | null

  @ApiProperty({ description: 'The stable handle for historical lookups and replay' })
  requestId!: string

  @ApiProperty({ nullable: true, description: 'Null when the run failed' })
  packageId!: string | null

  @ApiProperty({ example: 'contextgraph-v1' })
  version!: string

  @ApiProperty({ example: 'DEBUG' })
  mode!: string

  @ApiProperty({ example: 'bfs' })
  strategy!: string

  @ApiProperty()
  entryNodeId!: string

  @ApiProperty({ example: 3 })
  maxDepth!: number

  @ApiProperty({ example: 2048 })
  tokenBudget!: number

  @ApiProperty({ example: 30 })
  maxCandidates!: number

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  evaluatedAt!: string

  @ApiProperty({ example: 'completed' })
  status!: string

  @ApiProperty({ nullable: true, example: 'rule-engine' })
  failedStageId!: string | null

  @ApiProperty({ description: 'The validated request as received (immutable)' })
  request!: Record<string, unknown>

  @ApiProperty({ description: 'Ordered stage results — the execution trace' })
  trace!: Record<string, unknown>[]

  @ApiPropertyOptional({ description: 'Full run metrics (null for failed runs)' })
  metrics?: Record<string, unknown> | null

  @ApiPropertyOptional({ description: 'Ranked, budgeted package candidates' })
  candidates?: Record<string, unknown>[] | null

  @ApiPropertyOptional({ description: 'Inclusion/exclusion explanations' })
  exclusions?: Record<string, unknown>[] | null

  @ApiPropertyOptional({ type: PipelineRunErrorDto, nullable: true })
  error?: PipelineRunErrorDto | null

  @ApiProperty({
    example: 512,
    description: 'Tokens used by the final package (0 for failed runs)',
  })
  tokensUsed!: number

  @ApiProperty({ example: '2026-06-15T12:00:01.000Z' })
  createdAt!: string
}
