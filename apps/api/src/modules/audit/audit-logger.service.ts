import { Inject, Injectable } from '@nestjs/common'
import {
  AUDIT_LOGGER,
  type IAuditLogger,
  type AuditLogEntry,
} from '../../common/interfaces/audit-logger.interface'
import { IAuditLogRepository } from './audit.repository'
import { getCorrelationId } from '../../common/context/request-context'

/* Default IAuditLogger binding: persists entries through the append-only */
@Injectable()
export class AuditLoggerService implements IAuditLogger {
  constructor(@Inject(IAuditLogRepository) private readonly repository: IAuditLogRepository) {}

  async record(entry: AuditLogEntry): Promise<void> {
    const correlationId = getCorrelationId()
    await this.repository.record({
      ...entry,
      metadata: { ...entry.metadata, correlationId },
    })
  }
}

export { AUDIT_LOGGER }
