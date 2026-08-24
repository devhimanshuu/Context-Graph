/* Unit tests for Workflow Retry Manager — validates retry logic and backoff. */

import { WorkflowRetryManager } from './workflow-retry-manager'
import { type RetryPolicy } from '@contextgraph/types'

describe('WorkflowRetryManager', () => {
  const manager = new WorkflowRetryManager()

  const defaultPolicy: RetryPolicy = {
    maxAttempts: 3,
    backoffStrategy: 'EXPONENTIAL',
    baseDelayMs: 1_000,
    maxDelayMs: 30_000,
    retryableErrors: ['TIMEOUT', 'DEPENDENCY_ERROR'],
    nonRetryableErrors: ['AUTHORIZATION_DENIED', 'VALIDATION_ERROR'],
  }

  describe('shouldRetry', () => {
    it('should retry on retryable error within max attempts', () => {
      const result = manager.shouldRetry(defaultPolicy, 1, 'TIMEOUT error')
      expect(result.shouldRetry).toBe(true)
      expect(result.delayMs).toBeGreaterThan(0)
    })

    it('should NOT retry when max attempts reached', () => {
      const result = manager.shouldRetry(defaultPolicy, 3, 'TIMEOUT error')
      expect(result.shouldRetry).toBe(false)
    })

    it('should NOT retry on non-retryable error', () => {
      const result = manager.shouldRetry(defaultPolicy, 1, 'AUTHORIZATION_DENIED')
      expect(result.shouldRetry).toBe(false)
    })

    it('should NOT retry on unknown error when retryable patterns are specified', () => {
      const result = manager.shouldRetry(defaultPolicy, 1, 'UNKNOWN_SOME_WEIRD_ERROR')
      expect(result.shouldRetry).toBe(false)
    })

    it('should retry on any error when no retryable patterns are specified', () => {
      const policy: RetryPolicy = {
        ...defaultPolicy,
        retryableErrors: [],
        nonRetryableErrors: [],
      }
      const result = manager.shouldRetry(policy, 1, 'ANY_ERROR')
      expect(result.shouldRetry).toBe(true)
    })

    it('should not retry if error matches non-retryable before retryable', () => {
      const policy: RetryPolicy = {
        ...defaultPolicy,
        retryableErrors: ['TIMEOUT'],
        nonRetryableErrors: ['TIMEOUT'],
      }
      const result = manager.shouldRetry(policy, 1, 'TIMEOUT')
      expect(result.shouldRetry).toBe(false)
    })
  })

  describe('calculateDelay', () => {
    it('should calculate fixed delay', () => {
      const delay = manager.calculateDelay('FIXED', 1000, 1, 30_000)
      // Should be around 1000 ± 20% jitter
      expect(delay).toBeGreaterThanOrEqual(800)
      expect(delay).toBeLessThanOrEqual(1200)
    })

    it('should calculate linear delay', () => {
      const delay = manager.calculateDelay('LINEAR', 1000, 3, 30_000)
      // Should be around 3000 ± 20% jitter
      expect(delay).toBeGreaterThanOrEqual(2400)
      expect(delay).toBeLessThanOrEqual(3600)
    })

    it('should calculate exponential delay', () => {
      const delay = manager.calculateDelay('EXPONENTIAL', 1000, 3, 30_000)
      // Should be around 4000 ± 20% jitter
      expect(delay).toBeGreaterThanOrEqual(3200)
      expect(delay).toBeLessThanOrEqual(4800)
    })

    it('should cap delay at maxDelayMs', () => {
      const delay = manager.calculateDelay('EXPONENTIAL', 1000, 10, 5000)
      expect(delay).toBeLessThanOrEqual(5000)
    })
  })
})
