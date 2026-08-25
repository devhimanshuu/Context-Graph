/* Guardrails module — wires the action guardrail engine into the NestJS application.

The module registers:
  - Action Registry (12 built-in actions)
  - 14 deterministic guardrails
  - Guardrail Engine (composable evaluation)
  - Constraint Engine (declarative policy conditions)
  - Action Guardrail Service (main application service)
  - Repositories (constraints, resource resolver, budget checker)
  - Audit Logger
  - Controller (REST endpoints)

Architecture: the guardrails module is a consumer of existing authorization
infrastructure, NOT a replacement for it. The Permission Engine remains
the source of truth for authorization decisions. */

import { Module } from '@nestjs/common'
import { ActionRegistry } from './registry/action-registry'
import { GuardrailEngine } from './engine/guardrail-engine'
import { ConstraintEngine } from './engine/constraint-engine'
import { ActionGuardrailService } from './services/action-guardrail.service'
import { GuardrailsController } from './controller/guardrails.controller'
import { InMemoryConstraintRepository } from './repository/constraint.repository'
import { InMemoryResourceResolver } from './repository/resource-resolver'
import { InMemoryBudgetChecker } from './repository/budget-checker'
import { InMemoryActionAuditLogger } from './audit/action-audit-logger'
import {
  IActionRegistry,
  IGuardrailEngine,
  IConstraintEngine,
  IConstraintRepository,
  IResourceResolver,
  IBudgetChecker,
  IActionAuditLogger,
} from './domain/guardrails.interfaces'
import { AuthenticationGuardrail } from './guardrails/authentication.guardrail'
import { CapabilityGuardrail } from './guardrails/capability.guardrail'
import { OrganizationGuardrail } from './guardrails/organization.guardrail'
import { ResourceExistenceGuardrail } from './guardrails/resource-existence.guardrail'
import { ResourceScopeGuardrail } from './guardrails/resource-scope.guardrail'
import { PermissionLevelGuardrail } from './guardrails/permission-level.guardrail'
import { ComplianceGuardrail } from './guardrails/compliance.guardrail'
import { ClassificationGuardrail } from './guardrails/classification.guardrail'
import { ResourceStateGuardrail } from './guardrails/resource-state.guardrail'
import { RiskGuardrail } from './guardrails/risk.guardrail'
import { PolicyConstraintGuardrail } from './guardrails/policy-constraint.guardrail'
import { ApprovalGuardrail } from './guardrails/approval.guardrail'
import { TimeRestrictionGuardrail } from './guardrails/time-restriction.guardrail'
import { BudgetGuardrail } from './guardrails/budget.guardrail'
import { AuthorizationModule } from '../authorization/authorization.module'

/** Helper to create the guardrail engine with all guardrails registered. */
function createGuardrailEngine(
  constraintRepo: IConstraintRepository,
  constraintEngine: IConstraintEngine,
  budgetChecker: IBudgetChecker,
): GuardrailEngine {
  const engine = new GuardrailEngine()

  // Register guardrails in priority order.
  engine.registerGuardrail(new AuthenticationGuardrail())
  engine.registerGuardrail(new CapabilityGuardrail())
  engine.registerGuardrail(new OrganizationGuardrail())
  engine.registerGuardrail(new ResourceExistenceGuardrail())
  engine.registerGuardrail(new ResourceScopeGuardrail())
  engine.registerGuardrail(new PermissionLevelGuardrail())
  engine.registerGuardrail(new ComplianceGuardrail())
  engine.registerGuardrail(new ClassificationGuardrail())
  engine.registerGuardrail(new ResourceStateGuardrail())
  engine.registerGuardrail(new RiskGuardrail())
  engine.registerGuardrail(new PolicyConstraintGuardrail(constraintRepo, constraintEngine))
  engine.registerGuardrail(new ApprovalGuardrail())
  engine.registerGuardrail(new TimeRestrictionGuardrail())
  engine.registerGuardrail(new BudgetGuardrail(budgetChecker))

  return engine
}

@Module({
  imports: [AuthorizationModule],
  controllers: [GuardrailsController],
  providers: [
    // DI tokens → implementations
    { provide: IActionRegistry, useClass: ActionRegistry },
    { provide: IConstraintEngine, useClass: ConstraintEngine },
    { provide: IConstraintRepository, useClass: InMemoryConstraintRepository },
    { provide: IResourceResolver, useClass: InMemoryResourceResolver },
    { provide: IBudgetChecker, useClass: InMemoryBudgetChecker },
    { provide: IActionAuditLogger, useClass: InMemoryActionAuditLogger },

    // Guardrails
    AuthenticationGuardrail,
    CapabilityGuardrail,
    OrganizationGuardrail,
    ResourceExistenceGuardrail,
    ResourceScopeGuardrail,
    PermissionLevelGuardrail,
    ComplianceGuardrail,
    ClassificationGuardrail,
    ResourceStateGuardrail,
    RiskGuardrail,
    PolicyConstraintGuardrail,
    ApprovalGuardrail,
    TimeRestrictionGuardrail,
    BudgetGuardrail,

    // Engine (factory to inject guardrails)
    {
      provide: IGuardrailEngine,
      useFactory: (
        constraintRepo: IConstraintRepository,
        constraintEngine: IConstraintEngine,
        budgetChecker: IBudgetChecker,
      ) => createGuardrailEngine(constraintRepo, constraintEngine, budgetChecker),
      inject: [IConstraintRepository, IConstraintEngine, IBudgetChecker],
    },

    // Main service
    ActionGuardrailService,
  ],
  exports: [IActionRegistry, IGuardrailEngine, IActionAuditLogger, ActionGuardrailService],
})
export class GuardrailsModule {}
