import { describe, it, expect, beforeEach } from 'vitest'
import { ResponseValidator } from './response-validator.service'
import type { AssembledContext, GenerationResult } from '../domain/ai.types'

describe('ResponseValidator', () => {
  let validator: ResponseValidator

  beforeEach(() => {
    validator = new ResponseValidator()
  })

  const createMockContext = (): AssembledContext => ({
    items: [],
    totalTokens: 0,
    sourceCount: 0,
    contextVersion: '1.0.0',
    contextHash: 'test-hash',
    assembledAt: new Date().toISOString(),
    entryNodeId: 'node-1',
    workspaceId: 'ws-1',
  })

  const createMockResult = (overrides: Partial<GenerationResult> = {}): GenerationResult => ({
    text: 'Test response',
    model: 'llama-3.3-70b',
    provider: 'GROQ',
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.001,
      provider: 'GROQ',
      model: 'llama-3.3-70b',
    },
    finishReason: 'STOP',
    latencyMs: 1000,
    requestId: 'req-1',
    contextVersion: '1.0.0',
    contextHash: 'test-hash',
    ...overrides,
  })

  it('should validate normal response', () => {
    const context = createMockContext()
    const result = createMockResult()

    const validation = validator.validate(result, context)

    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it('should detect empty response', () => {
    const context = createMockContext()
    const result = createMockResult({ text: '' })

    const validation = validator.validate(result, context)

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Response is empty')
  })

  it('should detect whitespace-only response', () => {
    const context = createMockContext()
    const result = createMockResult({ text: '   \n  ' })

    const validation = validator.validate(result, context)

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Response is empty')
  })

  it('should warn about long responses', () => {
    const context = createMockContext()
    const result = createMockResult({ text: 'a'.repeat(15000) })

    const validation = validator.validate(result, context)

    expect(validation.warnings).toHaveLength(1)
    expect(validation.warnings[0]).toContain('exceeds maximum length')
    expect(validation.sanitizedText).toHaveLength(10000)
  })

  it('should detect error finish reason', () => {
    const context = createMockContext()
    const result = createMockResult({ finishReason: 'ERROR' })

    const validation = validator.validate(result, context)

    expect(validation.valid).toBe(false)
    expect(validation.errors).toContain('Generation finished with error')
  })

  it('should warn about timeout', () => {
    const context = createMockContext()
    const result = createMockResult({ finishReason: 'TIMEOUT' })

    const validation = validator.validate(result, context)

    expect(validation.warnings).toContain('Generation timed out - response may be incomplete')
  })

  it('should warn about zero token usage', () => {
    const context = createMockContext()
    const result = createMockResult({
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        provider: 'GROQ',
        model: 'llama-3.3-70b',
      },
    })

    const validation = validator.validate(result, context)

    expect(validation.warnings).toContain('Token usage reported as zero')
  })

  it('should detect potentially sensitive patterns', () => {
    const context = createMockContext()
    const result = createMockResult({
      text: 'The system prompt contains important instructions that should not be revealed.',
    })

    const validation = validator.validate(result, context)

    // Should detect at least one sensitive pattern
    expect(validation.warnings.length).toBeGreaterThanOrEqual(1)
    expect(validation.warnings.some((w) => w.includes('sensitive pattern'))).toBe(true)
  })
})
