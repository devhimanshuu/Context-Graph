/* Agent cost calculator — unit tests. */

import { describe, it, expect } from 'vitest'
import { AgentCostCalculator } from './agent-cost-calculator'

describe('AgentCostCalculator', () => {
  const calculator = new AgentCostCalculator()

  describe('calculate', () => {
    it('calculates cost for Groq model', () => {
      const cost = calculator.calculate(1000, 500, 'GROQ', 'llama-3.3-70b-versatile')
      expect(cost).toBeGreaterThan(0)
      expect(cost).toBeLessThan(0.01)
    })

    it('calculates cost for Ollama (local) as zero', () => {
      const cost = calculator.calculate(1000, 500, 'OLLAMA', 'default')
      expect(cost).toBe(0)
    })

    it('returns 0 for unknown provider', () => {
      const cost = calculator.calculate(1000, 500, 'UNKNOWN', 'model')
      expect(cost).toBe(0)
    })

    it('scales with token count', () => {
      const small = calculator.calculate(100, 50, 'GROQ', 'llama-3.3-70b-versatile')
      const large = calculator.calculate(10_000, 5000, 'GROQ', 'llama-3.3-70b-versatile')
      expect(large).toBeGreaterThan(small)
    })
  })

  describe('checkBudget', () => {
    it('returns true when within budget', () => {
      expect(calculator.checkBudget(0.5, 1.0)).toBe(true)
    })

    it('returns false when over budget', () => {
      expect(calculator.checkBudget(1.5, 1.0)).toBe(false)
    })

    it('returns true at exact budget', () => {
      expect(calculator.checkBudget(1.0, 1.0)).toBe(true)
    })
  })
})
