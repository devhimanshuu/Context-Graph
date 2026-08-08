import { Global, Module } from '@nestjs/common'
import { ConfigService } from './config.service'

/* Global configuration module. `ConfigService` is available anywhere without importing this module, so */
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
