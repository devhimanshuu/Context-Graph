/* WriteBack Controller — REST endpoints for governed agent write-back.

POST   /api/v1/knowledge/proposals       — Create a governed proposal
GET    /api/v1/knowledge/proposals       — List proposals (filterable)
GET    /api/v1/knowledge/proposals/:id   — Get proposal detail
GET    /api/v1/knowledge/proposals/overview — Overview metrics

Every endpoint requires authentication and authorization. */

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
import type {
  AuthenticatedUser,
  ProposalStatus,
  ProposalDecision,
  WritableNodeType,
} from '@contextgraph/types'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import {
  nodeProposalSchema,
  proposalQuerySchema,
  proposalIdSchema,
  type NodeProposalInput,
  type ProposalQueryInput,
  type ProposalIdInput,
} from '../schemas/writeback.validation'
import { WriteBackService } from '../services/writeback.service'

@ApiTags('Knowledge Proposals')
@ApiBearerAuth()
@Controller('knowledge/proposals')
@UseGuards(JwtAuthGuard)
export class WriteBackController {
  constructor(private readonly writeBackService: WriteBackService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a governed knowledge proposal',
    description:
      'Propose a new FACT or DECISION node. The proposal is validated against ' +
      "the agent's permissions, organization policies, compliance constraints, " +
      'and graph rules before it can become active knowledge.',
  })
  @ApiResponse({ status: 201, description: 'Proposal created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permission' })
  async createProposal(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(nodeProposalSchema)) body: NodeProposalInput,
  ) {
    return this.writeBackService.propose(user, {
      ...body,
      purpose: body.purpose ?? undefined,
      idempotencyKey: body.idempotencyKey ?? undefined,
    })
  }

  @Get('overview')
  @ApiOperation({
    summary: 'Get proposal overview metrics',
    description: 'Returns counts of proposals by status for the current organization.',
  })
  @ApiResponse({ status: 200, description: 'Overview metrics' })
  async getOverview(@CurrentUser() user: AuthenticatedUser) {
    return this.writeBackService.getOverview(user)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get proposal detail',
    description: 'Returns the full proposal including validation trace and relationships.',
  })
  @ApiResponse({ status: 200, description: 'Proposal detail' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async getProposal(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(proposalIdSchema)) params: ProposalIdInput,
  ) {
    return this.writeBackService.getProposal(user, params.id)
  }

  @Get()
  @ApiOperation({
    summary: 'List proposals',
    description: 'Returns proposals for the current organization with optional filters.',
  })
  @ApiResponse({ status: 200, description: 'List of proposals' })
  async listProposals(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(proposalQuerySchema)) query: ProposalQueryInput,
  ) {
    return this.writeBackService.listProposals(user, {
      organizationId: user.organizationId,
      workspaceId: query.workspaceId,
      status: query.status as ProposalStatus | undefined,
      decision: query.decision as ProposalDecision | undefined,
      nodeType: query.nodeType as WritableNodeType | undefined,
      limit: query.limit,
      offset: query.offset,
    })
  }
}
