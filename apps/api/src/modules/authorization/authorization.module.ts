import { Module } from '@nestjs/common'
import { AuditModule } from '../audit/audit.module'
import {
  IAuthorizationDataRepository,
  PrismaAuthorizationDataRepository,
} from './repositories/authorization-data.repository'
import { IAuthorizationCompiler, PermissionCompiler } from './compiler/permission-compiler'
import { IAuthorizationEvaluator, PermissionEvaluator } from './evaluator/permission-evaluator'
import { policyProviders } from './policies/policy-pipeline'
import { AUTHORIZATION_CACHE_PROVIDER } from './cache/in-memory-authorization-cache'
import {
  AUTHORIZATION_METRICS,
  InMemoryAuthorizationMetrics,
} from './metrics/authorization-metrics'
import {
  AUTHORIZATION_AUDIT_LOGGER,
  AuthorizationAuditLogger,
} from './audit/authorization-audit-logger'
import { IAuthorizationService, AuthorizationService } from './services/authorization.service'
import { AuthorizationController } from './authorization.controller'

/**
 * Authorization module — the ContextGraph permission engine.
 *
 * Dependency inversion: every dependency is an interface token bound to an
 * implementation here (data repository, compiler, evaluator, policies, cache,
 * metrics, audit). The engine never touches Prisma directly and never names a
 * concrete cache/metrics provider, so Redis caching, Prometheus export or an
 * event-driven invalidation bus can be added by replacing one binding.
 */
@Module({
  imports: [AuditModule],
  controllers: [AuthorizationController],
  providers: [
    { provide: IAuthorizationDataRepository, useClass: PrismaAuthorizationDataRepository },
    { provide: IAuthorizationCompiler, useClass: PermissionCompiler },
    { provide: IAuthorizationEvaluator, useClass: PermissionEvaluator },
    ...policyProviders,
    AUTHORIZATION_CACHE_PROVIDER,
    { provide: AUTHORIZATION_METRICS, useClass: InMemoryAuthorizationMetrics },
    { provide: AUTHORIZATION_AUDIT_LOGGER, useClass: AuthorizationAuditLogger },
    { provide: IAuthorizationService, useClass: AuthorizationService },
  ],
  exports: [
    IAuthorizationService,
    IAuthorizationEvaluator,
    IAuthorizationCompiler,
    IAuthorizationDataRepository,
    AUTHORIZATION_AUDIT_LOGGER,
  ],
})
export class AuthorizationModule {}
