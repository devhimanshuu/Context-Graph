import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PipelineTraceEntryDto {
  @ApiProperty({ example: 'graph-traversal' })
  stageId!: string

  @ApiProperty({ example: 'Graph traversal' })
  stageName!: string

  @ApiProperty({ example: 'completed' })
  status!: string

  @ApiProperty({ example: 4 })
  outputCount!: number | null

  @ApiProperty({ example: 1.2 })
  durationMs!: number
}

export class PipelineStageResultDto extends PipelineTraceEntryDto {
  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  startedAt!: string

  @ApiProperty({ example: '2026-06-15T12:00:00.001Z' })
  completedAt!: string

  @ApiProperty({ example: 4 })
  inputCount!: number | null

  @ApiProperty()
  metadata!: Record<string, unknown>
}

export class PipelineRunMetricsDto {
  @ApiProperty({ example: 12.4 })
  totalDurationMs!: number

  @ApiProperty({ example: 10 })
  stagesExecuted!: number

  @ApiProperty({ example: 120 })
  reachableNodes!: number

  @ApiProperty({ example: 110 })
  authorizedNodes!: number

  @ApiProperty({ example: 2 })
  injectedNodes!: number

  @ApiProperty({ example: 28 })
  ruleCandidates!: number

  @ApiProperty({ example: 28 })
  builtCandidates!: number

  @ApiProperty({ example: 20 })
  rankedCandidates!: number

  @ApiProperty({ example: 18 })
  includedCandidates!: number

  @ApiProperty({ example: 82 })
  excludedByRules!: number

  @ApiProperty({ example: 2 })
  excludedByBudget!: number

  @ApiProperty({ example: 8 })
  excludedByRank!: number

  @ApiProperty({ example: 0.28 })
  ruleEngineDurationMs!: number

  @ApiProperty()
  stageDurationsMs!: Record<string, number>
}

export class PipelineExecutionSummaryDto {
  @ApiProperty()
  requestId!: string

  @ApiProperty()
  packageId!: string

  @ApiProperty({ example: 'contextgraph-v1' })
  version!: string

  @ApiProperty({ example: 'STANDARD' })
  mode!: string

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  evaluatedAt!: string

  @ApiProperty()
  funnel!: { reachable: number; authorized: number; ruleCandidates: number; included: number }

  @ApiProperty({ type: PipelineRunMetricsDto })
  metrics!: PipelineRunMetricsDto

  @ApiProperty({ type: PipelineTraceEntryDto, isArray: true })
  trace!: PipelineTraceEntryDto[]

  @ApiPropertyOptional({ type: PipelineStageResultDto, isArray: true })
  stageResults?: PipelineStageResultDto[]
}

export class ContextPackageCandidateDto {
  @ApiProperty()
  candidateId!: string

  @ApiProperty({ example: 'Delaying antibiotics pending cultures' })
  title!: string

  @ApiProperty({ example: 'Protocol content…' })
  content!: string

  @ApiProperty({ example: 'DECISION' })
  type!: string

  @ApiProperty({ example: 'ACTIVE' })
  status!: string

  @ApiProperty({ example: 90 })
  importance!: number

  @ApiProperty({ example: 1 })
  distance!: number

  @ApiProperty({ example: 30 })
  derivabilityScore!: number | null

  @ApiProperty({ example: ['PHI'] })
  complianceTags!: string[]

  @ApiProperty({ example: 'LOCAL_REACHABILITY' })
  inclusionReason!: string

  @ApiProperty({ example: 'SUMMARY' })
  compressionHint!: string

  @ApiProperty({ example: 232 })
  score!: number

  @ApiProperty({ example: 1 })
  rank!: number

  @ApiProperty({ example: 96 })
  tokens!: number
}

export class PipelineRuleVerdictDto {
  @ApiProperty({ example: 'temporal' })
  ruleId!: string

  @ApiProperty({ example: true })
  passed!: boolean

  @ApiProperty({ example: 'PASS' })
  reasonCode!: string

  @ApiProperty({ example: 'Node is within its validity window' })
  reason!: string
}

export class CandidateExclusionDto {
  @ApiProperty()
  nodeId!: string

  @ApiProperty({ example: false })
  included!: boolean

  @ApiProperty({ example: 'EXPIRED_NODE', nullable: true })
  finalReasonCode!: string | null

  @ApiProperty({ example: 'temporal', nullable: true })
  failingRuleId!: string | null

  @ApiProperty({ example: false })
  excludedByBudget!: boolean

  @ApiPropertyOptional({ example: true })
  excludedByRank?: boolean

  @ApiPropertyOptional({ type: PipelineRuleVerdictDto, isArray: true })
  ruleResults?: PipelineRuleVerdictDto[]
}

export class ContextPackageDto {
  @ApiProperty()
  packageId!: string

  @ApiProperty()
  requestId!: string

  @ApiProperty({ example: 'contextgraph-v1' })
  version!: string

  @ApiProperty({ example: 'STANDARD' })
  mode!: string

  @ApiProperty()
  workspaceId!: string

  @ApiProperty()
  entryNodeId!: string

  @ApiProperty({ example: 'bfs' })
  strategy!: string

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  evaluatedAt!: string

  @ApiProperty()
  generatedAt!: string

  @ApiProperty({ example: 2048 })
  tokenBudget!: number

  @ApiProperty({ example: 512 })
  tokensUsed!: number

  @ApiProperty({ example: false })
  truncated!: boolean

  @ApiProperty({ type: ContextPackageCandidateDto, isArray: true })
  candidates!: ContextPackageCandidateDto[]

  @ApiProperty({ type: CandidateExclusionDto, isArray: true })
  exclusions!: CandidateExclusionDto[]

  @ApiProperty({ type: PipelineExecutionSummaryDto })
  summary!: PipelineExecutionSummaryDto
}
