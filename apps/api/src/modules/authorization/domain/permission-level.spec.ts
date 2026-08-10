import { describe, expect, it } from 'vitest'
import { PermissionAction, PermissionLevel } from '@contextgraph/types'
import { levelDominates, minimumLevelForAction, permissionLevelRank } from './permission-level'

describe('permissionLevelRank', () => {
  it('orders levels hierarchically', () => {
    expect(permissionLevelRank(PermissionLevel.NONE)).toBe(0)
    expect(permissionLevelRank(PermissionLevel.READ)).toBe(1)
    expect(permissionLevelRank(PermissionLevel.WRITE)).toBe(2)
    expect(permissionLevelRank(PermissionLevel.ADMIN)).toBe(3)
  })
})

describe('levelDominates', () => {
  it('allows equal levels', () => {
    expect(levelDominates(PermissionLevel.WRITE, PermissionLevel.WRITE)).toBe(true)
  })

  it('allows strictly higher levels', () => {
    expect(levelDominates(PermissionLevel.ADMIN, PermissionLevel.READ)).toBe(true)
  })

  it('denies lower levels', () => {
    expect(levelDominates(PermissionLevel.READ, PermissionLevel.ADMIN)).toBe(false)
    expect(levelDominates(PermissionLevel.NONE, PermissionLevel.READ)).toBe(false)
  })
})

describe('minimumLevelForAction', () => {
  it('maps READ to READ', () => {
    expect(minimumLevelForAction(PermissionAction.READ)).toBe(PermissionLevel.READ)
  })

  it('maps WRITE to WRITE', () => {
    expect(minimumLevelForAction(PermissionAction.WRITE)).toBe(PermissionLevel.WRITE)
  })

  it('maps destructive and manage actions to ADMIN', () => {
    expect(minimumLevelForAction(PermissionAction.DELETE)).toBe(PermissionLevel.ADMIN)
    expect(minimumLevelForAction(PermissionAction.MANAGE)).toBe(PermissionLevel.ADMIN)
  })
})
