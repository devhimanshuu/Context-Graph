/**
 * Use-case contracts — import from `@/application/use-cases`.
 *
 * Each module declares the use-case interface, its input/output DTOs, the
 * service contracts it depends on, and its factory contract. No use case is
 * implemented in this phase; factories are registered in the DI container as
 * implementations land.
 */
export type { UseCase, UseCaseFactory } from './base'
export type {
  IRunPipelineUseCase,
  RunPipelineUseCaseInput,
  RunPipelineUseCaseOutput,
  RunPipelineUseCaseDependencies,
  RunPipelineUseCaseFactory,
} from './run-pipeline.use-case'
export type {
  IGetCandidateSetUseCase,
  GetCandidateSetUseCaseInput,
  GetCandidateSetUseCaseOutput,
  GetCandidateSetUseCaseDependencies,
  GetCandidateSetUseCaseFactory,
} from './get-candidate-set.use-case'
export type {
  IResolveEntryNodeUseCase,
  ResolveEntryNodeUseCaseInput,
  ResolveEntryNodeUseCaseOutput,
  ResolveEntryNodeUseCaseDependencies,
  ResolveEntryNodeUseCaseFactory,
} from './resolve-entry-node.use-case'
export type {
  ICompilePermissionUseCase,
  CompilePermissionUseCaseInput,
  CompilePermissionUseCaseOutput,
  CompilePermissionUseCaseDependencies,
  CompilePermissionUseCaseFactory,
} from './compile-permission.use-case'
export type {
  ITraverseGraphUseCase,
  TraverseGraphUseCaseInput,
  TraverseGraphUseCaseOutput,
  TraverseGraphUseCaseDependencies,
  TraverseGraphUseCaseFactory,
} from './traverse-graph.use-case'
export type {
  IFilterKnowledgeNodesUseCase,
  FilterKnowledgeNodesUseCaseInput,
  FilterKnowledgeNodesUseCaseOutput,
  FilterKnowledgeNodesUseCaseDependencies,
  FilterKnowledgeNodesUseCaseFactory,
} from './filter-knowledge-nodes.use-case'
export type {
  IBuildCandidateSetUseCase,
  BuildCandidateSetUseCaseInput,
  BuildCandidateSetUseCaseOutput,
  BuildCandidateSetUseCaseDependencies,
  BuildCandidateSetUseCaseFactory,
} from './build-candidate-set.use-case'
export type {
  IGetPipelineMetricsUseCase,
  GetPipelineMetricsUseCaseInput,
  GetPipelineMetricsUseCaseOutput,
  GetPipelineMetricsUseCaseDependencies,
  GetPipelineMetricsUseCaseFactory,
} from './get-pipeline-metrics.use-case'
