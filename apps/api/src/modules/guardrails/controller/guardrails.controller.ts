/* Guardrails controller — REST endpoints for action authorization checks.

POST /api/v1/guardrails/check-action   — Evaluate whether an action is allowed
GET  /api/v1/guardrails/actions        — List registered actions
GET  /api/v1/guardrails/decisions      — Query action audit records
GET  /api/v1/guardrails/overview       — Dashboard overview

This controller delegates to the same ActionGuardrailService used by MCP.
There is no separate business logic for REST vs MCP. */

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { AuthenticatedUser } from '@contextgraph/types'
import { ActionGuardrailService } from '../services/action-guardrail.service'
import { IActionRegistry } from '../domain/guardrails.interfaces'
import { IActionAuditLogger } from '../domain/guardrails.interfaces'
import {
  actionCheckSchema,
  guardrailQuerySchema,
  type ActionCheckInput,
  type GuardrailQueryInput,
} from '../schemas/guardrails.validation'

@ApiBearerAuth()
@ApiTags('Guardrails')
@Controller('guardrails')
export class GuardrailsController {
  constructor(
    private readonly guardrailService: ActionGuardrailService,
    private readonly actionRegistry: IActionRegistry,
    private readonly auditLogger: IActionAuditLogger,
  ) {}

  @Post('check-action')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Check whether an action is allowed',
    description:
      'Evaluates whether the authenticated principal can perform the requested action ' +
      'against the target resource using deterministic guardrails and policy controls.',
  })
  @ApiOkResponse({ description: 'Action decision with guardrail trace' })
  async checkAction(@Req() req: { user: AuthenticatedUser }, @Body() body: ActionCheckInput) {
    const validated = actionCheckSchema.parse(body)

    const result = await this.guardrailService.checkAction(
      req.user,
      {
        action: validated.action,
        targetType: validated.targetType,
        targetId: validated.targetId ?? null,
        parameters: validated.parameters,
        purpose: validated.purpose ?? null,
      },
      {
        requestId: `rest-${Date.now()}`,
      },
    )

    return {
      decision: result.decision,
      auditRecordId: result.auditRecordId,
    }
  }

  @Get('actions')
  @ApiOperation({ summary: 'List registered actions' })
  async listActions() {
    return {
      actions: this.actionRegistry.getAll().map((a) => ({
        actionId: a.actionId,
        name: a.name,
        description: a.description,
        riskLevel: a.riskLevel,
        requiredCapabilities: a.requiredCapabilities,
        targetTypes: a.targetTypes,
        approvalRequired: a.approvalRequired,
      })),
    }
  }

  @Get('decisions')
  @ApiOperation({ summary: 'Query action audit records' })
  async getDecisions(@Req() req: { user: AuthenticatedUser }, @Query() query: GuardrailQueryInput) {
    const validated = guardrailQuerySchema.parse(query)

    const records = await this.auditLogger.findByOrganization(req.user.organizationId, {
      action: validated.action,
      decision: validated.decision,
      from: validated.from,
      to: validated.to,
      limit: validated.limit,
      offset: validated.offset,
    })

    return { records, total: records.length }
  }

  @Get('overview')
  @ApiOperation({ summary: 'Guardrail dashboard overview' })
  async getOverview(@Req() req: { user: AuthenticatedUser }) {
    return this.auditLogger.getOverview(req.user.organizationId)
  }
}
