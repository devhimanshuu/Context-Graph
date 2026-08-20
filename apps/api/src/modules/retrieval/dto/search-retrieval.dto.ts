import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  Max,
  IsEnum,
} from 'class-validator'
import type { RetrievalMode } from '../domain/retrieval.types'

/**
 * DTO for retrieval search endpoint.
 */
export class SearchRetrievalDto {
  @ApiProperty({
    description: 'User query for retrieval',
    example: 'What is the clinical safety policy?',
  })
  @IsString()
  userQuery!: string

  @ApiPropertyOptional({
    description: 'Workspace ID',
  })
  @IsOptional()
  @IsString()
  workspaceId?: string

  @ApiPropertyOptional({
    description: 'Entry node ID for graph traversal',
  })
  @IsOptional()
  @IsString()
  entryNodeId?: string

  @ApiPropertyOptional({
    description: 'Retrieval mode',
    enum: ['GRAPH_ONLY', 'SEMANTIC_ONLY', 'LEXICAL_ONLY', 'HYBRID'],
    default: 'HYBRID',
  })
  @IsOptional()
  @IsEnum(['GRAPH_ONLY', 'SEMANTIC_ONLY', 'LEXICAL_ONLY', 'HYBRID'])
  mode?: RetrievalMode

  @ApiPropertyOptional({
    description: 'Top K for graph retrieval',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  graphTopK?: number

  @ApiPropertyOptional({
    description: 'Top K for semantic retrieval',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  semanticTopK?: number

  @ApiPropertyOptional({
    description: 'Top K for lexical retrieval',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  lexicalTopK?: number

  @ApiPropertyOptional({
    description: 'Final top K after fusion',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  finalTopK?: number

  @ApiPropertyOptional({
    description: 'Enable graph retrieval',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableGraph?: boolean

  @ApiPropertyOptional({
    description: 'Enable semantic retrieval',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableSemantic?: boolean

  @ApiPropertyOptional({
    description: 'Enable lexical retrieval',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableLexical?: boolean

  @ApiPropertyOptional({
    description: 'Semantic retrieval weight',
    minimum: 0,
    maximum: 2,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  semanticWeight?: number

  @ApiPropertyOptional({
    description: 'Graph retrieval weight',
    minimum: 0,
    maximum: 2,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  graphWeight?: number

  @ApiPropertyOptional({
    description: 'Lexical retrieval weight',
    minimum: 0,
    maximum: 2,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  lexicalWeight?: number

  @ApiPropertyOptional({
    description: 'Minimum similarity threshold',
    minimum: 0,
    maximum: 1,
    default: 0.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number

  @ApiPropertyOptional({
    description: 'Filter by node types',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nodeTypes?: string[]

  @ApiPropertyOptional({
    description: 'Filter by statuses',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statuses?: string[]

  @ApiPropertyOptional({
    description: 'Filter by compliance tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceTags?: string[]

  @ApiPropertyOptional({
    description: 'Filter by departments',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[]
}
