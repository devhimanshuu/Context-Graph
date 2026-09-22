import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import type { PrismaService } from '../../../database/prisma.service'
import type { Citation } from '../domain/ai.types'
import type { AuthenticatedUser } from '@contextgraph/types'

/** Injection token for the global Prisma service. */
const PRISMA = 'PRISMA'

/** Max conversation turns sent back to the model as history. */
const MAX_HISTORY_TURNS = 20

/** A stored chat message, normalized for API + UI consumption. */
export interface StoredChatMessage {
  id: string
  conversationId: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  citations: ReadonlyArray<{
    index: number
    nodeId: string
    title: string
  }>
  metadata: Record<string, unknown>
  createdAt: string
}

/** Conversation summary for sidebar listings. */
export interface ConversationSummary {
  id: string
  title: string
  workspaceId: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

/** Derives a short conversation title from the first user message. */
function deriveTitle(userQuery: string): string {
  const normalized = userQuery.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 60) return normalized || 'New conversation'
  return `${normalized.slice(0, 57)}...`
}

/**
 * ConversationService — persists AI chat history.
 *
 * Every chat turn (user + assistant) is stored so conversations survive
 * page reloads and can be resumed later. Persistence failures are logged
 * but never break the chat flow itself.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name)

  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  /** Lists conversations for a user, newest activity first. */
  async listConversations(
    user: AuthenticatedUser,
    options?: { limit?: number },
  ): Promise<ConversationSummary[]> {
    const limit = Math.min(options?.limit ?? 50, 100)
    const rows = await this.prisma.conversation.findMany({
      where: { organizationId: user.organizationId, userId: user.id, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { _count: { select: { messages: true } } },
    })
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      workspaceId: row.workspaceId,
      messageCount: row._count.messages,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
  }

  /** Loads one conversation with its full message list, enforcing ownership. */
  async getConversation(
    user: AuthenticatedUser,
    conversationId: string,
  ): Promise<{
    id: string
    title: string
    workspaceId: string | null
    messages: StoredChatMessage[]
  }> {
    const row = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: user.organizationId,
        userId: user.id,
        deletedAt: null,
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (row === null) {
      throw new NotFoundException(`Conversation ${conversationId} not found`)
    }
    return {
      id: row.id,
      title: row.title,
      workspaceId: row.workspaceId,
      messages: row.messages.map((m) => this.toStoredMessage(m)),
    }
  }

  /** Loads prior turns of a conversation as model-facing history. */
  async loadHistory(
    user: AuthenticatedUser,
    conversationId: string,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: user.organizationId,
        userId: user.id,
        deletedAt: null,
      },
      include: {
        messages: {
          where: { role: { in: ['USER', 'ASSISTANT'] } },
          orderBy: { createdAt: 'desc' },
          take: MAX_HISTORY_TURNS,
        },
      },
    })
    if (conversation === null) {
      throw new NotFoundException(`Conversation ${conversationId} not found`)
    }
    return conversation.messages.reverse().map((m) => ({
      role: m.role === 'ASSISTANT' ? ('assistant' as const) : ('user' as const),
      content: m.content,
      timestamp: m.createdAt.toISOString(),
    }))
  }

  /**
   * Persists a completed chat turn: the user query and the assistant answer.
   * Creates the conversation when conversationId is null. Returns the
   * conversationId so the client can pin subsequent turns to it.
   */
  async recordTurn(params: {
    user: AuthenticatedUser
    conversationId: string | null
    workspaceId: string | null
    userQuery: string
    answer: string
    citations: readonly Citation[]
    metadata?: Record<string, unknown>
  }): Promise<{ conversationId: string }> {
    try {
      const title = params.conversationId === null ? deriveTitle(params.userQuery) : undefined

      if (params.conversationId === null) {
        const conversation = await this.prisma.conversation.create({
          data: {
            organizationId: params.user.organizationId,
            userId: params.user.id,
            workspaceId: params.workspaceId,
            title: title ?? 'New conversation',
            messages: {
              create: [
                { role: 'USER', content: params.userQuery },
                {
                  role: 'ASSISTANT',
                  content: params.answer,
                  citations: this.serializeCitations(params.citations),
                  metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
                },
              ],
            },
          },
        })
        return { conversationId: conversation.id }
      }

      // Verify ownership before appending.
      const owned = await this.prisma.conversation.findFirst({
        where: {
          id: params.conversationId,
          organizationId: params.user.organizationId,
          userId: params.user.id,
          deletedAt: null,
        },
        select: { id: true },
      })
      if (owned === null) {
        throw new NotFoundException(`Conversation ${params.conversationId} not found`)
      }

      await this.prisma.chatMessage.createMany({
        data: [
          { conversationId: owned.id, role: 'USER', content: params.userQuery },
          {
            conversationId: owned.id,
            role: 'ASSISTANT',
            content: params.answer,
            citations: this.serializeCitations(params.citations),
            metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
          },
        ],
      })
      await this.prisma.conversation.update({
        where: { id: owned.id },
        data: { updatedAt: new Date() },
      })
      return { conversationId: owned.id }
    } catch (error) {
      // Persistence must never break the chat flow — log and continue.
      this.logger.error('Failed to persist conversation turn', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: params.conversationId,
      })
      return { conversationId: params.conversationId ?? '' }
    }
  }

  /** Renames a conversation (owner only). */
  async renameConversation(
    user: AuthenticatedUser,
    conversationId: string,
    title: string,
  ): Promise<void> {
    const cleaned = title.trim().slice(0, 120)
    if (cleaned.length === 0) {
      throw new Error('Title cannot be empty')
    }
    const owned = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: user.organizationId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (owned === null) {
      throw new NotFoundException(`Conversation ${conversationId} not found`)
    }
    await this.prisma.conversation.update({
      where: { id: owned.id },
      data: { title: cleaned },
    })
  }

  /** Soft-deletes a conversation (owner only). */
  async deleteConversation(user: AuthenticatedUser, conversationId: string): Promise<void> {
    const owned = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        organizationId: user.organizationId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    })
    if (owned === null) {
      throw new NotFoundException(`Conversation ${conversationId} not found`)
    }
    await this.prisma.conversation.update({
      where: { id: owned.id },
      data: { deletedAt: new Date() },
    })
  }

  private serializeCitations(
    citations: readonly Citation[],
  ): Array<{ index: number; nodeId: string; title: string }> {
    return citations.map((c) => ({
      index: c.index,
      nodeId: c.nodeId,
      title: c.title,
    }))
  }

  private toStoredMessage(message: {
    id: string
    conversationId: string
    role: 'USER' | 'ASSISTANT' | 'SYSTEM'
    content: string
    citations: unknown
    metadata: unknown
    createdAt: Date
  }): StoredChatMessage {
    const citations = Array.isArray(message.citations) ? message.citations : []
    const metadata =
      message.metadata !== null &&
      typeof message.metadata === 'object' &&
      !Array.isArray(message.metadata)
        ? (message.metadata as Record<string, unknown>)
        : {}
    return {
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      citations,
      metadata,
      createdAt: message.createdAt.toISOString(),
    }
  }
}
