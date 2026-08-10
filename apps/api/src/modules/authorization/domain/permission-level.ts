import { PermissionAction, PermissionLevel } from '@contextgraph/types'

/* Domain vocabulary for hierarchical permission levels.
 *
 * Levels form a strict lattice: NONE < READ < WRITE < ADMIN. A principal with a
 * higher level may exercise every capability of lower levels, subject to the
 * other policies (role, department, compliance, visibility). Ranking lives here
 * so controllers and guards never compare `PermissionLevel` strings inline.
 */

const LEVEL_RANK: Readonly<Record<PermissionLevel, number>> = {
  [PermissionLevel.NONE]: 0,
  [PermissionLevel.READ]: 1,
  [PermissionLevel.WRITE]: 2,
  [PermissionLevel.ADMIN]: 3,
}

/** Numeric rank of a permission level (higher dominates lower). */
export function permissionLevelRank(level: PermissionLevel): number {
  return LEVEL_RANK[level]
}

/** True when `granted` dominates or equals `required`. */
export function levelDominates(granted: PermissionLevel, required: PermissionLevel): boolean {
  return permissionLevelRank(granted) >= permissionLevelRank(required)
}

/** Minimum permission level a primitive action requires. */
const ACTION_MINIMUM_LEVEL: Readonly<Record<PermissionAction, PermissionLevel>> = {
  [PermissionAction.READ]: PermissionLevel.READ,
  [PermissionAction.WRITE]: PermissionLevel.WRITE,
  [PermissionAction.DELETE]: PermissionLevel.ADMIN,
  [PermissionAction.MANAGE]: PermissionLevel.ADMIN,
}

/** Minimum level required to exercise a primitive action. */
export function minimumLevelForAction(action: PermissionAction): PermissionLevel {
  return ACTION_MINIMUM_LEVEL[action]
}
