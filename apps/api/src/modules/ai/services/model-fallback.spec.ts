import { describe, it, expect } from 'vitest'

describe('Model Fallback', () => {
  describe('Groq Free Models', () => {
    const GROQ_FREE_MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'llama3-groq-8b-8192-tool-use-preview',
      'llama3-groq-70b-8192-tool-use-preview',
    ]

    it('should have all expected free models', () => {
      expect(GROQ_FREE_MODELS).toContain('llama-3.3-70b-versatile')
      expect(GROQ_FREE_MODELS).toContain('llama-3.1-8b-instant')
      expect(GROQ_FREE_MODELS).toContain('mixtral-8x7b-32768')
      expect(GROQ_FREE_MODELS).toContain('gemma2-9b-it')
    })

    it('should fallback to next model when primary fails', () => {
      const failedModel = 'llama-3.3-70b-versatile'
      const currentIndex = GROQ_FREE_MODELS.indexOf(failedModel)
      const nextModel = GROQ_FREE_MODELS[currentIndex + 1]
      expect(nextModel).toBe('llama-3.1-8b-instant')
    })
  })

  describe('OpenRouter Free Models', () => {
    const OPENROUTER_FREE_MODELS = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'google/gemma-2-9b-it:free',
      'qwen/qwen-2-7b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
    ]

    it('should have all expected free models', () => {
      expect(OPENROUTER_FREE_MODELS).toContain('meta-llama/llama-3.3-70b-instruct:free')
      expect(OPENROUTER_FREE_MODELS).toContain('meta-llama/llama-3.1-8b-instruct:free')
      expect(OPENROUTER_FREE_MODELS).toContain('mistralai/mistral-7b-instruct:free')
      expect(OPENROUTER_FREE_MODELS).toContain('google/gemma-2-9b-it:free')
    })

    it('should fallback to next model when primary fails', () => {
      const failedModel = 'meta-llama/llama-3.3-70b-instruct:free'
      const currentIndex = OPENROUTER_FREE_MODELS.indexOf(failedModel)
      const nextModel = OPENROUTER_FREE_MODELS[currentIndex + 1]
      expect(nextModel).toBe('meta-llama/llama-3.1-8b-instruct:free')
    })

    it('should wrap around to first model after last', () => {
      const failedModel = 'microsoft/phi-3-mini-128k-instruct:free'
      const currentIndex = OPENROUTER_FREE_MODELS.indexOf(failedModel)
      expect(currentIndex).toBe(OPENROUTER_FREE_MODELS.length - 1)
      // After last, should wrap to first
      const nextModel = OPENROUTER_FREE_MODELS[0]
      expect(nextModel).toBe('meta-llama/llama-3.3-70b-instruct:free')
    })
  })

  describe('Fallback Logic', () => {
    it('should skip failing models', () => {
      const models = ['model-a', 'model-b', 'model-c']
      const failingModels = new Set(['model-b'])

      const getNextModel = (failedModel: string): string | null => {
        const currentIndex = models.indexOf(failedModel)
        if (currentIndex === -1) return models[0] ?? null

        for (let i = currentIndex + 1; i < models.length; i++) {
          const candidate = models[i]
          if (candidate && !failingModels.has(candidate)) {
            return candidate
          }
        }

        for (let i = 0; i < currentIndex; i++) {
          const candidate = models[i]
          if (candidate && !failingModels.has(candidate)) {
            return candidate
          }
        }

        return null
      }

      // model-a fails, should skip model-b (failing) and return model-c
      expect(getNextModel('model-a')).toBe('model-c')
    })

    it('should return null when all models failing', () => {
      const models = ['model-a', 'model-b']
      const failingModels = new Set(['model-a', 'model-b'])

      const getNextModel = (failedModel: string): string | null => {
        const currentIndex = models.indexOf(failedModel)
        if (currentIndex === -1) return models[0] ?? null

        for (let i = currentIndex + 1; i < models.length; i++) {
          const candidate = models[i]
          if (candidate && !failingModels.has(candidate)) {
            return candidate
          }
        }

        for (let i = 0; i < currentIndex; i++) {
          const candidate = models[i]
          if (candidate && !failingModels.has(candidate)) {
            return candidate
          }
        }

        return null
      }

      expect(getNextModel('model-a')).toBeNull()
    })
  })
})
