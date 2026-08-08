import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'
import { HealthService } from './health.service'
import { HealthStatusDto } from './health.dto'

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

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (checks DB connectivity)' })
  readiness() {
    return this.healthService.readiness()
  }
}
