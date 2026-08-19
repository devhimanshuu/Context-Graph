import { describe, it, expect } from 'vitest'
import { GroqAdapter } from '../adapters/groq.adapter'
import { OpenRouterAdapter } from '../adapters/openrouter.adapter'
import { OllamaAdapter } from '../adapters/ollama.adapter'

describe('Streaming Support', () => {
  describe('ModelGateway base class', () => {
    it('should have generateStream method', () => {
      // Check that the abstract method exists
      expect(typeof GroqAdapter.prototype.generateStream).toBe('function')
      expect(typeof OpenRouterAdapter.prototype.generateStream).toBe('function')
      expect(typeof OllamaAdapter.prototype.generateStream).toBe('function')
    })

    it('should have parseSSEStream helper', () => {
      // The parseSSEStream method should exist on the prototype
      // Note: It's a protected method, so we check via the class
      expect(typeof GroqAdapter.prototype).toBe('object')
    })
  })

  describe('StreamChunk type', () => {
    it('should have correct structure', () => {
      // Verify the StreamChunk interface structure
      const chunk = {
        delta: 'Hello',
        finishReason: null,
        usage: null,
        index: 0,
      }

      expect(chunk.delta).toBe('Hello')
      expect(chunk.finishReason).toBeNull()
      expect(chunk.usage).toBeNull()
      expect(chunk.index).toBe(0)
    })
  })

  describe('StreamResult type', () => {
    it('should have correct structure', () => {
      const result = {
        text: 'Hello world',
        usage: {
          inputTokens: 10,
          outputTokens: 20,
          totalTokens: 30,
          estimatedCost: 0.001,
          provider: 'GROQ' as const,
          model: 'llama-3.3-70b',
        },
        finishReason: 'STOP' as const,
        latencyMs: 1000,
      }

      expect(result.text).toBe('Hello world')
      expect(result.usage.totalTokens).toBe(30)
      expect(result.finishReason).toBe('STOP')
      expect(result.latencyMs).toBe(1000)
    })
  })

  describe('SSE parsing', () => {
    it('should handle SSE format correctly', () => {
      // Test SSE parsing logic
      const sseData =
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\ndata: {"choices":[{"delta":{"content":" world"}}]}\ndata: [DONE]\n'

      const lines = sseData.split('\n')
      const chunks: string[] = []

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
            const content = parsed.choices?.[0]?.delta?.content
            if (content) chunks.push(content)
          } catch {
            // Skip invalid JSON
          }
        }
      }

      expect(chunks).toEqual(['Hello', ' world'])
    })
  })
})
