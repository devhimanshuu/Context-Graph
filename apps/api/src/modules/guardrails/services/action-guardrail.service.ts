/* Action guardrail service — the primary application service for action authorization.

The service orchestrates:
  1. Resolve the action definition
  2. Resolve the target resource
  3. Build the action context
  4. Evaluate all guardrails
  5. Record audit event
  6. Return the decision

This service is called by:
  - MCP check_action tool
  - REST check_action endpoint
  - Future SDK consumers

Architecture guarantee: this service NEVER executes the action itself.
It only evaluates whether the action is allowed. */

import { Inject, Injectable, Logger } from '@nestjs/common'
import type {
  ActionCheckRequest,
  ActionContext,
  ActionDecision,
  ActionAuditRecord,
  AuthenticatedUser,
  McpSession,
  TargetResourceContext,
} from '@contextgraph/types'
import { ActionDecisionType, EvaluationMode } from '@contextgraph/types'
import { uuid } from '../../../common/utils/uuid'
import {
  IActionRegistry,
  IGuardrailEngine,
  IResourceResolver,
  IActionAuditLogger,
} from '../domain/guardrails.interfaces'

/** Result of a check_action call — the decision plus the audit record ID. */
export interface CheckActionResult {
  readonly decision: ActionDecision
  readonly auditRecordId: string
}

@Injectable()
export class ActionGuardrailService {
  private readonly logger = new Logger(ActionGuardrailService.name)

  constructor(
    @Inject(IActionRegistry) private readonly actionRegistry: IActionRegistry,
    @Inject(IGuardrailEngine) private readonly engine: IGuardrailEngine,
    @Inject(IResourceResolver) private readonly resourceResolver: IResourceResolver,
    @Inject(IActionAuditLogger) private readonly auditLogger: IActionAuditLogger,
  ) {}

  /**
   * Check whether an authenticated principal is allowed to perform an action.
   *
   * This is the single entry point for all action authorization checks.
   * MCP, REST, and future SDK consumers all call this method.
   *
   * The method NEVER executes the action — it only evaluates permission.
   */
  async checkAction(
    user: AuthenticatedUser,
    request: ActionCheckRequest,
    options?: {
      sessionId?: string
      evaluationMode?: EvaluationMode
      policyVersion?: string
      requestId?: string
    },
  ): Promise<CheckActionResult> {
    const startTime = performance.now()
    const traceId = options?.requestId ?? uuid()

    // 1. Resolve the action definition.
    const actionDef = this.actionRegistry.get(request.action)
    if (actionDef === undefined) {
      // Unknown action — deny with ACTION_NOT_REGISTERED.
      const decision: ActionDecision = {
        decision: ActionDecisionType.DENY,
        allowed: false,
        action: request.action,
        targetType: request.targetType,
        targetId: request.targetId,
        riskLevel: 'LOW',
        reasonCode: 'ACTION_NOT_REGISTERED',
        explanation: `Action "${request.action}" is not registered in the action registry`,
        violatedPolicies: ['action_registry'],
        passedGuardrails: [],
        approvalRequired: false,
        approvalReason: null,
        policyVersion: options?.policyVersion ?? null,
        evaluatedAt: new Date().toISOString(),
        traceId,
        publicTrace: [],
        fullTrace: [],
      }

      await this.recordAudit(decision, user, request, options, startTime, traceId)
      return { decision, auditRecordId: traceId }
    }

    // 2. Resolve the target resource (if a target ID is provided).
    let targetResource: TargetResourceContext | null = null
    if (request.targetId !== null) {
      targetResource = await this.resourceResolver.resolve(
        user.organizationId,
        request.targetType,
        request.targetId,
      )
    }

    // 3. Build the action context.
    const context: ActionContext = {
      principalId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      permissionLevel: user.permissionLevel,
      complianceClearance: user.complianceClearance,
      action: actionDef,
      targetType: request.targetType,
      targetId: request.targetId,
      parameters: request.parameters,
      purpose: request.purpose,
      targetResource,
      evaluationMode: options?.evaluationMode ?? EvaluationMode.CURRENT,
      policyVersion: options?.policyVersion ?? null,
      timestamp: new Date().toISOString(),
    }

    // 4. Evaluate all guardrails.
    const decision = await this.engine.evaluate(context)

    // 5. Record audit event.
    await this.recordAudit(decision, user, request, options, startTime, traceId)

    this.logger.debug(
      `Action check: ${request.action} → ${decision.decision} (${decision.reasonCode ?? 'none'}) [${Math.round(performance.now() - startTime)}ms]`,
    )

    return { decision, auditRecordId: traceId }
  }

  /**
   * Build a check result from an MCP session (convenience for MCP tools).
   */
  async checkFromMcpSession(
    session: McpSession,
    request: ActionCheckRequest,
    requestId: string,
  ): Promise<CheckActionResult> {
    const user: AuthenticatedUser = {
      id: session.principalId,
      organizationId: session.organizationId,
      departmentId: null,
      email: 'mcp-agent@contextgraph.local',
      name: `MCP Agent (${session.sessionId.slice(0, 8)})`,
      role: 'VIEWER',
      permissionLevel: 'READ',
      complianceClearance: 'STANDARD',
    }

    return this.checkAction(user, request, {
      sessionId: session.sessionId,
      requestId,
    })
  }

  private async recordAudit(
    decision: ActionDecision,
    user: AuthenticatedUser,
    request: ActionCheckRequest,
    options: { sessionId?: string; requestId?: string } | undefined,
    startTime: number,
    traceId: string,
  ): Promise<void> {
    const record: ActionAuditRecord = {
      recordId: uuid(),
      principalId: user.id,
      organizationId: user.organizationId,
      sessionId: options?.sessionId ?? null,
      action: request.action,
      targetType: request.targetType,
      targetId: request.targetId,
      decision: decision.decision,
      riskLevel: decision.riskLevel,
      reasonCode: decision.reasonCode,
      policyVersion: decision.policyVersion,
      traceId,
      latencyMs: Math.round(performance.now() - startTime),
      requestId: options?.requestId ?? traceId,
      timestamp: new Date().toISOString(),
      metadata: {},
    }

    try {
      await this.auditLogger.recordDecision(record)
    } catch (error) {
      this.logger.error('Failed to record action audit event', { error, traceId })
    }
  }
}
