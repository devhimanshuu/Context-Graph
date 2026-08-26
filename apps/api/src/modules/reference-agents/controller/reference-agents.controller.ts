/* Reference Agents Controller — REST endpoints for the multi-agent system.

Provides:
  POST /api/v1/reference-agents/run      — Execute a multi-agent scenario
  GET  /api/v1/reference-agents/runs/:id — Get run result
  GET  /api/v1/reference-agents/runs/:id/trace — Get execution trace

The controller is a thin adapter over the ReferenceSupervisor.
All authorization is delegated to ContextGraph through the agents. */

import { Controller, Get, Headers, Param, Post, Body } from '@nestjs/common'
import type { ReferenceRunResult } from '@contextgraph/types'
import type { SupervisorUser } from '../services/reference-supervisor'
import { ReferenceAgentRegistryService } from '../services/agent-registry.service'

// In-memory run store (production would use a repository)
const runStore = new Map<string, ReferenceRunResult>()

function extractUser(headers: Record<string, string | undefined>): SupervisorUser | null {
  const authHeader = headers['authorization']
  if (authHeader === undefined || !authHeader.startsWith('Bearer ')) return null

  // In production, validate JWT. For demo, return default user.
  return {
    id: '00000000-0000-0000-0000-000000000001',
    organizationId: '00000000-0000-0000-0000-000000000001',
    departmentId: null,
    email: 'admin@contextgraph.dev',
    name: 'Admin',
    role: 'ADMIN',
    permissionLevel: 'ADMIN',
    complianceClearance: 'CRITICAL',
  }
}

@Controller('reference-agents')
export class ReferenceAgentsController {
  constructor(private readonly registry: ReferenceAgentRegistryService) {}

  @Post('run')
  async runAgents(
    @Headers() headers: Record<string, string | undefined>,
    @Body()
    body: {
      query: string
      workspaceId?: string
      action?: string
      targetType?: string
      title?: string
      content?: string
    },
  ) {
    const user = extractUser(headers)
    if (user === null) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }
    }

    const workspaceId = body.workspaceId ?? '00000000-0000-0000-0000-000000000002'

    const supervisor = this.registry.createSupervisor(user.organizationId)
    const result = await supervisor.execute(user, {
      query: body.query,
      workspaceId,
      action: body.action ?? 'PUBLISH_KNOWLEDGE',
      targetType: body.targetType ?? 'KNOWLEDGE_NODE',
      title: body.title,
      content: body.content,
    })

    // Store for later retrieval
    runStore.set(result.runId, result)

    return { success: true, data: result }
  }

  @Get('runs/:id')
  async getRun(@Headers() headers: Record<string, string | undefined>, @Param('id') id: string) {
    const user = extractUser(headers)
    if (user === null) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }
    }

    const result = runStore.get(id)
    if (result === undefined) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Run not found' } }
    }

    return { success: true, data: result }
  }

  @Get('runs/:id/trace')
  async getTrace(@Headers() headers: Record<string, string | undefined>, @Param('id') id: string) {
    const user = extractUser(headers)
    if (user === null) {
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } }
    }

    const result = runStore.get(id)
    if (result === undefined) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Run not found' } }
    }

    return {
      success: true,
      data: {
        runId: result.runId,
        status: result.status,
        trace: result.trace,
        totalDurationMs: result.totalDurationMs,
      },
    }
  }

  @Get('registry')
  async getRegistry() {
    return {
      success: true,
      data: this.registry.getRegistry(),
    }
  }
}
