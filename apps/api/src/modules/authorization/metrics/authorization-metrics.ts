import { Injectable } from '@nestjs/common'
import type { Milliseconds } from '@contextgraph/types'

/** Aggregated authorization counters for observability (Prometheus-ready abstraction). */
export interface AuthorizationMetricsSnapshot {
  checks: number
  allowed: number
  denied: number
  cacheHits: number
  cacheMisses: number
  /** denial count keyed by the failing policy name. */
  denialReasons: Readonly<Record<string, number>>
  totalEvaluationDurationMs: number
}

/** Observability contract of the authorization engine. Never bound to a provider. */
export interface IAuthorizationMetrics {
  recordCheck(allowed: boolean, durationMs: Milliseconds): void
  recordCacheHit(): void
  recordCacheMiss(): void
  recordDenial(failedPolicy: string): void
  snapshot(): AuthorizationMetricsSnapshot
}

/** DI token for authorization metrics. */
export const AUTHORIZATION_METRICS = Symbol('IAuthorizationMetrics')

@Injectable()
export class InMemoryAuthorizationMetrics implements IAuthorizationMetrics {
  private checks = 0
  private allowed = 0
  private denied = 0
  private cacheHits = 0
  private cacheMisses = 0
  private readonly denialReasons = new Map<string, number>()
  private totalEvaluationDurationMs = 0

  recordCheck(allow: boolean, durationMs: Milliseconds): void {
    this.checks += 1
    if (allow) this.allowed += 1
    else this.denied += 1
    this.totalEvaluationDurationMs += durationMs
  }

  recordCacheHit(): void {
    this.cacheHits += 1
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1
  }

  recordDenial(failedPolicy: string): void {
    this.denialReasons.set(failedPolicy, (this.denialReasons.get(failedPolicy) ?? 0) + 1)
  }

  snapshot(): AuthorizationMetricsSnapshot {
    return {
      checks: this.checks,
      allowed: this.allowed,
      denied: this.denied,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      denialReasons: Object.fromEntries(this.denialReasons),
      totalEvaluationDurationMs: this.totalEvaluationDurationMs,
    }
  }
}
