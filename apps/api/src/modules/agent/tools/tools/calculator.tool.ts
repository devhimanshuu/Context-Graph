/* CalculatorTool — simple numeric computation tool.

This is a pure utility tool with no external dependencies.
*/

import type { ILogger } from '../../../../common/interfaces/logger.interface'
import type {
  ToolRegistration,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../../domain/agent.interfaces'

export const CALCULATOR_TOOL_NAME = 'calculator'

export function createCalculatorTool(logger: ILogger): ToolRegistration {
  return {
    schema: {
      name: CALCULATOR_TOOL_NAME,
      description:
        'Perform basic arithmetic calculations. Supports addition, subtraction, multiplication, division, and basic math functions.',
      inputSchema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate (e.g., "2 + 3 * 4")',
            maxLength: 500,
          },
        },
        required: ['expression'],
      },
      requiredCapabilities: ['CALCULATOR'],
      riskLevel: 'READ_ONLY',
      timeoutMs: 5_000,
      enabled: true,
    },

    async execute(
      input: Record<string, unknown>,
      context: ToolExecutionContext,
    ): Promise<ToolExecutionResult> {
      const expression = input.expression as string

      logger.debug('CalculatorTool executing', {
        expression,
        executionId: context.executionId,
      })

      // Safe evaluation: only allow numbers and basic operators
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, '')
      if (sanitized !== expression) {
        return {
          success: false,
          data: null,
          summary: 'Expression contains invalid characters',
          error: 'Only numbers and basic operators (+, -, *, /, %, parentheses) are allowed',
          durationMs: 0,
        }
      }

      try {
        const fn = new Function(`"use strict"; return (${sanitized})`)
        const result = fn()

        if (typeof result !== 'number' || !isFinite(result)) {
          return {
            success: false,
            data: null,
            summary: 'Expression did not evaluate to a finite number',
            error: `Result: ${String(result)}`,
            durationMs: 0,
          }
        }

        return {
          success: true,
          data: { expression, result },
          summary: `${expression} = ${result}`,
          error: null,
          durationMs: 0,
        }
      } catch (error) {
        return {
          success: false,
          data: null,
          summary: 'Failed to evaluate expression',
          error: error instanceof Error ? error.message : 'Evaluation error',
          durationMs: 0,
        }
      }
    },
  }
}
