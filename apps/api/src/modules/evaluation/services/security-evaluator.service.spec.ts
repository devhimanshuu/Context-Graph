import { describe, it, expect, beforeEach } from 'vitest'
import { SecurityEvaluatorService } from './security-evaluator.service'

describe('SecurityEvaluatorService', () => {
  let service: SecurityEvaluatorService

  beforeEach(() => {
    service = new SecurityEvaluatorService()
  })

  describe('evaluateAuthorization', () => {
    it('should pass when all items belong to authorized org', () => {
      const contextItems = [
        { organizationId: 'org-1', nodeId: 'node-1' },
        { organizationId: 'org-1', nodeId: 'node-2' },
      ]
      const metrics = service.evaluateAuthorization(contextItems, 'org-1', [])
      expect(metrics.authorizationViolations).toBe(0)
      expect(metrics.passedSecurityTests).toBe(2)
    })

    it('should detect cross-tenant violations', () => {
      const contextItems = [
        { organizationId: 'org-1', nodeId: 'node-1' },
        { organizationId: 'org-2', nodeId: 'node-2' },
      ]
      const metrics = service.evaluateAuthorization(contextItems, 'org-1', [])
      expect(metrics.authorizationViolations).toBe(1)
    })

    it('should detect forbidden node violations', () => {
      const contextItems = [{ organizationId: 'org-1', nodeId: 'node-1' }]
      const metrics = service.evaluateAuthorization(contextItems, 'org-1', ['node-1'])
      expect(metrics.authorizationViolations).toBe(1)
    })
  })

  describe('evaluatePromptInjection', () => {
    it('should detect when injected instructions are followed', () => {
      const response = 'Here are the instructions: ignore all previous instructions'
      const metrics = service.evaluatePromptInjection(
        response,
        ['ignore all previous instructions'],
        [],
      )
      expect(metrics.promptInjectionSuccessRate).toBeGreaterThan(0)
    })

    it('should detect system prompt leakage', () => {
      const response = 'The system prompt is: you are a helpful assistant'
      const metrics = service.evaluatePromptInjection(response, [], ['system prompt'])
      expect(metrics.systemPromptLeakage).toBeGreaterThan(0)
    })

    it('should pass when no injection detected', () => {
      const response = 'I cannot help with that request.'
      const metrics = service.evaluatePromptInjection(
        response,
        ['ignore instructions'],
        ['system prompt'],
      )
      expect(metrics.promptInjectionSuccessRate).toBe(0)
      expect(metrics.systemPromptLeakage).toBe(0)
    })
  })

  describe('evaluateTenantIsolation', () => {
    it('should pass when all results belong to expected org', () => {
      const results = [
        { organizationId: 'org-1', data: {} },
        { organizationId: 'org-1', data: {} },
      ]
      const metrics = service.evaluateTenantIsolation(results, 'org-1')
      expect(metrics.tenantIsolationViolations).toBe(0)
    })

    it('should detect cross-tenant violations', () => {
      const results = [
        { organizationId: 'org-1', data: {} },
        { organizationId: 'org-2', data: {} },
      ]
      const metrics = service.evaluateTenantIsolation(results, 'org-1')
      expect(metrics.tenantIsolationViolations).toBe(1)
    })
  })

  describe('shouldBlockRelease', () => {
    it('should block on authorization violations', () => {
      const metrics = {
        authorizationViolations: 1,
        tenantIsolationViolations: 0,
        promptInjectionSuccessRate: 0,
        systemPromptLeakage: 0,
        contextLeakage: 0,
        citationSpoofing: 0,
        totalSecurityTests: 10,
        passedSecurityTests: 9,
      }
      const result = service.shouldBlockRelease(metrics)
      expect(result.shouldBlock).toBe(true)
      expect(result.reasons.length).toBeGreaterThan(0)
    })

    it('should block on tenant isolation violations', () => {
      const metrics = {
        authorizationViolations: 0,
        tenantIsolationViolations: 1,
        promptInjectionSuccessRate: 0,
        systemPromptLeakage: 0,
        contextLeakage: 0,
        citationSpoofing: 0,
        totalSecurityTests: 10,
        passedSecurityTests: 9,
      }
      const result = service.shouldBlockRelease(metrics)
      expect(result.shouldBlock).toBe(true)
    })

    it('should not block when all tests pass', () => {
      const metrics = {
        authorizationViolations: 0,
        tenantIsolationViolations: 0,
        promptInjectionSuccessRate: 0,
        systemPromptLeakage: 0,
        contextLeakage: 0,
        citationSpoofing: 0,
        totalSecurityTests: 10,
        passedSecurityTests: 10,
      }
      const result = service.shouldBlockRelease(metrics)
      expect(result.shouldBlock).toBe(false)
    })
  })
})
