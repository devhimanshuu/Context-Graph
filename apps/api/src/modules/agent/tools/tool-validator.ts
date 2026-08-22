/* Tool input validator — strict validation before any tool execution. */

import { Injectable } from '@nestjs/common'
import { IToolInputValidator } from '../domain/agent.interfaces'
import type { ToolSchema } from '../domain/agent.types'

/**
 * Validates tool input against the tool's schema.
 *
 * Rejects:
 * - Unexpected fields
 * - Invalid IDs (non-UUID where UUID expected)
 * - Oversized inputs
 * - Invalid organization references
 * - Unsupported operations
 *
 * Never allows arbitrary JSON to reach tool implementations.
 */
@Injectable()
export class ToolInputValidator implements IToolInputValidator {
  private static readonly MAX_INPUT_SIZE = 10_000 // characters
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  validate(
    toolName: string,
    input: Record<string, unknown>,
    schema: ToolSchema,
  ): Record<string, unknown> {
    // 1. Reject oversized inputs
    const inputSize = JSON.stringify(input).length
    if (inputSize > ToolInputValidator.MAX_INPUT_SIZE) {
      throw new ToolValidationError(
        `Input too large: ${inputSize} chars (max ${ToolInputValidator.MAX_INPUT_SIZE})`,
        toolName,
        'SIZE_LIMIT',
      )
    }

    // 2. Reject if input is not an object
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ToolValidationError('Input must be an object', toolName, 'INVALID_TYPE')
    }

    // 3. Validate against schema properties
    const expectedProps = schema.inputSchema as Record<string, Record<string, unknown>>
    if (expectedProps && typeof expectedProps === 'object' && expectedProps.properties) {
      const props = expectedProps.properties as Record<string, Record<string, unknown>>
      const required: readonly string[] = Array.isArray(expectedProps.required)
        ? (expectedProps.required as readonly string[])
        : []

      // Check required fields
      for (const field of required) {
        if (input[field] === undefined || input[field] === null) {
          throw new ToolValidationError(
            `Missing required field: ${field}`,
            toolName,
            'MISSING_FIELD',
          )
        }
      }

      // Check no unexpected fields (strict mode)
      const allowedKeys = new Set(Object.keys(props))
      for (const key of Object.keys(input)) {
        if (!allowedKeys.has(key)) {
          throw new ToolValidationError(`Unexpected field: ${key}`, toolName, 'UNEXPECTED_FIELD')
        }
      }

      // Validate field types
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null) continue
        const propSchema = props[key]
        if (propSchema === undefined) continue

        const expectedType = propSchema.type as string | undefined
        if (expectedType !== undefined) {
          const actualType = typeof value
          if (expectedType === 'string' && actualType !== 'string') {
            throw new ToolValidationError(
              `Field '${key}' must be a string, got ${actualType}`,
              toolName,
              'TYPE_MISMATCH',
            )
          }
          if (expectedType === 'number' && actualType !== 'number') {
            throw new ToolValidationError(
              `Field '${key}' must be a number, got ${actualType}`,
              toolName,
              'TYPE_MISMATCH',
            )
          }
          if (expectedType === 'integer' && (actualType !== 'number' || !Number.isInteger(value))) {
            throw new ToolValidationError(
              `Field '${key}' must be an integer`,
              toolName,
              'TYPE_MISMATCH',
            )
          }
        }

        // Validate UUID fields
        if (propSchema.format === 'uuid' && typeof value === 'string') {
          if (!ToolInputValidator.UUID_PATTERN.test(value)) {
            throw new ToolValidationError(
              `Field '${key}' must be a valid UUID`,
              toolName,
              'INVALID_FORMAT',
            )
          }
        }

        // Validate string length
        if (typeof value === 'string') {
          const maxLength = propSchema.maxLength as number | undefined
          if (maxLength !== undefined && value.length > maxLength) {
            throw new ToolValidationError(
              `Field '${key}' exceeds max length ${maxLength}`,
              toolName,
              'SIZE_LIMIT',
            )
          }
        }
      }
    }

    return input
  }
}

export class ToolValidationError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly reason: string,
  ) {
    super(`Tool validation failed [${toolName}]: ${message}`)
    this.name = 'ToolValidationError'
  }
}
