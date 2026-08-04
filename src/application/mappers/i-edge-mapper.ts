import { type TraversalEdgeDto } from '@/application/dto'
import { type GraphEdge } from '@/domain/models'

/**
 * Maps a domain `GraphEdge` into the compact `TraversalEdgeDto` recorded in
 * traversal results and candidate provenance.
 */
export interface IEdgeMapper {
  toContext(edge: GraphEdge): TraversalEdgeDto
}
