import { type CandidateNodeDto, type NodeContextDto } from '@/application/dto'

/** Input to candidate assembly. */
export interface AssembleCandidatesInput {
  organizationId: string
  workspaceId: string
  nodes: NodeContextDto[]
  maxCandidates: number
}

/**
 * Ranks the filtered nodes (importance, derivability, relationship strength)
 * and assembles the final candidate set for AI context consumption. Consumed
 * by the candidate-builder stage and `BuildCandidateSetUseCase`.
 */
export interface ICandidateAssembler {
  assemble(input: AssembleCandidatesInput): Promise<CandidateNodeDto[]>
}
