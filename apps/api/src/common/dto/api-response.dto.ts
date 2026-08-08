import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import type { ErrorCode } from '@contextgraph/shared'
import { PaginationMetaDto } from './pagination.dto'

/** Success envelope every 2xx response shares. */
export class ApiSuccessResponseDto<T> {
  @ApiProperty({ example: true })
  success = true

  @ApiProperty({ description: 'Handler payload (domain DTO)' })
  data!: T

  @ApiPropertyOptional({ type: PaginationMetaDto })
  meta?: PaginationMetaDto

  @ApiProperty({ example: '9f1c2e3d-…', description: 'Correlates this response with server logs' })
  requestId!: string

  @ApiProperty({ example: '2026-08-06T12:00:00.000Z' })
  timestamp!: string
}

/** Error body inside the failure envelope. */
export class ApiErrorBodyDto {
  @ApiProperty({ example: 'ERR_NOT_FOUND' })
  code!: ErrorCode

  @ApiProperty({ example: 'Resource not found' })
  message!: string

  @ApiPropertyOptional({ description: 'Field-level validation details' })
  details?: unknown
}

/** Failure envelope every non-2xx response shares. */
export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success = false

  @ApiProperty({ type: ApiErrorBodyDto })
  error!: ApiErrorBodyDto

  @ApiProperty({ example: '9f1c2e3d-…' })
  requestId!: string

  @ApiProperty({ example: '2026-08-06T12:00:00.000Z' })
  timestamp!: string
}
