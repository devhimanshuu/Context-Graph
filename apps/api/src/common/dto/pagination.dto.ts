import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/** Pagination metadata attached to every paginated response. */
export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number

  @ApiProperty({ example: 20 })
  limit!: number

  @ApiProperty({ example: 137 })
  total!: number

  @ApiProperty({ example: 7 })
  totalPages!: number

  @ApiProperty({ example: true })
  hasNext!: boolean

  @ApiProperty({ example: false })
  hasPrevious!: boolean
}

/** Accepted query params for list endpoints. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: '1-based page number' })
  page = 1

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Items per page' })
  limit = 20
}
