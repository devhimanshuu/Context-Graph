/* In-memory action audit logger — immutable append-only audit trail for action check decisions.

In production, this would use PostgreSQL via Prisma with hash-chain integrity.
For Phase 10, we use an in-memory store to demonstrate the architecture. */

import { Injectable } from '@nestjs/common'
import type {
  ActionAuditRecord,
  ActionDecisionType,
  GuardrailDashboardOverview,
} from '@contextgraph/types'
import { IActionAuditLogger } from '../domain/guardrails.interfaces'

@Injectable()
export class InMemoryActionAuditLogger implements IActionAuditLogger {
  private readonly records: ActionAuditRecord[] = []

  async recordDecision(record: ActionAuditRecord): Promise<void> {
    this.records.push({ ...record })
  }

  async findByOrganization(
    organizationId: string,
    filters?: {
      action?: string
      decision?: ActionDecisionType
      from?: string
      to?: string
      limit?: number
      offset?: number
    },
  ): Promise<readonly ActionAuditRecord[]> {
    let filtered = this.records.filter((r) => r.organizationId === organizationId)

    if (filters?.action !== undefined) {
      filtered = filtered.filter((r) => r.action === filters.action)
    }
    if (filters?.decision !== undefined) {
      filtered = filtered.filter((r) => r.decision === filters.decision)
    }
    if (filters?.from !== undefined) {
      filtered = filtered.filter((r) => r.timestamp >= filters.from!)
    }
    if (filters?.to !== undefined) {
      filtered = filtered.filter((r) => r.timestamp <= filters.to!)
    }

    // Sort by timestamp descending (newest first).
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    if (filters?.offset !== undefined) {
      filtered = filtered.slice(filters.offset)
    }
    if (filters?.limit !== undefined) {
      filtered = filtered.slice(0, filters.limit)
    }

    return filtered
  }

  async getOverview(organizationId: string): Promise<GuardrailDashboardOverview> {
    const orgRecords = this.records.filter((r) => r.organizationId === organizationId)

    const totalChecks = orgRecords.length
    const allowed = orgRecords.filter((r) => r.decision === 'ALLOW').length
    const denied = orgRecords.filter((r) => r.decision === 'DENY').length
    const approvalRequired = orgRecords.filter((r) => r.decision === 'REQUIRES_APPROVAL').length

    const avgLatency =
      totalChecks > 0 ? orgRecords.reduce((sum, r) => sum + r.latencyMs, 0) / totalChecks : 0

    // Group by risk level.
    const riskCounts = new Map<string, number>()
    for (const r of orgRecords) {
      riskCounts.set(r.riskLevel, (riskCounts.get(r.riskLevel) ?? 0) + 1)
    }

    return {
      totalChecks,
      allowed,
      denied,
      approvalRequired,
      topViolatedPolicies: [],
      recentDecisions: orgRecords.slice(-10),
      averageEvaluationTimeMs: Math.round(avgLatency),
      checksByRiskLevel: [...riskCounts.entries()].map(([riskLevel, count]) => ({
        riskLevel,
        count,
      })),
    }
  }
}
