import { Injectable } from '@nestjs/common'
import type { AssembledContext, Citation, CitationValidationResult } from '../domain/ai.types'
import type { ICitationValidator } from '../domain/ai.interfaces'

/** Regex pattern for citation references like [1], [2], etc. */
const CITATION_PATTERN = /\[(\d+)\]/g

/**
 * Citation Validator — validates citations against assembled context.
 *
 * Ensures that:
 * - Citation indices are valid (1-based)
 * - Referenced nodes exist in the context
 * - Citation format is correct
 *
 * Invalid citations are marked but not silently removed,
 * allowing the response validator to decide handling.
 */
@Injectable()
export class CitationValidator implements ICitationValidator {
  validate(responseText: string, context: AssembledContext): CitationValidationResult {
    const citations: Citation[] = []
    const errors: string[] = []
    const seenIndices = new Set<number>()

    // Extract all citations from response
    let match: RegExpExecArray | null
    while ((match = CITATION_PATTERN.exec(responseText)) !== null) {
      const matchGroup = match[1]
      if (matchGroup === undefined) continue
      const index = parseInt(matchGroup, 10)

      if (seenIndices.has(index)) {
        continue // Skip duplicate citations
      }
      seenIndices.add(index)

      // Validate citation index
      if (index < 1 || index > context.items.length) {
        errors.push(`Invalid citation index: ${index}`)
        citations.push({
          index,
          nodeId: '',
          title: '',
          source: {
            nodeId: '',
            organizationId: '',
            departmentId: null,
            workspaceId: '',
            version: null,
          },
          valid: false,
          validationError: `Citation index ${index} out of range (1-${context.items.length})`,
        })
        continue
      }

      // Map citation index to context item (1-based)
      const contextItem = context.items[index - 1]
      if (contextItem === undefined || contextItem === null) {
        errors.push(`Citation ${index} maps to missing context item`)
        citations.push({
          index,
          nodeId: '',
          title: '',
          source: {
            nodeId: '',
            organizationId: '',
            departmentId: null,
            workspaceId: '',
            version: null,
          },
          valid: false,
          validationError: 'Context item not found',
        })
        continue
      }

      citations.push({
        index,
        nodeId: contextItem.nodeId,
        title: contextItem.title,
        source: contextItem.source,
        valid: true,
        validationError: null,
      })
    }

    return {
      valid: errors.length === 0,
      citations,
      invalidCount: errors.length,
      errors,
    }
  }
}
