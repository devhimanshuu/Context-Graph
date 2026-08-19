import { describe, it, expect, beforeEach } from 'vitest'
import {
  GenericTokenEstimator,
  OpenAITokenEstimator,
  AnthropicTokenEstimator,
} from './token-estimator.service'
import type { ContextItem } from '../domain/ai.types'

describe('TokenEstimator', () => {
  describe('GenericTokenEstimator', () => {
    let estimator: GenericTokenEstimator

    beforeEach(() => {
      estimator = new GenericTokenEstimator()
    })

    it('should estimate tokens for empty string', () => {
      expect(estimator.estimateTokens('')).toBe(0)
    })

    it('should estimate tokens for simple text', () => {
      // 16 chars / 4 = 4 tokens
      expect(estimator.estimateTokens('Hello, world!')).toBe(4)
    })

    it('should estimate tokens for longer text', () => {
      // 100 chars / 4 = 25 tokens
      expect(estimator.estimateTokens('a'.repeat(100))).toBe(25)
    })

    it('should round up for non-divisible lengths', () => {
      // 15 chars / 4 = 3.75 -> 4 tokens
      expect(estimator.estimateTokens('a'.repeat(15))).toBe(4)
    })

    it('should return provider name', () => {
      expect(estimator.getProvider()).toBe('generic')
    })

    it('should estimate tokens for multiple items', () => {
      const items: ContextItem[] = [
        {
          id: '1',
          nodeId: '1',
          title: 'Title',
          content: 'Content',
          type: 'FACT',
          importance: 50,
          distance: 1,
          priority: 'NORMAL',
          compressionHint: 'FULL',
          inclusionReason: 'GRAPH_TRAVERSAL',
          complianceTags: [],
          source: {
            nodeId: '1',
            organizationId: 'org',
            departmentId: null,
            workspaceId: 'ws',
            version: null,
          },
          tokens: 100,
          rank: 1,
        },
      ]

      const total = estimator.estimateTokensForItems(items)
      expect(total).toBeGreaterThan(0)
    })
  })

  describe('OpenAITokenEstimator', () => {
    let estimator: OpenAITokenEstimator

    beforeEach(() => {
      estimator = new OpenAITokenEstimator()
    })

    it('should estimate tokens for empty string', () => {
      expect(estimator.estimateTokens('')).toBe(0)
    })

    it('should estimate tokens with OpenAI ratio (3.5 chars/token)', () => {
      // 14 chars / 3.5 = 4 tokens
      expect(estimator.estimateTokens('Hello, world!')).toBe(4)
    })

    it('should return provider name', () => {
      expect(estimator.getProvider()).toBe('openai')
    })
  })

  describe('AnthropicTokenEstimator', () => {
    let estimator: AnthropicTokenEstimator

    beforeEach(() => {
      estimator = new AnthropicTokenEstimator()
    })

    it('should estimate tokens for empty string', () => {
      expect(estimator.estimateTokens('')).toBe(0)
    })

    it('should estimate tokens with Anthropic ratio (3.3 chars/token)', () => {
      // 10 chars / 3.3 = 3.03 -> 4 tokens
      expect(estimator.estimateTokens('1234567890')).toBe(4)
    })

    it('should return provider name', () => {
      expect(estimator.getProvider()).toBe('anthropic')
    })
  })
})
