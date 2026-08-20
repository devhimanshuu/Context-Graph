import { Injectable, Logger } from '@nestjs/common'
import type { EntityId } from '@contextgraph/types'
import type {
  ExtractedDocument,
  IngestedKnowledgeNode,
  IngestedGraphRelationship,
  GraphRelationshipType,
} from '../domain/ingestion.types'
import { IGraphRelationshipDetector } from '../domain/ingestion.interfaces'

/**
 * Graph Relationship Detector Service — detects relationships between knowledge nodes.
 *
 * Creates deterministic relationships based on document structure:
 * - DOCUMENT_CONTAINS_SECTION
 * - SECTION_CONTAINS_CHUNK
 * - DOCUMENT_BELONGS_TO_DEPARTMENT
 * - NODE_DERIVED_FROM_DOCUMENT
 * - NODE_RELATED_TO_TOPIC
 *
 * Does NOT use LLM for relationship detection (deterministic only).
 * All relationships must pass Graph Engine validation.
 */
@Injectable()
export class GraphRelationshipDetectorService implements IGraphRelationshipDetector {
  private readonly logger = new Logger(GraphRelationshipDetectorService.name)

  async detectRelationships(
    documentId: EntityId,
    nodes: readonly IngestedKnowledgeNode[],
    extracted: ExtractedDocument,
  ): Promise<readonly IngestedGraphRelationship[]> {
    this.logger.debug('Detecting graph relationships', {
      documentId,
      nodeCount: nodes.length,
      sectionCount: extracted.sections.length,
    })

    const relationships: IngestedGraphRelationship[] = []

    // 1. Document contains sections
    const documentNode = nodes.find((n) => n.type === 'DOCUMENT')
    const sectionNodes = nodes.filter((n) => n.type === 'SECTION')

    if (documentNode) {
      for (const sectionNode of sectionNodes) {
        relationships.push({
          sourceNodeId: documentNode.nodeId,
          targetNodeId: sectionNode.nodeId,
          relationshipType: 'DOCUMENT_CONTAINS_SECTION' as GraphRelationshipType,
          weight: 1.0,
          metadata: {
            sectionTitle: sectionNode.title,
            sectionLevel: sectionNode.metadata.sectionLevel,
          },
        })
      }
    }

    // 2. Sections contain chunks (conceptual relationship)
    for (const sectionNode of sectionNodes) {
      // Create relationship to document chunks (conceptual)
      const chunkCount = Math.ceil(sectionNode.content.length / 1000)
      if (chunkCount > 1) {
        relationships.push({
          sourceNodeId: sectionNode.nodeId,
          targetNodeId: sectionNode.nodeId, // Self-reference for chunk containment
          relationshipType: 'SECTION_CONTAINS_CHUNK' as GraphRelationshipType,
          weight: 0.5,
          metadata: {
            chunkCount,
            totalLength: sectionNode.content.length,
          },
        })
      }
    }

    // 3. Document belongs to department
    if (documentNode && documentNode.departmentId) {
      relationships.push({
        sourceNodeId: documentNode.nodeId,
        targetNodeId: documentNode.departmentId,
        relationshipType: 'DOCUMENT_BELONGS_TO_DEPARTMENT' as GraphRelationshipType,
        weight: 1.0,
        metadata: {
          departmentId: documentNode.departmentId,
        },
      })
    }

    // 4. Nodes derived from document
    for (const node of nodes) {
      if (node.type !== 'DOCUMENT' && node.documentId === documentId) {
        relationships.push({
          sourceNodeId: node.nodeId,
          targetNodeId: documentId,
          relationshipType: 'NODE_DERIVED_FROM_DOCUMENT' as GraphRelationshipType,
          weight: 0.8,
          metadata: {
            nodeType: node.type,
            documentTitle: extracted.title,
          },
        })
      }
    }

    // 5. Related topics (based on content similarity)
    const topicRelationships = this.detectTopicRelationships(nodes)
    relationships.push(...topicRelationships)

    this.logger.debug('Relationship detection complete', {
      documentId,
      relationshipCount: relationships.length,
      relationshipTypes: [...new Set(relationships.map((r) => r.relationshipType))],
    })

    return relationships
  }

  private detectTopicRelationships(
    nodes: readonly IngestedKnowledgeNode[],
  ): IngestedGraphRelationship[] {
    const relationships: IngestedGraphRelationship[] = []

    // Group nodes by type
    const conceptNodes = nodes.filter((n) => n.type === 'CONCEPT')
    const sectionNodes = nodes.filter((n) => n.type === 'SECTION')

    // Connect concepts to sections that mention them
    for (const concept of conceptNodes) {
      for (const section of sectionNodes) {
        if (this.contentMentionsConcept(section.content, concept.title)) {
          relationships.push({
            sourceNodeId: section.nodeId,
            targetNodeId: concept.nodeId,
            relationshipType: 'NODE_RELATED_TO_TOPIC' as GraphRelationshipType,
            weight: 0.6,
            metadata: {
              conceptTitle: concept.title,
              sectionTitle: section.title,
            },
          })
        }
      }
    }

    // Connect related concepts (based on title similarity)
    for (let i = 0; i < conceptNodes.length; i++) {
      const conceptI = conceptNodes[i]
      if (!conceptI) continue

      for (let j = i + 1; j < conceptNodes.length; j++) {
        const conceptJ = conceptNodes[j]
        if (!conceptJ) continue

        const similarity = this.calculateTitleSimilarity(conceptI.title, conceptJ.title)
        if (similarity > 0.3) {
          relationships.push({
            sourceNodeId: conceptI.nodeId,
            targetNodeId: conceptJ.nodeId,
            relationshipType: 'NODE_RELATED_TO_TOPIC' as GraphRelationshipType,
            weight: similarity,
            metadata: {
              similarity,
              concept1: conceptI.title,
              concept2: conceptJ.title,
            },
          })
        }
      }
    }

    return relationships
  }

  private contentMentionsConcept(content: string, conceptTitle: string): boolean {
    const contentLower = content.toLowerCase()
    const conceptLower = conceptTitle.toLowerCase()

    // Check if concept is mentioned in content
    return contentLower.includes(conceptLower)
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = title1.toLowerCase().split(/\s+/)
    const words2 = title2.toLowerCase().split(/\s+/)

    const set1 = new Set(words1)
    const set2 = new Set(words2)

    // Calculate Jaccard similarity
    const intersection = new Set([...set1].filter((x) => set2.has(x)))
    const union = new Set([...set1, ...set2])

    if (union.size === 0) return 0
    return intersection.size / union.size
  }
}
