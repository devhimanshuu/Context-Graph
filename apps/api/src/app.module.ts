import { Module } from '@nestjs/common'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { CommonModule } from './common/common.module'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { OrganizationsModule } from './modules/organizations/organizations.module'
import { DepartmentsModule } from './modules/departments/departments.module'
import { KnowledgeModule } from './modules/knowledge/knowledge.module'
import { GraphModule } from './modules/graph/graph.module'
import { PermissionsModule } from './modules/permissions/permissions.module'
import { AuthorizationModule } from './modules/authorization/authorization.module'
import { RulesModule } from './modules/rules/rules.module'
import { PipelineModule } from './modules/pipeline/pipeline.module'
import { CandidateModule } from './modules/candidate/candidate.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { AuditModule } from './modules/audit/audit.module'
import { ConfigurationModule } from './modules/configuration/configuration.module'
import { HealthModule } from './modules/health/health.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { AuthorizationGuard } from './common/guards/authorization.guard'
import { OrganizationGuard } from './common/guards/organization.guard'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { ExecutionTimeInterceptor } from './common/interceptors/execution-time.interceptor'

/* Root module of the modular monolith. Global (APP_*) providers enforce cross-cutting concerns on every route: */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DepartmentsModule,
    KnowledgeModule,
    GraphModule,
    PermissionsModule,
    AuthorizationModule,
    RulesModule,
    PipelineModule,
    CandidateModule,
    AnalyticsModule,
    AuditModule,
    ConfigurationModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
    { provide: APP_GUARD, useClass: OrganizationGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ExecutionTimeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
