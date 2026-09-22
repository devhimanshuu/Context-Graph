import { Body, Controller, Post, HttpCode, HttpStatus, Inject, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { AuthenticatedUser } from '@contextgraph/types'
import type { Response } from 'express'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import type { AiChatRequest, AiResponse } from '../domain/ai.types'
import { IAiService } from '../domain/ai.interfaces'
import { AiChatRequestDto } from '../dto/ai-chat-request.dto'
import { ConversationService } from '../services/conversation.service'

/**
 * AI Controller — exposes the AI chat endpoints.
 *
 * POST /api/v1/ai/chat         — non-streaming generation
 * POST /api/v1/ai/chat/stream  — Server-Sent Events generation
 *
 * Both endpoints persist every turn (user + assistant) to the caller's
 * conversation history. Subsequent requests can pass the returned
 * conversationId to continue the thread; history is loaded server-side
 * from the persisted store (any client-supplied history is ignored when
 * a conversationId is present).
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
  constructor(
    @Inject(IAiService) private readonly aiService: IAiService,
    private readonly conversations: ConversationService,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI response using authorized context' })
  @ApiOkResponse({ description: 'AI response with citations and metadata' })
  async chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() request: AiChatRequestDto,
  ): Promise<AiResponse> {
    const conversationId = request.conversationId ?? null

    // Load persisted history when continuing an existing conversation.
    const conversationHistory =
      conversationId !== null
        ? await this.conversations.loadHistory(user, conversationId)
        : (request.conversationHistory ?? []).map((turn) => ({
            role: turn.role,
            content: turn.content,
            timestamp: turn.timestamp ?? new Date().toISOString(),
          }))

    const chatRequest: AiChatRequest = {
      userQuery: request.userQuery,
      entryNodeId: request.entryNodeId,
      workspaceId: request.workspaceId,
      conversationId,
      conversationHistory,
      configuration: (request.configuration as Record<string, unknown>) ?? {},
      user,
    }

    const response = await this.aiService.chat(chatRequest)

    const persisted = await this.conversations.recordTurn({
      user,
      conversationId,
      workspaceId: request.workspaceId ?? null,
      userQuery: request.userQuery,
      answer: response.answer,
      citations: response.citations,
      metadata: {
        model: response.model,
        provider: response.provider,
        latencyMs: response.latencyMs,
        requestId: response.requestId,
        entryNodeId: request.entryNodeId ?? null,
        workspaceId: request.workspaceId ?? null,
      },
    })

    return { ...response, conversationId: persisted.conversationId || null }
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

    const conversationId = request.conversationId ?? null

    // Load persisted history when continuing an existing conversation.
    const conversationHistory =
      conversationId !== null
        ? await this.conversations.loadHistory(user, conversationId)
        : (request.conversationHistory ?? []).map((turn) => ({
            role: turn.role,
            content: turn.content,
            timestamp: turn.timestamp ?? new Date().toISOString(),
          }))

    const chatRequest: AiChatRequest = {
      userQuery: request.userQuery,
      entryNodeId: request.entryNodeId,
      workspaceId: request.workspaceId,
      conversationId,
      conversationHistory,
      configuration: (request.configuration as Record<string, unknown>) ?? {},
      user,
    }

    try {
      const result = await this.aiService.chatStream(chatRequest, (chunk) => {
        // Send each chunk as SSE
        const sseChunk = `data: ${JSON.stringify(chunk)}\n\n`
        res.write(sseChunk)
      })

      const persisted = await this.conversations.recordTurn({
        user,
        conversationId,
        workspaceId: request.workspaceId ?? null,
        userQuery: request.userQuery,
        answer: result.answer,
        citations: result.citations,
        metadata: {
          model: result.model,
          provider: result.provider,
          latencyMs: result.latencyMs,
          requestId: result.requestId,
          entryNodeId: request.entryNodeId ?? null,
          workspaceId: request.workspaceId ?? null,
        },
      })

      // Send final result with the persisted conversation id.
      const finalChunk = `data: ${JSON.stringify({
        type: 'done',
        result: { ...result, conversationId: persisted.conversationId || null },
      })}\n\n`
      res.write(finalChunk)
      res.end()
    } catch (error) {
      const errorChunk = `data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
      res.write(errorChunk)
      res.end()
    }
  }
}
