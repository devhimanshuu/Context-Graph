/* Outbox Publisher — BullMQ worker for reliable event delivery.

Processes pending outbox events and delivers them to SSE subscribers.
Uses the existing BullMQ infrastructure with retry and backoff.

Architecture:
  PostgreSQL Outbox → BullMQ Queue → OutboxPublisher → SSE Manager → Subscribers

The publisher is idempotent: event IDs are stable, and duplicate delivery
is handled by consumers. */

import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { IEventService } from '../domain/events.interfaces'

@Processor('event-outbox', {
  concurrency: 1,
  limiter: {
    max: 50,
    duration: 1000,
  },
})
export class OutboxPublisher extends WorkerHost {
  private readonly logger = new Logger(OutboxPublisher.name)

  constructor(@Inject(IEventService) private readonly eventService: IEventService) {
    super()
  }

  async process(): Promise<void> {
    try {
      const result = await this.eventService.processOutbox()

      if (result.published > 0 || result.failed > 0) {
        this.logger.debug('Outbox batch processed', {
          published: result.published,
          failed: result.failed,
        })
      }
    } catch (error) {
      this.logger.error('Outbox processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}
