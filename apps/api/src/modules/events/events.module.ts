/* Event Module — NestJS module for the event-driven layer.

Registers:
  - Event store (in-memory + outbox-backed)
  - Outbox repository (Prisma)
  - SSE manager
  - Event service (main application service)
  - Outbox publisher (BullMQ worker)
  - Controller (REST + SSE endpoints)

Does NOT contain business logic — it provides DI wiring. */

import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { EventsController } from './controller/events.controller'
import { EventService } from './services/event.service'
import { SseManager } from './services/sse-manager'
import { InMemoryEventStore } from './repository/event-store'
import { OutboxPrismaRepository } from './repository/outbox.repository'
import {
  IEventStore,
  IOutboxRepository,
  ISseManager,
  IEventService,
} from './domain/events.interfaces'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'event-outbox',
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    }),
  ],
  controllers: [EventsController],
  providers: [
    // Store
    { provide: IEventStore, useClass: InMemoryEventStore },

    // Outbox
    OutboxPrismaRepository,
    { provide: IOutboxRepository, useExisting: OutboxPrismaRepository },

    // SSE
    SseManager,
    { provide: ISseManager, useExisting: SseManager },

    // Service
    { provide: IEventService, useClass: EventService },
    EventService,
  ],
  exports: [IEventService, EventService, ISseManager, IOutboxRepository, IEventStore],
})
export class EventsModule {}
