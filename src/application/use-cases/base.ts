/**
 * The common use-case contract.
 *
 * A use case is the application-layer entry point for one business action:
 * it takes a validated input DTO, orchestrates the required service
 * contracts, and returns an output DTO. Use cases are declared as type
 * aliases over this contract in this phase (e.g.
 * `IRunPipelineUseCase = UseCase<Input, Output>`); concrete classes land
 * with the feature implementations and are constructed by factory contracts
 * registered in the DI container.
 *
 * Naming: `IRunPipelineUseCase` (contract), `RunPipelineUseCase` (future
 * implementation), `RunPipelineUseCaseInput` / `RunPipelineUseCaseOutput`
 * (DTOs), `RunPipelineUseCaseDependencies` (service contracts the use case
 * requires), `RunPipelineUseCaseFactory` (construction contract).
 */
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>
}

/** Construction contract for every use case: dependencies in, instance out. */
export type UseCaseFactory<TUseCase, TDependencies> = (dependencies: TDependencies) => TUseCase
