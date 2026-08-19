import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import type { EntityId } from '@contextgraph/types'

/** DTO for conversation turns. */
export class ConversationTurnDto {
  @IsString()
  readonly role!: 'user' | 'assistant'

  @IsString()
  readonly content!: string

  @IsString()
  @IsOptional()
  readonly timestamp?: string
}

/** DTO for model configuration overrides. */
export class ModelConfigurationDto {
  @IsString()
  @IsOptional()
  readonly provider?: string

  @IsString()
  @IsOptional()
  readonly model?: string

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  readonly temperature?: number

  @IsNumber()
  @Min(1)
  @Max(100000)
  @IsOptional()
  readonly maxOutputTokens?: number
}

/**
 * DTO for AI chat request.
 *
 * Validates:
 * - userQuery is required and non-empty
 * - entryNodeId is required
 * - workspaceId is required
 * - conversationHistory is optional array
 * - configuration is optional object
 */
export class AiChatRequestDto {
  @IsString()
  readonly userQuery!: string

  @IsString()
  readonly entryNodeId!: EntityId

  @IsString()
  readonly workspaceId!: EntityId

  @IsString()
  @IsOptional()
  readonly conversationId?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationTurnDto)
  @IsOptional()
  readonly conversationHistory?: ConversationTurnDto[]

  @ValidateNested()
  @Type(() => ModelConfigurationDto)
  @IsOptional()
  readonly configuration?: ModelConfigurationDto
}
