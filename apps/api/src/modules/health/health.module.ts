import { Module } from '@nestjs/common'
import { HealthIndicatorService, PrismaHealthIndicator, TerminusModule } from '@nestjs/terminus'
import { HealthService } from './health.service'
import { HealthController } from './health.controller'

/* Health module — liveness (no dependencies) and readiness (DB ping) probes. */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      // Terminus v11: PrismaHealthIndicator is built on HealthIndicatorService.
      provide: PrismaHealthIndicator,
      useFactory: (healthIndicatorService: HealthIndicatorService) =>
        new PrismaHealthIndicator(healthIndicatorService),
      inject: [HealthIndicatorService],
    },
  ],
})
export class HealthModule {}
