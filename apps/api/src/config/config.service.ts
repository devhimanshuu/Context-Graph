import { Injectable } from '@nestjs/common'
import { validateEnv, type AppConfig } from '@contextgraph/config'

/* The ONLY provider allowed to touch environment values. */
@Injectable()
export class ConfigService {
  private readonly config: AppConfig

  constructor() {
    this.config = {
      ...validateEnv(),
      dbQueryTimeoutMs: 5000,
    }
  }

  get host(): string {
    return this.config.HOST
  }

  get port(): number {
    return this.config.PORT
  }

  get nodeEnv(): string {
    return this.config.NODE_ENV
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production'
  }

  get logLevel(): string {
    return this.config.LOG_LEVEL
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL
  }

  get redisUrl(): string {
    return this.config.REDIS_URL ?? 'redis://localhost:6379'
  }

  get jwtAccessSecret(): string {
    return this.config.JWT_ACCESS_SECRET
  }

  get jwtAccessTtl(): string {
    return this.config.JWT_ACCESS_TTL
  }

  get corsOrigins(): string[] {
    return this.config.CORS_ORIGINS
  }

  get swaggerEnabled(): boolean {
    return this.config.SWAGGER_ENABLED
  }

  get otlpEndpoint(): string | undefined {
    return this.config.OTLP_ENDPOINT
  }
}
