/* Workflow retry manager — calculates retry delays and determines if retries should be attempted. */

import { Injectable } from '@nestjs/common'
import type { Milliseconds } from '@contextgraph/types'
import type { BackoffStrategy } from '@contextgraph/types'
import type { RetryPolicy } from '@contextgraph/types'
import type { IWorkflowRetryManager } from '../domain/workflow.interfaces'

@Injectable()
export class WorkflowRetryManager implements IWorkflowRetryManager {
  shouldRetry(
    retryPolicy: RetryPolicy,
    currentAttempt: number,
    error: string,
  ): { readonly shouldRetry: boolean; readonly delayMs: Milliseconds } {
    // Check if error is explicitly non-retryable
    for (const pattern of retryPolicy.nonRetryableErrors) {
      if (error.includes(pattern)) {
        return { shouldRetry: false, delayMs: 0 }
      }
    }

    // Check if we have retries remaining
    if (currentAttempt >= retryPolicy.maxAttempts) {
      return { shouldRetry: false, delayMs: 0 }
    }

    // Check if error matches a retryable pattern (or allow all if no patterns specified)
    if (retryPolicy.retryableErrors.length > 0) {
      const isRetryable = retryPolicy.retryableErrors.some((pattern) => error.includes(pattern))
      if (!isRetryable) {
        return { shouldRetry: false, delayMs: 0 }
      }
    }

    const delayMs = this.calculateDelay(
      retryPolicy.backoffStrategy,
      retryPolicy.baseDelayMs,
      currentAttempt,
      retryPolicy.maxDelayMs,
    )

    return { shouldRetry: true, delayMs }
  }

  calculateDelay(
    strategy: BackoffStrategy,
    baseDelayMs: Milliseconds,
    attempt: number,
    maxDelayMs: Milliseconds,
  ): Milliseconds {
    let delay: Milliseconds

    switch (strategy) {
      case 'FIXED':
        delay = baseDelayMs
        break
      case 'LINEAR':
        delay = baseDelayMs * attempt
        break
      case 'EXPONENTIAL':
        delay = baseDelayMs * Math.pow(2, attempt - 1)
        break
      default:
        delay = baseDelayMs
    }

    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1)
    delay = Math.round(delay + jitter)

    return Math.min(delay, maxDelayMs)
  }
}
