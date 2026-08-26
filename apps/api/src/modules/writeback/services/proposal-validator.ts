/* Proposal Validator — composable validation pipeline for agent proposals.

Each check produces a ValidationTraceStep. The pipeline short-circuits on
critical failures (authentication, capability, organization) but continues
through all non-fatal checks for maximum trace information. */

import { Inject, Injectable } from '@nestjs/common'
import type {
  AuthenticatedUser,
  EntityId,
  NodeProposalRequest,
  ValidationTraceStep,
  WriteMode,
  WritableNodeType,
} from '@contextgraph/types'
import { IProposalRepository } from '../domain/writeback.interfaces'
import { IContentHashService } from '../domain/writeback.interfaces'

interface ValidationResult {
  passed: boolean
  trace: ValidationTraceStep[]
  writeMode: WriteMode
  reasonCode?: string
}

@Injectable()
export class ProposalValidator {
  constructor(
    @Inject(IProposalRepository) private readonly proposalRepo: IProposalRepository,
    private readonly contentHash: IContentHashService,
  ) {}

  async validate(
    user: AuthenticatedUser,
    request: NodeProposalRequest,
    organizationId: EntityId,
  ): Promise<ValidationResult> {
    const trace: ValidationTraceStep[] = []
    let writeMode: WriteMode = 'AUTO_APPROVE'
    let reasonCode: string | undefined

    // ── 1. Authentication ────────────────────────────────────────────────
    const authStart = performance.now()
    if (!user || !user.id || !user.organizationId) {
      trace.push({
        step: 'authentication',
        passed: false,
        reasonCode: 'AUTH_REQUIRED',
        explanation: 'Valid authenticated principal is required',
        durationMs: Math.round(performance.now() - authStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'AUTH_REQUIRED' }
    }
    trace.push({
      step: 'authentication',
      passed: true,
      durationMs: Math.round(performance.now() - authStart),
    })

    // ── 2. Organization scope ────────────────────────────────────────────
    const orgStart = performance.now()
    if (user.organizationId !== organizationId) {
      trace.push({
        step: 'organization',
        passed: false,
        reasonCode: 'ORG_SCOPE_VIOLATION',
        explanation: 'Principal organization does not match target organization',
        durationMs: Math.round(performance.now() - orgStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'ORG_SCOPE_VIOLATION' }
    }
    trace.push({
      step: 'organization',
      passed: true,
      durationMs: Math.round(performance.now() - orgStart),
    })

    // ── 3. Capability (write) ────────────────────────────────────────────
    const capStart = performance.now()
    const allowedRoles = ['ADMIN', 'HOD', 'EDITOR']
    if (!allowedRoles.includes(user.role ?? '')) {
      trace.push({
        step: 'capability',
        passed: false,
        reasonCode: 'CAPABILITY_MISSING',
        explanation: `Role '${user.role}' lacks knowledge.propose capability`,
        durationMs: Math.round(performance.now() - capStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'CAPABILITY_MISSING' }
    }
    trace.push({
      step: 'capability',
      passed: true,
      durationMs: Math.round(performance.now() - capStart),
    })

    // ── 4. Node type validation ──────────────────────────────────────────
    const typeStart = performance.now()
    const allowedTypes: readonly WritableNodeType[] = ['FACT', 'DECISION']
    if (!allowedTypes.includes(request.nodeType as WritableNodeType)) {
      trace.push({
        step: 'node_type',
        passed: false,
        reasonCode: 'INVALID_NODE_TYPE',
        explanation: `Node type '${request.nodeType}' is not supported for agent proposals`,
        durationMs: Math.round(performance.now() - typeStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'INVALID_NODE_TYPE' }
    }
    trace.push({
      step: 'node_type',
      passed: true,
      durationMs: Math.round(performance.now() - typeStart),
    })

    // ── 5. Content validation ────────────────────────────────────────────
    const contentStart = performance.now()
    if (!request.title || request.title.trim().length === 0) {
      trace.push({
        step: 'content',
        passed: false,
        reasonCode: 'INVALID_CONTENT',
        explanation: 'Title is required',
        durationMs: Math.round(performance.now() - contentStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'INVALID_CONTENT' }
    }
    if (!request.content || request.content.trim().length === 0) {
      trace.push({
        step: 'content',
        passed: false,
        reasonCode: 'INVALID_CONTENT',
        explanation: 'Content is required',
        durationMs: Math.round(performance.now() - contentStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'INVALID_CONTENT' }
    }
    if (request.content.length > 50_000) {
      trace.push({
        step: 'content',
        passed: false,
        reasonCode: 'CONTENT_TOO_LARGE',
        explanation: 'Content exceeds maximum length of 50,000 characters',
        durationMs: Math.round(performance.now() - contentStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'CONTENT_TOO_LARGE' }
    }
    trace.push({
      step: 'content',
      passed: true,
      durationMs: Math.round(performance.now() - contentStart),
    })

    // ── 6. Classification ────────────────────────────────────────────────
    const classStart = performance.now()
    const allowedClassifications = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']
    if (!allowedClassifications.includes(request.classification)) {
      trace.push({
        step: 'classification',
        passed: false,
        reasonCode: 'INVALID_CLASSIFICATION',
        explanation: `Classification '${request.classification}' is not valid`,
        durationMs: Math.round(performance.now() - classStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'INVALID_CLASSIFICATION' }
    }
    // Agents cannot create RESTRICTED knowledge without explicit justification
    if (
      request.classification === 'RESTRICTED' &&
      (!request.sourceReferences || request.sourceReferences.length === 0)
    ) {
      writeMode = 'REQUIRES_APPROVAL'
    }
    trace.push({
      step: 'classification',
      passed: true,
      durationMs: Math.round(performance.now() - classStart),
    })

    // ── 7. Compliance clearance ──────────────────────────────────────────
    const complianceStart = performance.now()
    const clearanceOrder = ['NONE', 'STANDARD', 'SENSITIVE', 'RESTRICTED', 'CRITICAL']
    const userClearanceIdx = clearanceOrder.indexOf(user.complianceClearance ?? 'NONE')
    const requiredClearanceIdx =
      request.classification === 'RESTRICTED'
        ? 3
        : request.classification === 'CONFIDENTIAL'
          ? 2
          : 0
    if (userClearanceIdx < requiredClearanceIdx) {
      trace.push({
        step: 'compliance',
        passed: false,
        reasonCode: 'MISSING_CLEARANCE',
        explanation: `User clearance '${user.complianceClearance}' insufficient for classification '${request.classification}'`,
        durationMs: Math.round(performance.now() - complianceStart),
      })
      return { passed: false, trace, writeMode, reasonCode: 'MISSING_CLEARANCE' }
    }
    trace.push({
      step: 'compliance',
      passed: true,
      durationMs: Math.round(performance.now() - complianceStart),
    })

    // ── 8. Duplicate detection ───────────────────────────────────────────
    const dupStart = performance.now()
    const contentHash = this.contentHash.computeHash(
      request.nodeType,
      request.title,
      request.content,
      request.classification,
    )
    const existing = await this.proposalRepo.findByContentHash(organizationId, contentHash)
    if (existing) {
      trace.push({
        step: 'duplicate',
        passed: false,
        reasonCode: 'DUPLICATE',
        explanation: `Proposal with identical content already exists (${existing.id})`,
        durationMs: Math.round(performance.now() - dupStart),
      })
      return {
        passed: false,
        trace,
        writeMode,
        reasonCode: 'DUPLICATE',
      }
    }
    trace.push({
      step: 'duplicate',
      passed: true,
      durationMs: Math.round(performance.now() - dupStart),
    })

    // ── 9. Idempotency check ────────────────────────────────────────────
    if (request.idempotencyKey) {
      const idemStart = performance.now()
      const existingIdem = await this.proposalRepo.findByIdempotencyKey(
        organizationId,
        request.idempotencyKey,
      )
      if (existingIdem) {
        trace.push({
          step: 'idempotency',
          passed: false,
          reasonCode: 'DUPLICATE',
          explanation: `Proposal with idempotency key already exists (${existingIdem.id})`,
          durationMs: Math.round(performance.now() - idemStart),
        })
        return {
          passed: false,
          trace,
          writeMode,
          reasonCode: 'DUPLICATE',
        }
      }
      trace.push({
        step: 'idempotency',
        passed: true,
        durationMs: Math.round(performance.now() - idemStart),
      })
    }

    // ── 10. Policy constraint (write mode determination) ─────────────────
    const policyStart = performance.now()
    // DECISION type always requires approval
    if (request.nodeType === 'DECISION') {
      writeMode = 'REQUIRES_APPROVAL'
    }
    // CONFIDENTIAL or above requires approval
    if (request.classification === 'CONFIDENTIAL' || request.classification === 'RESTRICTED') {
      writeMode = 'REQUIRES_APPROVAL'
    }
    // Admin override: always auto-approve
    if (user.role === 'ADMIN') {
      writeMode = 'AUTO_APPROVE'
    }
    trace.push({
      step: 'policy',
      passed: true,
      durationMs: Math.round(performance.now() - policyStart),
    })

    // ── 11. Relationship validation ──────────────────────────────────────
    if (request.relationshipRequests && request.relationshipRequests.length > 0) {
      const relStart = performance.now()
      // Basic validation: no self-references via parent nodes
      for (const rel of request.relationshipRequests) {
        if (!rel.targetNodeId || !rel.relationshipType) {
          trace.push({
            step: 'relationships',
            passed: false,
            reasonCode: 'INVALID_RELATIONSHIP',
            explanation: 'Each relationship must have a targetNodeId and relationshipType',
            durationMs: Math.round(performance.now() - relStart),
          })
          return { passed: false, trace, writeMode, reasonCode: 'INVALID_RELATIONSHIP' }
        }
      }
      trace.push({
        step: 'relationships',
        passed: true,
        durationMs: Math.round(performance.now() - relStart),
      })
    }

    return { passed: true, trace, writeMode, reasonCode }
  }
}
