import { type NodeContextDto, type UserContextDto } from '@/application/dto'

/** Input to zone injection. */
export interface InjectZoneInput {
  organizationId: string
  workspaceId: string
  nodes: NodeContextDto[]
  user: UserContextDto
}

/** Output of zone injection: the traversal frontier plus injected zone nodes. */
export interface InjectZoneOutput {
  nodes: NodeContextDto[]
}

/**
 * Injects zone/department context nodes (organizational context every
 * candidate set must contain, e.g. the department's scope definition) into
 * the traversal frontier. The zone-injection stage depends on this contract.
 */
export interface IZoneInjector {
  inject(input: InjectZoneInput): Promise<InjectZoneOutput>
}
