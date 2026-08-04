import { type NodeContextDto } from '@/application/dto'
import { type NodeType } from '@/domain/enums'

/** Output of node classification. */
export interface ClassifyNodeOutput {
  nodeId: string
  type: NodeType
}

/**
 * Classifies a node (fact / constraint / decision / anti-pattern). Used by
 * enrichment steps and by the rule engine to scope rule evaluation; a
 * heuristic implementation may refine the stored `type`.
 */
export interface INodeClassifier {
  classify(node: NodeContextDto): Promise<ClassifyNodeOutput>
}
