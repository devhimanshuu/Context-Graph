import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RuleRunNodeDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ example: 'Systolic BP must be < 120' })
  title!: string

  @ApiProperty({ example: 'FACT' })
  type!: string

  @ApiProperty({ example: 'ACTIVE' })
  status!: string
}

export class RuleRunVerdictDto {
  @ApiProperty({ example: 'temporal' })
  ruleId!: string

  @ApiProperty({ example: false })
  passed!: boolean

  @ApiProperty({ example: 'EXPIRED_NODE' })
  reasonCode!: string

  @ApiProperty({ example: 'Node is outside its validity window' })
  reason!: string
}

export class RuleRunExplanationDto {
  @ApiProperty()
  nodeId!: string

  @ApiProperty()
  included!: boolean

  @ApiPropertyOptional({ nullable: true, example: 'EXPIRED_NODE' })
  finalReasonCode!: string | null

  @ApiPropertyOptional({ nullable: true, example: 'temporal' })
  failingRuleId!: string | null

  @ApiProperty({ type: RuleRunVerdictDto, isArray: true })
  ruleResults!: RuleRunVerdictDto[]
}

export class RuleRunStageCountDto {
  @ApiProperty({ example: 'global-injection' })
  stageId!: string

  @ApiProperty({ example: 12 })
  count!: number
}

export class RuleRunMetricsDto {
  @ApiProperty()
  initialCount!: number

  @ApiProperty()
  injectedCount!: number

  @ApiProperty()
  finalCount!: number

  @ApiProperty()
  totalDurationMs!: number

  @ApiProperty({ type: RuleRunStageCountDto, isArray: true })
  countsAfterStage!: RuleRunStageCountDto[]

  @ApiProperty({ type: Object })
  removedByRule!: Record<string, number>

  @ApiProperty({ type: Object })
  removedByReason!: Record<string, number>

  @ApiProperty({ type: Object })
  ruleDurationsMs!: Record<string, number>
}

export class RuleRunCandidateDto extends RuleRunNodeDto {
  @ApiProperty({ example: 80 })
  importance!: number

  @ApiProperty({ example: 'INTERNAL' })
  complianceTags!: string[]
}

export class RuleRunResponseDto {
  @ApiProperty()
  requestId!: string

  @ApiProperty({ type: [String] })
  entryNodeIds!: string[]

  /** Every evaluated node (id + title), for the explanation panel. */
  @ApiProperty({ type: RuleRunNodeDto, isArray: true })
  nodes!: RuleRunNodeDto[]

  /** The final candidate set (nodes surviving every rule). */
  @ApiProperty({ type: RuleRunCandidateDto, isArray: true })
  candidates!: RuleRunCandidateDto[]

  /** Per-node reasons — every rule verdict plus the final outcome. */
  @ApiProperty({ type: RuleRunExplanationDto, isArray: true })
  explanations!: RuleRunExplanationDto[]

  @ApiProperty({ type: RuleRunMetricsDto })
  metrics!: RuleRunMetricsDto

  @ApiProperty({ type: [String] })
  executedStages!: string[]
}
