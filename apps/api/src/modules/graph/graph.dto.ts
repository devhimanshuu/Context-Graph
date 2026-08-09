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

export class TraversalNodeDto {
  @ApiProperty()
  id!: string

  @ApiProperty({ description: 'Hop distance from the entry node' })
  distance!: number

  @ApiProperty({ description: 'Deterministic discovery order' })
  order!: number

  @ApiProperty({ description: 'Direct parents (one hop toward the root)' })
  parentIds!: string[]
}

export class TraversalMetadataDto {
  @ApiProperty()
  visitedNodeCount!: number

  @ApiProperty()
  traversalDepth!: number

  @ApiProperty()
  edgesExamined!: number

  @ApiProperty()
  duplicateVisitsPrevented!: number

  @ApiProperty()
  maxQueueSize!: number

  @ApiProperty({ description: 'Wall-clock duration in milliseconds' })
  traversalDurationMs!: number

  @ApiProperty({ description: 'Whether maxDepth truncated the traversal' })
  truncated!: boolean
}

export class ReachabilityResponseDto {
  @ApiProperty({ description: 'Resolved entry node id' })
  entryNodeId!: string

  @ApiProperty({ description: 'Reachable node ids in deterministic traversal order' })
  nodeIds!: string[]

  @ApiProperty({ description: 'Distance (hops) from the entry node per node id' })
  distances!: Record<string, number>

  @ApiPropertyOptional({
    description: 'Accumulated edge weight per node (weighted strategy only)',
  })
  costs?: Record<string, number>

  @ApiProperty({ description: 'Discovery order per node id' })
  order!: Record<string, number>

  @ApiPropertyOptional({ type: NodeProjectionDto, isArray: true })
  nodes?: NodeProjectionDto[]

  @ApiPropertyOptional({ type: TraversalNodeDto, isArray: true })
  traversal?: TraversalNodeDto[]

  @ApiPropertyOptional({ type: TraversalMetadataDto })
  metadata?: TraversalMetadataDto
}

/**
 * Debug-only reachability response. Exposes the raw engine output — full
 * traversal metadata — for a graph that was validated before traversal.
 */
export class DebugReachabilityResponseDto {
  @ApiProperty({ description: 'Resolved entry node id' })
  entryNodeId!: string

  @ApiProperty({
    description: 'Always true — an invalid graph throws before this response is produced',
  })
  validatedGraph!: boolean

  @ApiProperty({ description: 'Reachable node ids in deterministic traversal order' })
  nodeIds!: string[]

  @ApiProperty({ description: 'Distance (hops) from the entry node per node id' })
  distances!: Record<string, number>

  @ApiProperty({ description: 'Discovery order per node id' })
  order!: Record<string, number>

  @ApiProperty({ type: TraversalNodeDto, isArray: true, description: 'Raw traversal nodes' })
  nodes!: TraversalNodeDto[]

  @ApiProperty({ type: TraversalMetadataDto, description: 'Raw engine counters' })
  metadata!: TraversalMetadataDto
}
