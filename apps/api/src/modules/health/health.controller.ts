import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { SkipThrottle } from '@nestjs/throttler'
import { Public } from '../../common/decorators/public.decorator'
import { HealthService } from './health.service'
import { HealthStatusDto } from './health.dto'

/* Health probes are public and exempt from rate limiting — orchestrators poll
 * them on fixed intervals and must never be throttled into false negatives. */
@SkipThrottle()
@Public()
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe (always ok when the process is up)' })
  @ApiOkResponse({ type: HealthStatusDto })
  liveness(): HealthStatusDto {
    return this.healthService.liveness()
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe alias — the process is up' })
  @ApiOkResponse({ type: HealthStatusDto })
  live(): HealthStatusDto {
    return this.healthService.liveness()
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks DB connectivity)' })
  readiness() {
    return this.healthService.readiness()
  }
}
