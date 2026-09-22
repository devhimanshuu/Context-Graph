import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'
import type { AuthenticatedUser } from '@contextgraph/types'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ConversationService } from '../services/conversation.service'

/** DTO for renaming a conversation. */
export class RenameConversationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  readonly title!: string
}

/**
 * Conversations Controller — persisted AI chat history.
 *
 * GET    /api/v1/conversations           — list conversations
 * GET    /api/v1/conversations/:id       — load a conversation with messages
 * PATCH  /api/v1/conversations/:id       — rename
 * DELETE /api/v1/conversations/:id       — soft delete
 *
 * Security: requires JWT authentication; every query is scoped to the
 * authenticated user's organization AND user id.
 */
@ApiBearerAuth()
@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List chat conversations for the current user' })
  @ApiOkResponse({ description: 'Conversation summaries, newest activity first' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReturnType<ConversationService['listConversations']>> {
    return this.conversations.listConversations(user, { limit: 50 })
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Load one conversation with its messages' })
  @ApiOkResponse({ description: 'Conversation with full message list' })
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<ConversationService['getConversation']>> {
    return this.conversations.getConversation(user, id)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rename a conversation' })
  @ApiNoContentResponse({ description: 'Renamed' })
  async rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenameConversationDto,
  ): Promise<void> {
    await this.conversations.renameConversation(user, id, body.title)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiNoContentResponse({ description: 'Deleted' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.conversations.deleteConversation(user, id)
  }
}
