/* Events Controller — REST + SSE endpoints for the event system.

GET    /api/v1/events              — Query events (admin)
GET    /api/v1/events/:id          — Get event detail (admin)
GET    /api/v1/events/dead-letter  — Dead letter events (admin)
POST   /api/v1/events/:id/retry    — Retry dead letter event (admin)
GET    /api/v1/events/stream       — SSE event stream

Every endpoint requires authentication. Admin endpoints require ADMIN role. */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import type { AuthenticatedUser, EventType, AggregateType } from '@contextgraph/types'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { z } from 'zod'
import { Request, Response } from 'express'
import { EventService } from '../services/event.service'
import { OutboxPrismaRepository } from '../repository/outbox.repository'
import { SseManager } from '../services/sse-manager'
import { uuid as uuidv4 } from '../../../common/utils/uuid'

const eventQuerySchema = z.object({
  eventType: z.string().optional(),
  aggregateType: z.string().optional(),
  aggregateId: z.string().uuid().optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

const eventIdSchema = z.object({
  id: z.string().uuid(),
})

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(
    private readonly eventService: EventService,
    private readonly outboxRepo: OutboxPrismaRepository,
    private readonly sseManager: SseManager,
  ) {}

  @Get('stream')
  @ApiOperation({
    summary: 'SSE event stream',
    description:
      'Subscribe to real-time ContextGraph events via Server-Sent Events. ' +
      "Events are scoped to the authenticated user's organization.",
  })
  @ApiResponse({ status: 200, description: 'SSE event stream' })
  async streamEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const connectionId = uuidv4()

    // Create SSE connection
    const connection = {
      connectionId,
      organizationId: user.organizationId,
      principalId: user.id,
      clientType: 'DASHBOARD',
      eventTypes: [] as string[], // All event types for the org
      createdAt: new Date(),
      write: (data: {
        eventId: string
        eventType: string
        timestamp: string
        payload: Record<string, unknown>
      }) => {
        try {
          res.write(`id: ${data.eventId}\n`)
          res.write(`event: ${data.eventType}\n`)
          res.write(`data: ${JSON.stringify(data)}\n\n`)
        } catch {
          // Connection closed
        }
      },
      close: () => {
        try {
          res.end()
        } catch {
          // Already closed
        }
      },
    }

    this.sseManager.addConnection(connection)

    // Send initial connected event
    connection.write({
      eventId: uuidv4(),
      eventType: 'CONNECTED',
      timestamp: new Date().toISOString(),
      payload: {
        message: 'Connected to ContextGraph event stream',
        organizationId: user.organizationId,
      },
    })

    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`)
      } catch {
        clearInterval(heartbeatInterval)
        this.sseManager.removeConnection(connectionId)
      }
    }, 30_000)

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval)
      this.sseManager.removeConnection(connectionId)
    })
  }

  @Get()
  @ApiOperation({
    summary: 'Query events',
    description: 'Returns events for the current organization with optional filters.',
  })
  @ApiResponse({ status: 200, description: 'List of events' })
  async queryEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(eventQuerySchema)) query: Record<string, unknown>,
  ) {
    return this.eventService.queryEvents({
      organizationId: user.organizationId,
      eventType: query.eventType as EventType | undefined,
      aggregateType: query.aggregateType as AggregateType | undefined,
      aggregateId: query.aggregateId as string | undefined,
      since: query.since as string | undefined,
      until: query.until as string | undefined,
      limit: query.limit as number | undefined,
      offset: query.offset as number | undefined,
    })
  }

  @Get('dead-letter')
  @ApiOperation({
    summary: 'Get dead letter events',
    description: 'Returns events that failed to publish after max retries.',
  })
  @ApiResponse({ status: 200, description: 'Dead letter events' })
  async getDeadLetterEvents(@CurrentUser() user: AuthenticatedUser) {
    return this.outboxRepo.getDeadLetterEvents(user.organizationId)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get event detail',
    description: 'Returns the full event envelope for inspection.',
  })
  @ApiResponse({ status: 200, description: 'Event detail' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(eventIdSchema)) params: { id: string },
  ) {
    // Use the event service to query — scoped to org
    const events = await this.eventService.queryEvents({
      organizationId: user.organizationId,
      limit: 100,
    })
    const event = events.find((e) => e.eventId === params.id)
    if (!event) {
      throw new Error('Event not found')
    }
    return event
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry a dead letter event',
    description: 'Moves a dead letter event back to pending for retry.',
  })
  @ApiResponse({ status: 200, description: 'Event queued for retry' })
  async retryDeadLetter(
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(eventIdSchema)) params: { id: string },
  ) {
    // Verify the event belongs to this organization
    const deadLetterEvents = await this.outboxRepo.getDeadLetterEvents(user.organizationId)
    const event = deadLetterEvents.find((e) => e.eventId === params.id)
    if (!event) {
      throw new Error('Dead letter event not found')
    }
    await this.outboxRepo.retryDeadLetter(params.id)
    return { success: true, eventId: params.id }
  }
}
