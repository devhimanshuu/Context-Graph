import { Module } from '@nestjs/common'
import { IConfigurationService, ConfigurationService } from './configuration.service'
import { ConfigurationController } from './configuration.controller'

/* Configuration module — typed, env-driven engine configuration surfaced */
@Module({
  controllers: [ConfigurationController],
  providers: [{ provide: IConfigurationService, useClass: ConfigurationService }],
  exports: [IConfigurationService],
})
export class ConfigurationModule {}
