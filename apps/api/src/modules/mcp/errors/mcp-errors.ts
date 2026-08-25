/* MCP error model — structured, safe errors that never expose internals.

Every MCP error carries a machine-readable code and a safe human-readable message.
Internal stack traces, database details, and authorization internals are never
included in MCP responses. */

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { McpToolResultStatus } from '@contextgraph/types'
import { ValidationException } from '../../../common/exceptions/validation.exception'
import { PermissionDeniedException } from '../../authorization/errors/authorization-errors'

/** Base class for all MCP errors. */
export abstract class McpError extends Error {
  abstract readonly code: McpToolResultStatus
  abstract readonly httpStatus: number

  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = this.constructor.name
  }

  /** Safe response — never includes internal details beyond what's in the constructor. */
  toResponse(
    toolCallId: string,
    toolName: string,
  ): {
    toolCallId: string
    toolName: string
    status: McpToolResultStatus
    error: string
    metadata: Record<string, unknown>
  } {
    return {
      toolCallId,
      toolName,
      status: this.code,
      error: this.message,
      metadata: this.details ?? {},
    }
  }
}

/** No valid credentials provided. */
export class McpAuthenticationError extends McpError {
  readonly code = McpToolResultStatus.AUTHENTICATION_REQUIRED
  readonly httpStatus = 401

  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/** Principal lacks the required capability or authorization. */
export class McpAccessDeniedError extends McpError {
  readonly code = McpToolResultStatus.ACCESS_DENIED
  readonly httpStatus = 403

  constructor(message = 'Access denied', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/** Input validation failed. */
export class McpInvalidInputError extends McpError {
  readonly code = McpToolResultStatus.INVALID_INPUT
  readonly httpStatus = 400

  constructor(message = 'Invalid input', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/** Requested resource does not exist or is not accessible. */
export class McpResourceNotFoundError extends McpError {
  readonly code = McpToolResultStatus.RESOURCE_NOT_FOUND
  readonly httpStatus = 404

  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/** Rate limit exceeded. */
export class McpRateLimitedError extends McpError {
  readonly code = McpToolResultStatus.RATE_LIMITED
  readonly httpStatus = 429

  constructor(
    message = 'Rate limit exceeded',
    readonly retryAfterMs: number = 60_000,
    details?: Record<string, unknown>,
  ) {
    super(message, details)
  }
}

/** The context pipeline failed to execute. */
export class McpPipelineFailedError extends McpError {
  readonly code = McpToolResultStatus.PIPELINE_FAILED
  readonly httpStatus = 502

  constructor(message = 'Context pipeline failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/** Unexpected internal error. */
export class McpInternalError extends McpError {
  readonly code = McpToolResultStatus.INTERNAL_ERROR
  readonly httpStatus = 500

  constructor(message = 'Internal MCP server error', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/** MCP protocol-level error (JSON-RPC style). */
export class McpProtocolError extends McpError {
  readonly code = McpToolResultStatus.INTERNAL_ERROR
  readonly httpStatus = 400

  constructor(
    message: string,
    readonly rpcCode: number = -32600,
    details?: Record<string, unknown>,
  ) {
    super(message, details)
  }
}

/** Map an unknown error to an MCP-safe error. */
export function toMcpError(error: unknown): McpError {
  if (error instanceof McpError) return error

  // Map known NestJS / domain errors via instanceof (robust under minification).
  if (error instanceof NotFoundException) {
    return new McpResourceNotFoundError(error.message)
  }
  if (error instanceof UnauthorizedException) {
    return new McpAuthenticationError(error.message)
  }
  if (error instanceof ForbiddenException || error instanceof PermissionDeniedException) {
    return new McpAccessDeniedError(error.message)
  }
  if (error instanceof BadRequestException || error instanceof ValidationException) {
    return new McpInvalidInputError(error.message)
  }
  if (error instanceof ThrottlerException) {
    return new McpRateLimitedError(error.message)
  }

  return new McpInternalError('An unexpected error occurred')
}
