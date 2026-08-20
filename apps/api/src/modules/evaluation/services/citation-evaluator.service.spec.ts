import { describe, it, expect, beforeEach } from 'vitest'
import { CitationEvaluatorService } from './citation-evaluator.service'

describe('CitationEvaluatorService', () => {
  let service: CitationEvaluatorService

  beforeEach(() => {
    service = new CitationEvaluatorService()
  })

  describe('evaluateCitations', () => {
    it('should calculate citation precision correctly', () => {
      const responseText = 'According to [1] and [2]'
      const citations = [
        { nodeId: 'node-1', claim: 'test claim', position: 10 },
        { nodeId: 'node-2', claim: 'another claim', position: 20 },
      ]
      const contextNodes = [
        { nodeId: 'node-1', content: 'content 1' },
        { nodeId: 'node-2', content: 'content 2' },
      ]
      const expectedCitations = [{ nodeId: 'node-1', expectedClaim: 'test claim' }]

      const metrics = service.evaluateCitations(
        responseText,
        citations,
        contextNodes,
        expectedCitations,
      )

      expect(metrics.citationPrecision).toBe(1) // All citations are valid
      expect(metrics.validCitations).toBe(2)
      expect(metrics.invalidCitations).toBe(0)
    })

    it('should detect invalid citations', () => {
      const responseText = 'According to [1] and [fake]'
      const citations = [
        { nodeId: 'node-1', claim: 'test claim', position: 10 },
        { nodeId: 'fake', claim: 'fake claim', position: 20 },
      ]
      const contextNodes = [{ nodeId: 'node-1', content: 'content 1' }]
      const expectedCitations = []

      const metrics = service.evaluateCitations(
        responseText,
        citations,
        contextNodes,
        expectedCitations,
      )

      expect(metrics.citationPrecision).toBe(0.5) // 1 valid / 2 total
      expect(metrics.invalidCitations).toBe(1)
    })

    it('should calculate recall correctly', () => {
      const responseText = 'According to [1]'
      const citations = [{ nodeId: 'node-1', claim: 'test claim', position: 10 }]
      const contextNodes = [
        { nodeId: 'node-1', content: 'content 1' },
        { nodeId: 'node-2', content: 'content 2' },
      ]
      const expectedCitations = [
        { nodeId: 'node-1', expectedClaim: 'test claim' },
        { nodeId: 'node-2', expectedClaim: 'another claim' },
      ]

      const metrics = service.evaluateCitations(
        responseText,
        citations,
        contextNodes,
        expectedCitations,
      )

      expect(metrics.citationRecall).toBe(0.5) // 1 expected present / 2 total
      expect(metrics.missingCitations).toBe(1)
    })
  })

  describe('extractCitationsFromText', () => {
    it('should extract numbered citations', () => {
      const text = 'According to [1] and [2] and [3]'
      const citations = service.extractCitationsFromText(text)
      expect(citations).toHaveLength(3)
      expect(citations[0].citation).toBe('1')
      expect(citations[1].citation).toBe('2')
      expect(citations[2].citation).toBe('3')
    })

    it('should extract node citations', () => {
      const text = 'See (node-123) for details'
      const citations = service.extractCitationsFromText(text)
      expect(citations).toHaveLength(1)
      expect(citations[0].citation).toBe('node-123')
    })
  })

  describe('validateCitationReferences', () => {
    it('should validate citations against context', () => {
      const citations = ['node-1', 'node-2', 'node-fake']
      const contextNodes = [
        { nodeId: 'node-1', content: 'content 1' },
        { nodeId: 'node-2', content: 'content 2' },
      ]

      const result = service.validateCitationReferences(citations, contextNodes)
      expect(result.valid).toEqual(['node-1', 'node-2'])
      expect(result.invalid).toEqual(['node-fake'])
    })
  })
})
