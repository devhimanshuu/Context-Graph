import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { HEADERS } from '@contextgraph/shared'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  IContextPipelineOrchestrator,
  type ContextResolveOptions,
} from './orchestrator/context-pipeline-orchestrator'
import {
  contextPipelineRequestSchema,
  type ContextPipelineInput,
} from './validation/context-pipeline.validation'
import { ContextPackageDto } from './dto/context-package.dto'
import { parseIdempotencyKey } from './idempotency-key'

/**
 * Primary context API — the thin adapter over the Phase 7 orchestrator.
 * Holds no pipeline logic: it validates the request, extracts the trusted
 * principal + optional Idempotency-Key, and delegates. Authorization fields
 * (role, clearance, organization) are NEVER accepted from the body — they are
 * derived server-side from the JWT by the guards.
 */
@ApiBearerAuth()
@ApiTags('Context')
@Controller('context')
export class ContextController {
  constructor(
    @Inject(IContextPipelineOrchestrator)
    private readonly orchestrator: IContextPipelineOrchestrator,
  ) {}

  @Get('definition')
  @ApiOperation({ summary: 'Context pipeline definition: version + stage order' })
  definition() {
    return this.orchestrator.getDefinition()
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Resolve a context package — user + entry node → ranked, bounded, explainable candidates',
    description:
      'Sends the Idempotency-Key header to safely retry: a completed run under the same key is returned without re-execution.',
  })
  @ApiOkResponse({ type: ContextPackageDto })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Headers(HEADERS.IDEMPOTENCY_KEY) idempotencyKey: string | undefined,
    @Body(new ZodValidationPipe(contextPipelineRequestSchema)) body: ContextPipelineInput,
  ) {
    const options: ContextResolveOptions = { idempotencyKey: parseIdempotencyKey(idempotencyKey) }
    return this.orchestrator.resolve(user, body, options)
  }
}
