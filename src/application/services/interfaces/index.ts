/**
 * Application service interfaces — import from `@/application/services/interfaces`.
 *
 * These are the replaceable contracts of the application layer. Implementations
 * land per feature (Phase 4+) and are bound in the DI container; application
 * code never imports a concrete implementation.
 */
export type { IPermissionCompiler, CompilePermissionInput } from './i-permission-compiler'
export type { IGraphTraversalService, TraversalInput } from './i-graph-traversal-service'
export type { IRuleEngine, EvaluateRuleInput, RuleEvaluation } from './i-rule-engine'
export type { ICandidateAssembler, AssembleCandidatesInput } from './i-candidate-assembler'
export type {
  IEntryResolver,
  ResolveEntryNodesInput,
  ResolveEntryNodesOutput,
} from './i-entry-resolver'
export type { IZoneInjector, InjectZoneInput, InjectZoneOutput } from './i-zone-injector'
export type { IMetricsCollector } from './i-metrics-collector'
export type { INodeClassifier, ClassifyNodeOutput } from './i-node-classifier'
export type {
  IDerivabilityEvaluator,
  EvaluateDerivabilityInput,
  EvaluateDerivabilityOutput,
} from './i-derivability-evaluator'
export type { INodeFilter, NodeFilterKind, NodeFilterInput } from './i-node-filter'
