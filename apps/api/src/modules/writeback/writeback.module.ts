/* WriteBack Module — NestJS module for governed agent write-back.

Registers:
  - Proposal repository (Prisma)
  - Write run repository (Prisma)
  - Content hash service
  - Proposal validator
  - Graph validator integration
  - Approval service
  - Audit logger
  - WriteBack service (main application service)
  - Controller (REST endpoints)

Does NOT contain business logic — it provides DI wiring. */

import { Module } from '@nestjs/common'
import { WriteBackController } from './controller/writeback.controller'
import { ApprovalController } from './controller/approval.controller'
import { WriteBackService } from './services/writeback.service'
import { ProposalValidator } from './services/proposal-validator'
import { ContentHashService } from './services/content-hash.service'
import { WriteBackGraphValidator } from './services/writeback-graph-validator'
import { ApprovalService } from './services/approval.service'
import { ProposalPrismaRepository } from './repository/proposal.repository'
import { WriteRunPrismaRepository } from './repository/write-run.repository'
import { ApprovalRequestPrismaRepository } from './repository/approval-request.repository'
import { WriteAuditLogger } from './audit/write-audit-logger'
import { IndexingTriggerService } from './services/indexing-trigger.service'
import {
  CacheInvalidationService,
  RETRIEVAL_CACHE_INVALIDATOR,
  RULE_CACHE_INVALIDATOR,
} from './services/cache-invalidation.service'
import {
  IProposalRepository,
  IWriteRunRepository,
  IApprovalRequestRepository,
  IApprovalService,
  IWriteAuditLogger,
  IWriteBackGraphValidator,
  IWriteBackService,
} from './domain/writeback.interfaces'
import { GraphModule } from '../graph/graph.module'
import { AuthorizationModule } from '../authorization/authorization.module'
import { RetrievalModule } from '../retrieval/retrieval.module'

@Module({
  imports: [GraphModule, AuthorizationModule, RetrievalModule],
  controllers: [WriteBackController, ApprovalController],
  providers: [
    // Repositories
    { provide: IProposalRepository, useClass: ProposalPrismaRepository },
    { provide: IWriteRunRepository, useClass: WriteRunPrismaRepository },
    { provide: IApprovalRequestRepository, useClass: ApprovalRequestPrismaRepository },

    // Services
    ContentHashService,
    ProposalValidator,
    { provide: IWriteBackGraphValidator, useClass: WriteBackGraphValidator },
    { provide: IApprovalService, useClass: ApprovalService },
    { provide: IWriteAuditLogger, useClass: WriteAuditLogger },
    { provide: IWriteBackService, useClass: WriteBackService },
    WriteBackService,
    IndexingTriggerService,
    CacheInvalidationService,
    // Optional cache invalidators — injected as null when not available
    { provide: RETRIEVAL_CACHE_INVALIDATOR, useValue: null },
    { provide: RULE_CACHE_INVALIDATOR, useValue: null },
  ],
  exports: [IWriteBackService, WriteBackService, IApprovalService, ApprovalService],
})
export class WriteBackModule {}
