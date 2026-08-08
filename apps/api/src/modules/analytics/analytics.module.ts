import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import { IAnalyticsService, AnalyticsService } from './analytics.service'
import { AnalyticsController } from './analytics.controller'

/* Analytics module — read-side summaries over audit/usage data (CQRS-ready: */
@Module({
  imports: [AuditModule],
  controllers: [AnalyticsController],
  providers: [{ provide: IAnalyticsService, useClass: AnalyticsService }],
  exports: [IAnalyticsService],
})
export class AnalyticsModule {}
