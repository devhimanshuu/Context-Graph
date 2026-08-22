/* LLM Planner — unit tests. */

import { describe, it, expect, vi } from 'vitest'
import { LLMAgentPlanner, type IAgentModelGenerator } from './llm-planner'
import type { ILogger } from '../../../common/interfaces/logger.interface'
import type { AgentLimits } from '../domain/agent.types'

const mockLogger: ILogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as ILogger

const DEFAULT_LIMITS: AgentLimits = {
  maxSteps: 20,
  maxIterations: 10,
  maxToolCalls: 50,
  maxDurationMs: 120_000,
  maxTokens: 32_000,
  maxCost: 1.0,
  perToolTimeoutMs: 30_000,
  maxConsecutiveIdenticalCalls: 3,
}

const TOOLS = [
  { name: 'context_search', description: 'Search for context' },
  { name: 'graph_explore', description: 'Explore graph connections' },
  { name: 'knowledge_lookup', description: 'Look up knowledge nodes' },
]

function makeMockGenerator(response: string): IAgentModelGenerator {
  return {
    generate: vi.fn().mockResolvedValue({
      text: response,
      inputTokens: 100,
      outputTokens: 200,
      durationMs: 500,
    }),
  }
}

function makeFailingGenerator(error: string): IAgentModelGenerator {
  return {
    generate: vi.fn().mockRejectedValue(new Error(error)),
  }
}

describe('LLMAgentPlanner', () => {
  describe('generatePlan', () => {
    it('generates a plan from valid LLM output', async () => {
      const llmOutput = JSON.stringify({
        steps: [
          {
            type: 'CONTEXT_REQUEST',
            purpose: 'Search for HIPAA info',
            tool: 'context_search',
            inputs: { query: 'HIPAA' },
          },
          { type: 'ANALYSIS', purpose: 'Analyze results' },
          { type: 'VERIFICATION', purpose: 'Verify response' },
          { type: 'FINAL_RESPONSE', purpose: 'Respond to user' },
        ],
        reasoning: 'Simple search and respond',
      })

      const generator = makeMockGenerator(llmOutput)
      const planner = new LLMAgentPlanner(mockLogger, generator)

      const plan = await planner.generatePlan('What are HIPAA requirements?', TOOLS, DEFAULT_LIMITS)

      expect(plan).not.toBeNull()
      expect(plan!.steps).toHaveLength(4)
      expect(plan!.steps[0].type).toBe('CONTEXT_REQUEST')
      expect(plan!.steps[0].tool).toBe('context_search')
      expect(plan!.steps[3].type).toBe('FINAL_RESPONSE')
    })

    it('returns null on invalid JSON', async () => {
      const generator = makeMockGenerator('This is not JSON at all')
      const planner = new LLMAgentPlanner(mockLogger, generator)

      const plan = await planner.generatePlan('test', TOOLS, DEFAULT_LIMITS)
      expect(plan).toBeNull()
    })

    it('returns null on model failure', async () => {
      const generator = makeFailingGenerator('API timeout')
      const planner = new LLMAgentPlanner(mockLogger, generator)

      const plan = await planner.generatePlan('test', TOOLS, DEFAULT_LIMITS)
      expect(plan).toBeNull()
    })

    it('handles markdown code fences in LLM output', async () => {
      const llmOutput =
        '```json\n' +
        JSON.stringify({
          steps: [
            { type: 'CONTEXT_REQUEST', purpose: 'Search', tool: 'context_search' },
            { type: 'ANALYSIS', purpose: 'Analyze' },
            { type: 'VERIFICATION', purpose: 'Verify' },
            { type: 'FINAL_RESPONSE', purpose: 'Respond' },
          ],
        }) +
        '\n```'

      const generator = makeMockGenerator(llmOutput)
      const planner = new LLMAgentPlanner(mockLogger, generator)

      const plan = await planner.generatePlan('test', TOOLS, DEFAULT_LIMITS)
      expect(plan).not.toBeNull()
      expect(plan!.steps).toHaveLength(4)
    })

    it('ensures required steps exist (analysis, verification, final_response)', async () => {
      const llmOutput = JSON.stringify({
        steps: [
          { type: 'CONTEXT_REQUEST', purpose: 'Search', tool: 'context_search' },
          // Missing analysis, verification, final_response
        ],
      })

      const generator = makeMockGenerator(llmOutput)
      const planner = new LLMAgentPlanner(mockLogger, generator)

      const plan = await planner.generatePlan('test', TOOLS, DEFAULT_LIMITS)
      expect(plan).not.toBeNull()
      expect(plan!.steps.some((s) => s.type === 'ANALYSIS')).toBe(true)
      expect(plan!.steps.some((s) => s.type === 'VERIFICATION')).toBe(true)
      expect(plan!.steps.some((s) => s.type === 'FINAL_RESPONSE')).toBe(true)
    })

    it('truncates steps to maxSteps limit', async () => {
      const manySteps = Array.from({ length: 30 }, (_, i) => ({
        type: 'TOOL_CALL',
        purpose: `Step ${i}`,
        tool: 'context_search',
      }))

      const llmOutput = JSON.stringify({ steps: manySteps })
      const generator = makeMockGenerator(llmOutput)
      const planner = new LLMAgentPlanner(mockLogger, generator)

      const limits = { ...DEFAULT_LIMITS, maxSteps: 10 }
      const plan = await planner.generatePlan('test', TOOLS, limits)
      expect(plan).not.toBeNull()
      // LLM steps truncated to 10, then required steps (analysis, verification, final_response)
      // may be injected, so the total can exceed maxSteps slightly
      expect(plan!.steps.length).toBeLessThanOrEqual(13)
    })

    it('filters out invalid step types', async () => {
      const llmOutput = JSON.stringify({
        steps: [
          { type: 'CONTEXT_REQUEST', purpose: 'Search', tool: 'context_search' },
          { type: 'INVALID_TYPE', purpose: 'Bad step' },
          { type: 'ANALYSIS', purpose: 'Analyze' },
          { type: 'FINAL_RESPONSE', purpose: 'Respond' },
        ],
      })

      const generator = makeMockGenerator(llmOutput)
      const planner = new LLMAgentPlanner(mockLogger, generator)

      const plan = await planner.generatePlan('test', TOOLS, DEFAULT_LIMITS)
      expect(plan).not.toBeNull()
      expect(
        plan!.steps.every((s) =>
          ['CONTEXT_REQUEST', 'TOOL_CALL', 'ANALYSIS', 'VERIFICATION', 'FINAL_RESPONSE'].includes(
            s.type,
          ),
        ),
      ).toBe(true)
    })

    it('sends low temperature for deterministic planning', async () => {
      const generator = makeMockGenerator(
        JSON.stringify({
          steps: [
            { type: 'ANALYSIS', purpose: 'Analyze' },
            { type: 'FINAL_RESPONSE', purpose: 'Respond' },
          ],
        }),
      )
      const planner = new LLMAgentPlanner(mockLogger, generator)

      await planner.generatePlan('test', TOOLS, DEFAULT_LIMITS)

      const callArgs = vi.mocked(generator.generate).mock.calls[0][0]
      expect(callArgs.temperature).toBe(0.1)
    })

    it('includes tool descriptions in the system prompt', async () => {
      const generator = makeMockGenerator(
        JSON.stringify({
          steps: [
            { type: 'ANALYSIS', purpose: 'Analyze' },
            { type: 'FINAL_RESPONSE', purpose: 'Respond' },
          ],
        }),
      )
      const planner = new LLMAgentPlanner(mockLogger, generator)

      await planner.generatePlan('test', TOOLS, DEFAULT_LIMITS)

      const callArgs = vi.mocked(generator.generate).mock.calls[0][0]
      expect(callArgs.systemPrompt).toContain('context_search')
      expect(callArgs.systemPrompt).toContain('graph_explore')
      expect(callArgs.systemPrompt).toContain('knowledge_lookup')
    })
  })
})
