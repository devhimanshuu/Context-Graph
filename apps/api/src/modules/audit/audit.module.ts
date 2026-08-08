import { Module } from '@nestjs/common'
import { AUDIT_LOGGER } from '../../common/interfaces/audit-logger.interface'
import { IAuditLogRepository, AuditLogPrismaRepository } from './audit.repository'
import { AuditLoggerService } from './audit-logger.service'
import { IAuditService, AuditService } from './audit.service'
import { AuditController } from './audit.controller'

/* Audit module — append-only event log. Also binds the global IAuditLogger so any feature can record audit events */
@Module({
  controllers: [AuditController],
  providers: [
    { provide: IAuditLogRepository, useClass: AuditLogPrismaRepository },
    { provide: AUDIT_LOGGER, useClass: AuditLoggerService },
    { provide: IAuditService, useClass: AuditService },
  ],
  exports: [IAuditLogRepository, AUDIT_LOGGER, IAuditService],
})
export class AuditModule {}
