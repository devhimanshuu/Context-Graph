import { Module } from '@nestjs/common'
import { IRulesRepository, RulesPrismaRepository } from './rule.repository'
import { IRulesService, RulesService } from './rule.service'
import { RulesController } from './rule.controller'

/* Rules module — deterministic context rules (condition → action). The rule */
@Module({
  controllers: [RulesController],
  providers: [
    { provide: IRulesRepository, useClass: RulesPrismaRepository },
    { provide: IRulesService, useClass: RulesService },
  ],
  exports: [IRulesService, IRulesRepository],
})
export class RulesModule {}
