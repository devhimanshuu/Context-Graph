import { type NodeContextDto } from '@/application/dto'
import { type KnowledgeNode, type KnowledgeNodeComplianceTag } from '@/domain/models'

/**
 * Maps a domain `KnowledgeNode` (plus its compliance-tag junction rows) into
 * the `NodeContextDto` the pipeline consumes. The junction rows arrive
 * separately because compliance tags are normalized in the data model.
 */
export interface INodeMapper {
  toContext(
    node: KnowledgeNode,
    complianceTags?: readonly KnowledgeNodeComplianceTag[],
  ): NodeContextDto
}
