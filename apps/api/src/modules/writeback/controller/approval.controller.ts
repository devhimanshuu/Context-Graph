/* Approval Controller — REST endpoints for proposal approval workflow.

GET    /api/v1/proposals/approvals           — List approval requests
GET    /api/v1/proposals/approvals/overview   — Approval overview counts
GET    /api/v1/proposals/approvals/:id        — Get approval detail
POST   /api/v1/proposals/approvals/:id/resolve — Approve or reject

Every endpoint requires authentication. Only admins/HODs can resolve. */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { z } from 'zod'
import { ApprovalService } from '../services/approval.service'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const resolveApprovalSchema = z.object({
  resolution: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().max(1000).optional(),
})

const approvalIdSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid UUID'),
})

type ResolveApprovalInput = z.infer<typeof resolveApprovalSchema>

@ApiTags('Proposal Approvals')
@ApiBearerAuth()
@Controller('api/v1/proposals/approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get approval overview counts',
    description: 'Returns pending, approved, and rejected counts for the current organization.',
  })
  @ApiResponse({ status: 200, description: 'Overview counts' })
  async getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalService.getApprovalOverview(user)
  }

  @Get()
  @ApiOperation({
    summary: 'List approval requests',
    description:
      'Returns approval requests for the current organization, optionally filtered by status.',
  })
  @ApiResponse({ status: 200, description: 'List of approval requests' })
  async listApprovals(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string) {
    return this.approvalService.listApprovals(user, status)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get approval request detail',
    description: 'Returns the full approval request including proposal content and metadata.',
  })
  @ApiResponse({ status: 200, description: 'Approval request detail' })
  @ApiResponse({ status: 404, description: 'Approval request not found' })
  async getApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(approvalIdSchema)) params: { id: string },
  ) {
    const approvals = await this.approvalService.listApprovals(user)
    const approval = approvals.find((a) => a.id === params.id)
    if (!approval) {
      throw new Error('Approval request not found')
    }
    return approval
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or reject a proposal',
    description:
      'Resolves an approval request. On approval, the knowledge node is published ' +
      'and graph relationships are persisted. Only admins and HODs can resolve.',
  })
  @ApiResponse({ status: 200, description: 'Approval resolved' })
  @ApiResponse({ status: 403, description: 'Insufficient permission' })
  @ApiResponse({ status: 404, description: 'Approval request not found' })
  async resolveApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(approvalIdSchema)) params: { id: string },
    @Body(new ZodValidationPipe(resolveApprovalSchema)) body: ResolveApprovalInput,
  ) {
    return this.approvalService.resolveApproval(user, params.id, body.resolution, body.note)
  }
}
