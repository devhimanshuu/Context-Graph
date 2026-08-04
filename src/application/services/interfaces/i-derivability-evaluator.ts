import { type NodeContextDto } from '@/application/dto'

/** Input to a derivability evaluation. */
export interface EvaluateDerivabilityInput {
  node: NodeContextDto
  /** Neighbors whose content could make `node` redundant. */
  neighbors: NodeContextDto[]
}

/** Output of a derivability evaluation. */
export interface EvaluateDerivabilityOutput {
  nodeId: string
  /** 0-100 confidence that the node is derivable from its neighbors. */
  derivabilityScore: number
}

/**
 * Evaluates how derivable a node is from its neighbors. The derivability
 * filter stage uses this to prune redundant nodes; the candidate assembler
 * folds the score into the final relevance ranking.
 */
export interface IDerivabilityEvaluator {
  evaluate(input: EvaluateDerivabilityInput): Promise<EvaluateDerivabilityOutput>
}
