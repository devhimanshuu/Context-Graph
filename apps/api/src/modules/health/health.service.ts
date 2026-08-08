import { Injectable } from '@nestjs/common'
import { HealthCheckService, PrismaHealthIndicator, type HealthCheckResult } from '@nestjs/terminus'
import { PrismaService } from '../../database/prisma.service'
import { type HealthStatusDto } from './health.dto'

/* Probes: - liveness: process is up (always ok) — used to restart dead instances. */
@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  liveness(): HealthStatusDto {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }
  }

  readiness(): Promise<HealthCheckResult> {
    return this.health.check([() => this.db.pingCheck('database', this.prisma)])
  }
}
