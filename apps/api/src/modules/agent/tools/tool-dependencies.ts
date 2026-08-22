/* Tool dependencies — the real ContextGraph services that agent tools use.

Each tool receives a subset of these dependencies through constructor injection.
The agent runtime never accesses these directly — tools are the boundary.
*/

import type { AuthenticatedUser } from '@contextgraph/types'
import type { IContextAssemblyService } from '../../pipeline/context-assembly/context-assembly.service'
import type { IGraphService } from '../../graph/graph.service'
import type { IKnowledgeService } from '../../knowledge/knowledge.service'
import type { IAuthorizationService } from '../../authorization/services/authorization.service'

/**
 * All real ContextGraph services that agent tools can use.
 * Injected via NestJS DI into the tool factory functions.
 */
export interface ToolDependencies {
  readonly contextAssembly: IContextAssemblyService
  readonly graphService: IGraphService
  readonly knowledgeService: IKnowledgeService
  readonly authorizationService: IAuthorizationService
}

/**
 * Context available to every tool execution.
 * Carries the authenticated user and workspace scope.
 */
export interface ToolUserContext {
  readonly user: AuthenticatedUser
  readonly workspaceId: string
  readonly executionId: string
}
