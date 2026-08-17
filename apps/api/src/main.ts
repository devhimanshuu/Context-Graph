import 'dotenv/config'
import 'reflect-metadata'
import compression from 'compression'
import helmet from 'helmet'
import { VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino'
import type { NestExpressApplication } from '@nestjs/platform-express'
import {
  API_DEFAULT_VERSION,
  API_GLOBAL_PREFIX,
  APP_DESCRIPTION,
  APP_NAME,
  APP_VERSION,
  SWAGGER_PATH,
} from '@contextgraph/shared'
import { AppModule } from './app.module'
import { ConfigService } from './config/config.service'

/* Application bootstrap. Layer order matters: */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })
  app.useLogger(app.get(Logger))

  const config = app.get(ConfigService)

  app.use(helmet())
  app.use(compression())
  app.enableCors({ origin: config.corsOrigins, credentials: true })

  // Request-size protection: reject oversized JSON payloads before any handler runs.
  app.useBodyParser('json', { limit: '256kb' })

  app.setGlobalPrefix(API_GLOBAL_PREFIX)
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION })

  // Response/exception wrapping is registered via APP_* providers in AppModule (single registration,
  // testable). Only nestjs-pino's error interceptor is added here since it binds to the pino transport.
  app.useGlobalInterceptors(new LoggerErrorInterceptor())

  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(APP_NAME)
      .setDescription(APP_DESCRIPTION)
      .setVersion(APP_VERSION)
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup(SWAGGER_PATH, app, document)
  }

  await app.listen(config.port, config.host)
  app
    .get(Logger)
    .log(
      `${APP_NAME} API listening on http://${config.host}:${config.port}/${API_GLOBAL_PREFIX}/v${API_DEFAULT_VERSION}`,
      'Bootstrap',
    )
}

void bootstrap()
