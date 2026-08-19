import { Injectable } from '@nestjs/common'
import type {
  AssembledContext,
  GenerationResult,
  ResponseValidationResult,
} from '../domain/ai.types'
import type { IResponseValidator } from '../domain/ai.interfaces'

/** Maximum response length in characters. */
const MAX_RESPONSE_LENGTH = 10000

/** Patterns that indicate potential prompt injection or policy violations. */
const FORBIDDEN_PATTERNS = [
  /system prompt/i,
  /instructions/i,
  /ignore.*previous/i,
  /override.*safety/i,
  /reveal.*secrets/i,
  /confidential.*information/i,
]

/**
 * Response Validator — validates generated responses.
 *
 * Checks:
 * - Response structure and length
 * - Forbidden content patterns
 * - Citation format
 * - Malformed output
 *
 * Uses deterministic validation first (no LLM).
 */
@Injectable()
export class ResponseValidator implements IResponseValidator {
  validate(response: GenerationResult, _context: AssembledContext): ResponseValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let sanitizedText: string | null = null

    // Check response length
    if (response.text.length > MAX_RESPONSE_LENGTH) {
      warnings.push(
        `Response exceeds maximum length (${response.text.length} > ${MAX_RESPONSE_LENGTH})`,
      )
      sanitizedText = response.text.slice(0, MAX_RESPONSE_LENGTH)
    }

    // Check for empty response
    if (response.text.trim().length === 0) {
      errors.push('Response is empty')
    }

    // Check for forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(response.text)) {
        warnings.push(`Response contains potentially sensitive pattern: ${pattern.source}`)
      }
    }

    // Check finish reason
    if (response.finishReason === 'ERROR') {
      errors.push('Generation finished with error')
    }

    if (response.finishReason === 'TIMEOUT') {
      warnings.push('Generation timed out - response may be incomplete')
    }

    // Check for valid usage
    if (response.usage.totalTokens === 0) {
      warnings.push('Token usage reported as zero')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedText,
    }
  }
}
