import { Body, Controller, Post, HttpCode, HttpStatus, Inject, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import type { Response } from 'express'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import type { AiChatRequest, AiResponse } from '../domain/ai.types'
import { IAiService } from '../domain/ai.interfaces'
import { AiChatRequestDto } from '../dto/ai-chat-request.dto'

/**
 * AI Controller — exposes the AI chat endpoint.
 *
 * POST /api/v1/ai/chat
 *
 * Request:
 * - userQuery: The user's question
 * - entryNodeId: Starting node for context retrieval
 * - workspaceId: Workspace scope
 * - conversationId: Optional conversation thread
 * - conversationHistory: Previous turns
 * - configuration: Optional model overrides
 *
 * Response:
 * - AiResponse with answer, citations, usage, etc.
 *
 * Security:
 * - Requires JWT authentication (handled by global guard)
 * - ContextGraph authorization happens in the service layer
 * - User query cannot override authorization
 */
@ApiBearerAuth()
@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(@Inject(IAiService) private readonly aiService: IAiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI response using authorized context' })
  @ApiOkResponse({ description: 'AI response with citations and metadata' })
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: AiChatRequestDto,
  ): Promise<AiResponse> {
    const chatRequest: AiChatRequest = {
      userQuery: request.userQuery,
      entryNodeId: request.entryNodeId,
      workspaceId: request.workspaceId,
      conversationId: request.conversationId ?? null,
      conversationHistory: (request.conversationHistory ?? []).map((turn) => ({
        role: turn.role,
        content: turn.content,
        timestamp: turn.timestamp ?? new Date().toISOString(),
      })),
      configuration: (request.configuration as Record<string, unknown>) ?? {},
    }

    return this.aiService.chat(chatRequest)
  }

  @Post('chat/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream AI response using authorized context (Server-Sent Events)' })
  async chatStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: AiChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const chatRequest: AiChatRequest = {
      userQuery: request.userQuery,
      entryNodeId: request.entryNodeId,
      workspaceId: request.workspaceId,
      conversationId: request.conversationId ?? null,
      conversationHistory: (request.conversationHistory ?? []).map((turn) => ({
        role: turn.role,
        content: turn.content,
        timestamp: turn.timestamp ?? new Date().toISOString(),
      })),
      configuration: (request.configuration as Record<string, unknown>) ?? {},
    }

    try {
      const result = await this.aiService.chatStream(chatRequest, (chunk) => {
        // Send each chunk as SSE
        const sseChunk = `data: ${JSON.stringify(chunk)}\n\n`
        res.write(sseChunk)
      })

      // Send final result
      const finalChunk = `data: ${JSON.stringify({ type: 'done', result })}\n\n`
      res.write(finalChunk)
      res.end()
    } catch (error) {
      const errorChunk = `data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
      res.write(errorChunk)
      res.end()
    }
  }
}
