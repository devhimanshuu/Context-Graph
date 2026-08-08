import { ApiProperty } from '@nestjs/swagger'

export class PipelineMetricsDto {
  @ApiProperty({ example: 0 })
  stagesExecuted!: number

  @ApiProperty({ example: 0 })
  nodesVisited!: number

  @ApiProperty({ example: 12 })
  durationMs!: number
}

export class PipelineResponseDto {
  @ApiProperty({ description: 'Assembled candidate node ids' })
  candidateIds!: string[]

  @ApiProperty({ type: PipelineMetricsDto })
  metrics!: PipelineMetricsDto
}
