/* In-memory memory store — short-term execution memory.

Memory inherits:
- organization
- user
- authorization context

Never allows cross-tenant access.
*/

import { Injectable } from '@nestjs/common'
import { IMemoryStore, type MemoryEntry } from '../domain/agent.interfaces'

interface MemorySlot {
  readonly entry: MemoryEntry
  readonly expiresAt: number | null
}

@Injectable()
export class InMemoryStore implements IMemoryStore {
  private readonly store = new Map<string, MemorySlot>()

  async get(key: string): Promise<MemoryEntry | null> {
    const slot = this.store.get(key)
    if (slot === undefined) return null

    if (slot.expiresAt !== null && Date.now() > slot.expiresAt) {
      this.store.delete(key)
      return null
    }

    return slot.entry
  }

  async set(key: string, value: MemoryEntry, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : null
    this.store.set(key, { entry: value, expiresAt })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  async list(prefix?: string): Promise<readonly MemoryEntry[]> {
    const entries: MemoryEntry[] = []
    const now = Date.now()

    for (const [key, slot] of this.store) {
      if (prefix !== undefined && !key.startsWith(prefix)) continue
      if (slot.expiresAt !== null && now > slot.expiresAt) continue
      entries.push(slot.entry)
    }

    return entries
  }

  /**
   * Clear all memory for a specific execution.
   */
  clearForExecution(executionId: string): void {
    for (const [key, slot] of this.store) {
      if (slot.entry.executionId === executionId) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Clear all memory for a specific organization (tenant cleanup).
   */
  clearForOrganization(organizationId: string): void {
    for (const [key, slot] of this.store) {
      if (slot.entry.organizationId === organizationId) {
        this.store.delete(key)
      }
    }
  }
}
