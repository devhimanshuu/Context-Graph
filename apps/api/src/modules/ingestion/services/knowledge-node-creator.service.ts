import { Injectable, Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { EntityId, Score } from '@contextgraph/types'
import type {
  ExtractedDocument,
  IngestedKnowledgeNode,
  KnowledgeNodeType,
  KnowledgeNodeStatus,
} from '../domain/ingestion.types'
import { IKnowledgeNodeCreator } from '../domain/ingestion.interfaces'

/**
 * Knowledge Node Creator Service — transforms document sections into knowledge nodes.
 *
 * Creates knowledge nodes from:
 * - Document title (DOCUMENT node)
 * - Major sections (SECTION nodes)
 * - Key concepts (CONCEPT nodes)
 *
 * Does NOT create one node per tiny chunk.
 * Separates Document, Knowledge Node, and Chunk concepts.
 */
@Injectable()
export class KnowledgeNodeCreatorService implements IKnowledgeNodeCreator {
  private readonly logger = new Logger(KnowledgeNodeCreatorService.name)

  async createNodes(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): Promise<readonly IngestedKnowledgeNode[]> {
    this.logger.debug('Creating knowledge nodes', {
      documentId,
      sectionCount: extracted.sections.length,
      headingCount: extracted.headings.length,
    })

    const nodes: IngestedKnowledgeNode[] = []

    // 1. Create document-level node
    const documentNode = this.createDocumentNode(
      documentId,
      documentVersion,
      organizationId,
      workspaceId,
      extracted,
      metadata,
    )
    nodes.push(documentNode)

    // 2. Create section nodes for major sections
    const sectionNodes = this.createSectionNodes(
      documentId,
      documentVersion,
      organizationId,
      workspaceId,
      extracted,
      metadata,
    )
    nodes.push(...sectionNodes)

    // 3. Create concept nodes for key terms
    const conceptNodes = this.createConceptNodes(
      documentId,
      documentVersion,
      organizationId,
      workspaceId,
      extracted,
      metadata,
    )
    nodes.push(...conceptNodes)

    this.logger.debug('Knowledge node creation complete', {
      documentId,
      nodeCount: nodes.length,
      nodeTypes: nodes.map((n) => n.type),
    })

    return nodes
  }

  private createDocumentNode(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): IngestedKnowledgeNode {
    const nodeId = this.generateNodeId(documentId, 'document', 0)
    const content = this.createDocumentContent(extracted, metadata)

    return {
      nodeId,
      documentId,
      documentVersion,
      organizationId,
      workspaceId,
      title: extracted.title,
      content,
      type: 'DOCUMENT' as KnowledgeNodeType,
      importance: this.calculateDocumentImportance(extracted, metadata),
      status: 'ACTIVE' as KnowledgeNodeStatus,
      departmentId: (metadata.departmentId as EntityId) ?? null,
      complianceTags: (metadata.complianceTags as string[]) ?? [],
      metadata: {
        ...metadata,
        nodeType: 'DOCUMENT',
        sectionCount: extracted.sections.length,
        headingCount: extracted.headings.length,
      },
      createdAt: new Date().toISOString(),
    }
  }

  private createSectionNodes(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): IngestedKnowledgeNode[] {
    const nodes: IngestedKnowledgeNode[] = []

    // Create nodes for major sections (level 1 and 2 headings)
    const majorSections = extracted.sections.filter((section) => section.level <= 2)

    majorSections.forEach((section, index) => {
      // Skip very short sections
      if (section.content.length < 100) {
        return
      }

      const nodeId = this.generateNodeId(documentId, 'section', index + 1)
      const importance = this.calculateSectionImportance(section, extracted)

      nodes.push({
        nodeId,
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        title: section.title,
        content: section.content,
        type: 'SECTION' as KnowledgeNodeType,
        importance,
        status: 'ACTIVE' as KnowledgeNodeStatus,
        departmentId: (metadata.departmentId as EntityId) ?? null,
        complianceTags: (metadata.complianceTags as string[]) ?? [],
        metadata: {
          ...metadata,
          nodeType: 'SECTION',
          sectionLevel: section.level,
          sectionIndex: index,
          parentDocumentTitle: extracted.title,
        },
        createdAt: new Date().toISOString(),
      })
    })

    return nodes
  }

  private createConceptNodes(
    documentId: EntityId,
    documentVersion: number,
    organizationId: EntityId,
    workspaceId: EntityId,
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): IngestedKnowledgeNode[] {
    const nodes: IngestedKnowledgeNode[] = []
    const concepts = this.extractKeyConcepts(extracted)

    concepts.forEach((concept, index) => {
      const nodeId = this.generateNodeId(documentId, 'concept', index + 1)

      nodes.push({
        nodeId,
        documentId,
        documentVersion,
        organizationId,
        workspaceId,
        title: concept.title,
        content: concept.content,
        type: 'CONCEPT' as KnowledgeNodeType,
        importance: concept.importance,
        status: 'ACTIVE' as KnowledgeNodeStatus,
        departmentId: (metadata.departmentId as EntityId) ?? null,
        complianceTags: (metadata.complianceTags as string[]) ?? [],
        metadata: {
          ...metadata,
          nodeType: 'CONCEPT',
          conceptSource: concept.source,
        },
        createdAt: new Date().toISOString(),
      })
    })

    return nodes
  }

  private createDocumentContent(
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): string {
    const parts: string[] = []

    // Add title
    parts.push(`# ${extracted.title}`)

    // Add metadata summary
    if (metadata.author) {
      parts.push(`Author: ${metadata.author}`)
    }
    if (metadata.documentType) {
      parts.push(`Type: ${metadata.documentType}`)
    }

    // Add brief content summary (first 500 chars)
    const contentSummary = extracted.text.slice(0, 500)
    if (contentSummary.length > 0) {
      parts.push('')
      parts.push(contentSummary)
      if (extracted.text.length > 500) {
        parts.push('...')
      }
    }

    return parts.join('\n')
  }

  private calculateDocumentImportance(
    extracted: ExtractedDocument,
    metadata: Record<string, unknown>,
  ): Score {
    let importance = 50 // Base importance

    // Increase importance based on document type
    const docType = metadata.documentType as string
    if (docType === 'POLICY') importance += 20
    else if (docType === 'PROCEDURE') importance += 15
    else if (docType === 'GUIDELINE') importance += 10

    // Increase importance based on content length
    if (extracted.text.length > 10000) importance += 10
    else if (extracted.text.length > 5000) importance += 5

    // Increase importance based on section count
    if (extracted.sections.length > 10) importance += 10
    else if (extracted.sections.length > 5) importance += 5

    return Math.min(importance, 100) as Score
  }

  private calculateSectionImportance(
    section: import('../domain/ingestion.types').DocumentSection,
    extracted: ExtractedDocument,
  ): Score {
    let importance = 40 // Base importance for sections

    // Increase importance based on section level
    if (section.level === 1) importance += 15
    else if (section.level === 2) importance += 10

    // Increase importance based on content length
    if (section.content.length > 1000) importance += 10
    else if (section.content.length > 500) importance += 5

    // Increase importance if section is early in document
    const sectionIndex = extracted.sections.indexOf(section)
    if (sectionIndex < 3) importance += 10

    return Math.min(importance, 100) as Score
  }

  private extractKeyConcepts(
    extracted: ExtractedDocument,
  ): Array<{ title: string; content: string; importance: Score; source: string }> {
    const concepts: Array<{ title: string; content: string; importance: Score; source: string }> =
      []

    // Common concept patterns
    const conceptPatterns = [
      { pattern: /(?:definition|define)[:\s]+([^\n]+)/gi, source: 'definition' },
      { pattern: /(?:key concept|important concept)[:\s]+([^\n]+)/gi, source: 'key concept' },
      { pattern: /(?:term|terminology)[:\s]+([^\n]+)/gi, source: 'terminology' },
    ]

    for (const { pattern, source } of conceptPatterns) {
      const matches = extracted.text.matchAll(pattern)
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          concepts.push({
            title: match[1].slice(0, 100),
            content: match[1],
            importance: 60 as Score,
            source,
          })
        }
      }
    }

    // Limit to top 10 concepts
    return concepts.slice(0, 10)
  }

  private generateNodeId(documentId: EntityId, type: string, index: number): EntityId {
    const hash = createHash('sha256')
      .update(`${documentId}:${type}:${index}`)
      .digest('hex')
      .slice(0, 16)
    return `node-${hash}` as EntityId
  }
}
