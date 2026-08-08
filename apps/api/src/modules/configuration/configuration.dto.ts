import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PipelineConfigDto {
  @ApiProperty({ example: 32 })
  maxDepth!: number

  @ApiProperty({ example: 100 })
  maxCandidates!: number

  @ApiProperty({ example: false })
  failOnStageError!: boolean
}

export class TraversalConfigDto {
  @ApiProperty({ example: 'BFS' })
  algorithm!: 'BFS' | 'A_STAR'

  @ApiProperty({ example: 'BACKWARD' })
  direction!: 'FORWARD' | 'BACKWARD'

  @ApiProperty({ example: 32 })
  defaultMaxDepth!: number

  @ApiProperty({ example: 1 })
  maxEdgeWeight!: number
}

export class RuleEngineConfigDto {
  @ApiProperty({ example: 500 })
  maxRulesPerEvaluation!: number

  @ApiProperty({ example: 1000 })
  timeoutMs!: number
}

export class PermissionConfigDto {
  @ApiProperty({ example: 300000 })
  cacheTtlMs!: number

  @ApiProperty({ example: true })
  denyByDefault!: boolean
}

export class CacheConfigDto {
  @ApiProperty({ example: 'memory' })
  provider!: 'memory' | 'redis'

  @ApiProperty({ example: 300000 })
  ttlMs!: number
}

export class MetricsConfigDto {
  @ApiProperty({ example: false })
  enabled!: boolean

  @ApiPropertyOptional()
  otlpEndpoint?: string
}
