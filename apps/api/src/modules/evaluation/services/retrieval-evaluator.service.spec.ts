import { describe, it, expect, beforeEach } from 'vitest'
import { RetrievalEvaluatorService } from './retrieval-evaluator.service'

describe('RetrievalEvaluatorService', () => {
  let service: RetrievalEvaluatorService

  beforeEach(() => {
    service = new RetrievalEvaluatorService()
  })

  describe('calculatePrecisionAtK', () => {
    it('should calculate precision@1 correctly', () => {
      const retrieved = ['a', 'b', 'c', 'd', 'e']
      const relevant = ['a', 'c']
      expect(service.calculatePrecisionAtK(retrieved, relevant, 1)).toBe(1) // 'a' is relevant
    })

    it('should calculate precision@3 correctly', () => {
      const retrieved = ['a', 'b', 'c', 'd', 'e']
      const relevant = ['a', 'c']
      expect(service.calculatePrecisionAtK(retrieved, relevant, 3)).toBeCloseTo(2 / 3)
    })

    it('should return 0 when k is 0', () => {
      expect(service.calculatePrecisionAtK(['a'], ['a'], 0)).toBe(0)
    })

    it('should return 0 when retrieved is empty', () => {
      expect(service.calculatePrecisionAtK([], ['a'], 5)).toBe(0)
    })
  })

  describe('calculateRecallAtK', () => {
    it('should calculate recall@5 correctly', () => {
      const retrieved = ['a', 'b', 'c', 'd', 'e']
      const relevant = ['a', 'c', 'f']
      expect(service.calculateRecallAtK(retrieved, relevant, 5)).toBeCloseTo(2 / 3)
    })

    it('should return 0 when no relevant items', () => {
      expect(service.calculateRecallAtK(['a', 'b'], [], 5)).toBe(0)
    })

    it('should return 0 when k is 0', () => {
      expect(service.calculateRecallAtK(['a'], ['a'], 0)).toBe(0)
    })
  })

  describe('calculateMRR', () => {
    it('should return 1 when first item is relevant', () => {
      const retrieved = ['a', 'b', 'c']
      const relevant = ['a']
      expect(service.calculateMRR(retrieved, relevant)).toBe(1)
    })

    it('should return 0.5 when second item is relevant', () => {
      const retrieved = ['a', 'b', 'c']
      const relevant = ['b']
      expect(service.calculateMRR(retrieved, relevant)).toBe(0.5)
    })

    it('should return 0 when no relevant items', () => {
      const retrieved = ['a', 'b', 'c']
      const relevant = ['x', 'y']
      expect(service.calculateMRR(retrieved, relevant)).toBe(0)
    })

    it('should return 0 when empty retrieved', () => {
      expect(service.calculateMRR([], ['a'])).toBe(0)
    })
  })

  describe('calculateNDCG', () => {
    it('should return 1 for perfect ranking', () => {
      const retrieved = ['a', 'b']
      const relevanceScores = { a: 2, b: 1, c: 0 }
      expect(service.calculateNDCG(retrieved, relevanceScores, 2)).toBe(1)
    })

    it('should return 0 when idcg is 0', () => {
      const retrieved = ['a', 'b']
      const relevanceScores = { a: 0, b: 0 }
      expect(service.calculateNDCG(retrieved, relevanceScores, 2)).toBe(0)
    })

    it('should return 0 when k is 0', () => {
      expect(service.calculateNDCG(['a'], { a: 1 }, 0)).toBe(0)
    })
  })

  describe('calculateHitRate', () => {
    it('should return 1 when at least one relevant item in top K', () => {
      const retrieved = ['a', 'b', 'c']
      const relevant = ['c']
      expect(service.calculateHitRate(retrieved, relevant, 5)).toBe(1)
    })

    it('should return 0 when no relevant items in top K', () => {
      const retrieved = ['a', 'b', 'c']
      const relevant = ['x']
      expect(service.calculateHitRate(retrieved, relevant, 3)).toBe(0)
    })
  })

  describe('evaluateRetrieval', () => {
    it('should return complete metrics', () => {
      const retrieved = ['a', 'b', 'c', 'd', 'e']
      const relevant = ['a', 'c']
      const excluded = ['x']

      const metrics = service.evaluateRetrieval(retrieved, relevant, excluded)

      expect(metrics.precisionAt1).toBe(1)
      expect(metrics.precisionAt5).toBe(0.4)
      expect(metrics.recallAt5).toBe(1)
      expect(metrics.mrr).toBe(1)
      expect(metrics.hitRateAt5).toBe(1)
    })

    it('should handle empty inputs', () => {
      const metrics = service.evaluateRetrieval([], [], [])
      expect(metrics.precisionAt1).toBe(0)
      expect(metrics.mrr).toBe(0)
    })
  })

  describe('aggregateRetrievalMetrics', () => {
    it('should aggregate metrics across multiple results', () => {
      const results = [
        { retrievedNodes: ['a', 'b'], expectedRelevantNodes: ['a'], expectedExcludedNodes: [] },
        { retrievedNodes: ['a', 'b'], expectedRelevantNodes: ['b'], expectedExcludedNodes: [] },
      ]

      const metrics = service.aggregateRetrievalMetrics(results)
      expect(metrics.mrr).toBe(0.75) // (1 + 0.5) / 2
    })
  })
})
