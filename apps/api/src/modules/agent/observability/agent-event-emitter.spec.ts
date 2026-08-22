/* Agent event emitter — unit tests. */

import { describe, it, expect, vi } from 'vitest'
import { AgentEventEmitter, AgentEventType } from './agent-event-emitter'

describe('AgentEventEmitter', () => {
  it('emits events to subscribers', () => {
    const emitter = new AgentEventEmitter()
    const received: unknown[] = []

    emitter.stream('exec-1').subscribe((event) => {
      received.push(event)
    })

    emitter.emit('exec-1', AgentEventType.EXECUTION_STARTED, { request: 'test' })

    expect(received).toHaveLength(1)
    const first = received[0] as { event: string; data: string; id: string }
    expect(first.event).toBe('EXECUTION_STARTED')
    expect(first.id).toBe('exec-1')
    const parsed = JSON.parse(first.data) as Record<string, unknown>
    expect(parsed.type).toBe('EXECUTION_STARTED')
    expect(parsed.request).toBe('test')
  })

  it('does not emit to other executions', () => {
    const emitter = new AgentEventEmitter()
    const received1: unknown[] = []
    const received2: unknown[] = []

    emitter.stream('exec-1').subscribe((e) => received1.push(e))
    emitter.stream('exec-2').subscribe((e) => received2.push(e))

    emitter.emit('exec-1', AgentEventType.TOOL_STARTED, { tool: 'search' })

    expect(received1).toHaveLength(1)
    expect(received2).toHaveLength(0)
  })

  it('completes the stream', () => {
    const emitter = new AgentEventEmitter()
    const completed = vi.fn()

    emitter.stream('exec-1').subscribe({ complete: completed })
    emitter.complete('exec-1')

    expect(completed).toHaveBeenCalled()
    expect(emitter.activeStreamCount).toBe(0)
  })

  it('cleans up after completion', () => {
    const emitter = new AgentEventEmitter()

    emitter.stream('exec-1').subscribe()
    expect(emitter.activeStreamCount).toBe(1)

    emitter.complete('exec-1')
    expect(emitter.activeStreamCount).toBe(0)

    // Emitting after completion should be a no-op
    emitter.emit('exec-1', AgentEventType.EXECUTION_COMPLETE, {})
  })

  it('emits multiple event types', () => {
    const emitter = new AgentEventEmitter()
    const received: unknown[] = []

    emitter.stream('exec-1').subscribe((e) => received.push(e))

    emitter.emit('exec-1', AgentEventType.EXECUTION_STARTED, {})
    emitter.emit('exec-1', AgentEventType.PLAN_CREATED, { stepCount: 4 })
    emitter.emit('exec-1', AgentEventType.TOOL_STARTED, { toolName: 'search' })
    emitter.emit('exec-1', AgentEventType.TOOL_COMPLETED, { toolName: 'search', success: true })
    emitter.emit('exec-1', AgentEventType.EXECUTION_COMPLETE, {})

    expect(received).toHaveLength(5)
    const types = (received as { event: string }[]).map((e) => e.event)
    expect(types).toEqual([
      'EXECUTION_STARTED',
      'PLAN_CREATED',
      'TOOL_COMPLETED',
      'TOOL_COMPLETED',
      'EXECUTION_COMPLETE',
    ])
  })

  it('formats SSE events correctly', () => {
    const emitter = new AgentEventEmitter()
    let sseEvent: unknown = null

    emitter.stream('exec-1').subscribe((e) => {
      sseEvent = e
    })

    emitter.emit('exec-1', AgentEventType.VERIFICATION, { passed: true })

    const event = sseEvent as { event: string; data: string; id: string }
    expect(event.event).toBe('VERIFICATION')
    expect(event.id).toBe('exec-1')

    const data = JSON.parse(event.data) as Record<string, unknown>
    expect(data.type).toBe('VERIFICATION')
    expect(data.passed).toBe(true)
    expect(typeof data.timestamp).toBe('string')
  })

  it('handles error on stream', () => {
    const emitter = new AgentEventEmitter()
    const errorFn = vi.fn()

    emitter.stream('exec-1').subscribe({ error: errorFn })
    emitter.error('exec-1', 'Something went wrong')

    expect(errorFn).toHaveBeenCalled()
    expect(emitter.activeStreamCount).toBe(0)
  })
})
