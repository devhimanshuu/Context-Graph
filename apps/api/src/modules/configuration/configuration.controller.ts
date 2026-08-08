import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Role } from '@contextgraph/types'
import { Roles } from '../../common/decorators/roles.decorator'
import { IConfigurationService } from './configuration.service'

const ENGINE_NAMES = [
  'pipeline',
  'traversal',
  'rule-engine',
  'permission',
  'cache',
  'metrics',
] as const
type EngineName = (typeof ENGINE_NAMES)[number]

@ApiBearerAuth()
@ApiTags('Configuration')
@Controller('configuration')
export class ConfigurationController {
  constructor(@Inject(IConfigurationService) private readonly service: IConfigurationService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'All engine configurations (ADMIN only)' })
  all() {
    return this.service.all()
  }

  @Get(':engine')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Configuration for one engine (ADMIN only)' })
  @ApiOkResponse({ description: 'Engine configuration object' })
  one(@Param('engine') engine: string) {
    if (!ENGINE_NAMES.includes(engine as EngineName)) {
      return { engine, available: ENGINE_NAMES }
    }
    switch (engine as EngineName) {
      case 'pipeline':
        return this.service.getPipelineConfig()
      case 'traversal':
        return this.service.getTraversalConfig()
      case 'rule-engine':
        return this.service.getRuleEngineConfig()
      case 'permission':
        return this.service.getPermissionConfig()
      case 'cache':
        return this.service.getCacheConfig()
      case 'metrics':
        return this.service.getMetricsConfig()
    }
  }
}
