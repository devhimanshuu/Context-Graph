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
import { RuleEngineModule } from './modules/rule-engine/rule-engine.module'
import { RulesModule } from './modules/rules/rules.module'
import { PipelineModule } from './modules/pipeline/pipeline.module'
import { CandidateModule } from './modules/candidate/candidate.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { AuditModule } from './modules/audit/audit.module'
import { ConfigurationModule } from './modules/configuration/configuration.module'
import { HealthModule } from './modules/health/health.module'
import { DemoModule } from './modules/demo/demo.module'
import { IngestionModule } from './modules/ingestion/ingestion.module'
import { EvaluationModule } from './modules/evaluation/evaluation.module'
import { AgentModule } from './modules/agent/agent.module'
import { WorkflowModule } from './modules/workflow/workflow.module'
import { GovernanceModule } from './modules/governance/governance.module'
import { McpModule } from './modules/mcp/mcp.module'
import { GuardrailsModule } from './modules/guardrails/guardrails.module'
import { WriteBackModule } from './modules/writeback/writeback.module'
import { EventsModule } from './modules/events/events.module'
import { AgentIdentityModule } from './modules/agent-identity/agent-identity.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { AuthorizationGuard } from './common/guards/authorization.guard'
import { OrganizationGuard } from './common/guards/organization.guard'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { ExecutionTimeInterceptor } from './common/interceptors/execution-time.interceptor'
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from './config/config.service'

/* Root module of the modular monolith. Global (APP_*) providers enforce cross-cutting concerns on every route: */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.redisUrl)
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port, 10) || 6379,
            username: url.username || undefined,
            password: url.password || undefined,
          },
        }
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DepartmentsModule,
    KnowledgeModule,
    GraphModule,
    PermissionsModule,
    AuthorizationModule,
    RuleEngineModule,
    RulesModule,
    PipelineModule,
    CandidateModule,
    AnalyticsModule,
    AuditModule,
    ConfigurationModule,
    HealthModule,
    DemoModule,
    IngestionModule,
    EvaluationModule,
    AgentModule,
    WorkflowModule,
    GovernanceModule,
    McpModule,
    GuardrailsModule,
    WriteBackModule,
    EventsModule,
    AgentIdentityModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
    { provide: APP_GUARD, useClass: OrganizationGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ExecutionTimeInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
