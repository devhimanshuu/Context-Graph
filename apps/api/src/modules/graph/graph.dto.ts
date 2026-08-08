import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GraphEdgeResponseDto {
  @ApiProperty({ example: '0a1b2c3d-…' })
  id!: string

  @ApiProperty({ example: '0a1b2c3d-…' })
  sourceId!: string

  @ApiProperty({ example: '0a1b2c3d-…' })
  targetId!: string

  @ApiProperty({ example: 'SUPPORTS' })
  relationshipType!: string

  @ApiProperty({ example: 1 })
  weight!: number
}

export class NodeProjectionDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ example: 'Systolic BP must be < 120' })
  title!: string

  @ApiProperty({ example: 'FACT' })
  type!: string

  @ApiProperty({ example: 'ACTIVE' })
  status!: string
}

export class ReachabilityResponseDto {
  @ApiProperty({ description: 'Reachable node ids in traversal order' })
  nodeIds!: string[]

  @ApiProperty({ description: 'Distance (hops) from the entry node per node id' })
  distances!: Record<string, number>

  @ApiPropertyOptional({ type: NodeProjectionDto, isArray: true })
  nodes?: NodeProjectionDto[]
}
