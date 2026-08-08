import { Global, Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { ConfigService } from '../config/config.service'
import { CACHE_PROVIDER } from './interfaces/cache-provider.interface'
import { LOGGER } from './interfaces/logger.interface'
import { PinoLoggerService } from './logger/pino-logger.service'
import { InMemoryCacheProvider } from './cache/in-memory-cache.provider'
import { RequestIdMiddleware } from './middleware/request-id.middleware'
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware'
import { LoggingMiddleware } from './middleware/logging.middleware'

/* Global common module. Owns the cross-cutting infrastructure every feature shares: */
@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.logLevel,
          // Correlate transport logs with the request context middleware.
          customProps: (req) => ({
            requestId: (req.headers['x-request-id'] as string | undefined) ?? undefined,
          }),
        },
      }),
    }),
  ],
  providers: [
    { provide: LOGGER, useClass: PinoLoggerService },
    { provide: CACHE_PROVIDER, useClass: InMemoryCacheProvider },
  ],
  exports: [LOGGER, CACHE_PROVIDER],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, CorrelationIdMiddleware, LoggingMiddleware).forRoutes('*')
  }
}
