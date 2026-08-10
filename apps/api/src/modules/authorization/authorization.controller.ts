import { Body, Controller, Get, Inject, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PermissionAction, type AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { IAuthorizationService } from './services/authorization.service'
import {
  AuthorizationContextDto,
  AuthorizationDecisionDto,
  ResourceEvaluationInputDto,
  contextToDto,
} from './authorization.dto'
import { evaluateResourceSchema, type EvaluateResourceInput } from './authorization.validation'
import { ResourceVisibility, type ResourceAuthorizationContext } from './domain/resource-context'

@ApiBearerAuth()
@ApiTags('Authorization')
@Controller('authorization')
export class AuthorizationController {
  constructor(@Inject(IAuthorizationService) private readonly service: IAuthorizationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Compile and return the caller authorization context' })
  @ApiOkResponse({ type: AuthorizationContextDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthorizationContextDto> {
    const context = await this.service.getContext(user)
    return contextToDto(context)
  }

  @Post('evaluate')
  @ApiOperation({
    summary: 'Evaluate the caller against a resource context (debug/audit aid)',
    description:
      'Returns the full authorization decision, including the failing policy. Batch pipeline evaluation should use the evaluator directly.',
  })
  @ApiOkResponse({ type: AuthorizationDecisionDto })
  @ApiBody({ type: ResourceEvaluationInputDto })
  async evaluate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(evaluateResourceSchema)) input: EvaluateResourceInput,
  ): Promise<AuthorizationDecisionDto> {
    const resource = toResourceContext(input, user.organizationId)
    const decision = await this.service.evaluateResource(
      user,
      resource,
      input.action ?? PermissionAction.READ,
    )
    return {
      allowed: decision.allowed,
      reason: decision.reason,
      failedPolicy: decision.failedPolicy,
      evaluatedPolicies: [...decision.evaluatedPolicies],
      verdicts: decision.verdicts.map((v) => ({
        policy: v.policy,
        outcome: v.outcome,
        reason: v.reason,
      })),
    }
  }
}

/** Maps validated input into the domain resource context (org defaults to caller). */
function toResourceContext(
  input: EvaluateResourceInput,
  callerOrganizationId: string,
): ResourceAuthorizationContext {
  return {
    id: input.id,
    resourceType: input.resourceType,
    organizationId: input.organizationId ?? callerOrganizationId,
    workspaceId: input.workspaceId ?? null,
    departmentId: input.departmentId ?? null,
    ownerId: input.ownerId ?? null,
    requiredPermissionLevel: input.requiredPermissionLevel ?? null,
    complianceTags: input.complianceTags ?? [],
    visibility: input.visibility as ResourceVisibility,
    status: input.status ?? null,
    attributes: input.attributes ?? {},
  }
}
