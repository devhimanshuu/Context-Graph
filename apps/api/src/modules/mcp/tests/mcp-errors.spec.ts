/* MCP Error Model — unit tests. */

import { describe, it, expect } from 'vitest'
import {
  McpAuthenticationError,
  McpAccessDeniedError,
  McpInvalidInputError,
  McpResourceNotFoundError,
  McpRateLimitedError,
  McpPipelineFailedError,
  McpInternalError,
  toMcpError,
} from '../errors/mcp-errors'

describe('McpError hierarchy', () => {
  it('McpAuthenticationError has correct code and httpStatus', () => {
    const error = new McpAuthenticationError()
    expect(error.code).toBe('authentication_required')
    expect(error.httpStatus).toBe(401)
    expect(error.message).toBe('Authentication required')
  })

  it('McpAccessDeniedError has correct code and httpStatus', () => {
    const error = new McpAccessDeniedError('Not allowed')
    expect(error.code).toBe('access_denied')
    expect(error.httpStatus).toBe(403)
    expect(error.message).toBe('Not allowed')
  })

  it('McpInvalidInputError has correct code and httpStatus', () => {
    const error = new McpInvalidInputError()
    expect(error.code).toBe('invalid_input')
    expect(error.httpStatus).toBe(400)
  })

  it('McpResourceNotFoundError has correct code and httpStatus', () => {
    const error = new McpResourceNotFoundError()
    expect(error.code).toBe('resource_not_found')
    expect(error.httpStatus).toBe(404)
  })

  it('McpRateLimitedError has retryAfterMs', () => {
    const error = new McpRateLimitedError('Too fast', 5000)
    expect(error.code).toBe('rate_limited')
    expect(error.httpStatus).toBe(429)
    expect(error.retryAfterMs).toBe(5000)
  })

  it('McpPipelineFailedError has correct code', () => {
    const error = new McpPipelineFailedError()
    expect(error.code).toBe('pipeline_failed')
    expect(error.httpStatus).toBe(502)
  })

  it('McpInternalError has correct code', () => {
    const error = new McpInternalError()
    expect(error.code).toBe('internal_error')
    expect(error.httpStatus).toBe(500)
  })

  it('toResponse produces safe output', () => {
    const error = new McpAccessDeniedError('Denied')
    const response = error.toResponse('call-123', 'resolve_context')
    expect(response.toolCallId).toBe('call-123')
    expect(response.toolName).toBe('resolve_context')
    expect(response.status).toBe('access_denied')
    expect(response.error).toBe('Denied')
    expect(response.metadata).toEqual({})
  })
})

describe('toMcpError', () => {
  it('passes through McpError instances', () => {
    const original = new McpAccessDeniedError('test')
    expect(toMcpError(original)).toBe(original)
  })

  it('maps NotFoundException to McpResourceNotFoundError', () => {
    class NotFoundException extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'NotFoundException'
      }
    }
    const error = toMcpError(new NotFoundException('Not found'))
    expect(error).toBeInstanceOf(McpResourceNotFoundError)
  })

  it('maps generic errors to McpInternalError', () => {
    const error = toMcpError(new Error('Something broke'))
    expect(error).toBeInstanceOf(McpInternalError)
  })

  it('handles non-Error values', () => {
    const error = toMcpError('string error')
    expect(error).toBeInstanceOf(McpInternalError)
  })
})
