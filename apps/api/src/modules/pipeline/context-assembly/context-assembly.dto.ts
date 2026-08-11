import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ContextRuleVerdictDto {
  @ApiProperty({ example: 'temporal' })
  ruleId!: string

  @ApiProperty({ example: false })
  passed!: boolean

  @ApiProperty({ example: 'EXPIRED_NODE' })
  reasonCode!: string

  @ApiProperty({ example: 'Node is outside its validity window' })
  reason!: string
}

export class ContextNodeExplanationDto {
  @ApiProperty()
  nodeId!: string

  @ApiProperty()
  included!: boolean

  @ApiPropertyOptional({ nullable: true, example: 'EXPIRED_NODE' })
  finalReasonCode!: string | null

  @ApiPropertyOptional({ nullable: true, example: 'temporal' })
  failingRuleId!: string | null

  @ApiProperty({ type: ContextRuleVerdictDto, isArray: true })
  ruleResults!: ContextRuleVerdictDto[]
}

export class ContextNodeSummaryDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ example: 'Systolic BP must be < 120' })
  title!: string

  @ApiProperty({ example: 'FACT' })
  type!: string

  @ApiProperty({ example: 'ACTIVE' })
  status!: string

  @ApiProperty({ example: 80 })
  importance!: number

  @ApiProperty({ description: 'Hop distance from the entry node' })
  distance!: number

  @ApiPropertyOptional({ nullable: true, description: '0-100 genericness score' })
  derivabilityScore!: number | null

  @ApiProperty({ description: 'Estimated tokens (title + content + overhead)' })
  tokens!: number

  @ApiProperty({ description: 'Passed every rule and fits the token budget' })
  included!: boolean

  @ApiProperty({ description: 'Passed every rule but was cut by the budget' })
  excludedByBudget!: boolean
}

export class ContextCandidateDto extends ContextNodeSummaryDto {
  @ApiProperty({ example: 'Full knowledge node content…' })
  content!: string

  @ApiProperty({ type: [String], example: ['PHI', 'CONFIDENTIAL'] })
  complianceTags!: string[]
}

export class ContextFunnelDto {
  @ApiProperty({ description: 'Authorized nodes reachable from the entry' })
  reachable!: number

  @ApiProperty({ description: 'Nodes surviving every rule (candidate set)' })
  candidates!: number

  @ApiProperty({ description: 'Candidates fitted into the token budget' })
  included!: number
}

export class ContextMetricsDto {
  @ApiProperty()
  initialCount!: number

  @ApiProperty()
  injectedCount!: number

  @ApiProperty()
  finalCount!: number

  @ApiProperty()
  totalDurationMs!: number
}

export class ContextAssemblyResponseDto {
  @ApiProperty()
  packageId!: string

  @ApiProperty()
  requestId!: string

  @ApiProperty()
  entryNodeId!: string

  @ApiProperty()
  workspaceId!: string

  @ApiProperty({ example: 'bfs' })
  strategy!: string

  @ApiProperty({ example: '2026-06-15T12:00:00.000Z' })
  evaluatedAt!: string

  @ApiProperty({ example: 4096 })
  tokenBudget!: number

  @ApiProperty()
  tokensUsed!: number

  @ApiProperty({ description: 'True when rule-passing nodes were cut by the budget' })
  truncated!: boolean

  @ApiProperty({ type: ContextFunnelDto })
  funnel!: ContextFunnelDto

  @ApiProperty({ type: ContextNodeSummaryDto, isArray: true })
  nodes!: ContextNodeSummaryDto[]

  @ApiProperty({ type: ContextCandidateDto, isArray: true })
  candidates!: ContextCandidateDto[]

  @ApiProperty({ type: ContextNodeExplanationDto, isArray: true })
  explanations!: ContextNodeExplanationDto[]

  @ApiProperty({ type: [String] })
  executedStages!: string[]

  @ApiProperty({ type: ContextMetricsDto })
  metrics!: ContextMetricsDto
}
