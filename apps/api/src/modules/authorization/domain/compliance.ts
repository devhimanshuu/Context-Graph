import { ComplianceClearance, ComplianceTag } from '@contextgraph/types'

/* Compliance vocabulary for the authorization engine.
 *
 * Two deterministic layers:
 *
 * 1. Clearance class — a hierarchical lattice NONE < STANDARD < SENSITIVE <
 *    RESTRICTED < CRITICAL carried on the principal.
 * 2. Compliance tags — the explicit classifications a resource carries. Every
 *    tag maps to a minimum clearance class (COMPLIANCE_TAG_MINIMUM_CLASS).
 *    A principal may also be granted individual tags out-of-band via the
 *    `complianceGrants` metadata field, which the compiler folds into its
 *    effective tag set.
 *
 * A resource is cleared only when every required tag is present in the
 * principal's effective tag set. The class lattice and the tag table are
 * default organization-wide policy; per-tenant overrides are a future
 * configuration concern and live behind the same table shape.
 */

const CLEARANCE_RANK: Readonly<Record<ComplianceClearance, number>> = {
  [ComplianceClearance.NONE]: 0,
  [ComplianceClearance.STANDARD]: 1,
  [ComplianceClearance.SENSITIVE]: 2,
  [ComplianceClearance.RESTRICTED]: 3,
  [ComplianceClearance.CRITICAL]: 4,
}

/** Numeric rank of a clearance class (higher dominates lower). */
export function clearanceRank(clearance: ComplianceClearance): number {
  return CLEARANCE_RANK[clearance]
}

/** True when `granted` clearance dominates or equals `required`. */
export function clearanceDominates(
  granted: ComplianceClearance,
  required: ComplianceClearance,
): boolean {
  return clearanceRank(granted) >= clearanceRank(required)
}

/** Minimum clearance class a compliance tag requires. Deterministic default policy. */
export const COMPLIANCE_TAG_MINIMUM_CLASS: Readonly<Record<ComplianceTag, ComplianceClearance>> = {
  [ComplianceTag.PUBLIC]: ComplianceClearance.NONE,
  [ComplianceTag.INTERNAL]: ComplianceClearance.STANDARD,
  [ComplianceTag.HIPAA]: ComplianceClearance.SENSITIVE,
  [ComplianceTag.PHI]: ComplianceClearance.SENSITIVE,
  [ComplianceTag.PII]: ComplianceClearance.SENSITIVE,
  [ComplianceTag.GDPR]: ComplianceClearance.SENSITIVE,
  [ComplianceTag.CONFIDENTIAL]: ComplianceClearance.SENSITIVE,
  [ComplianceTag.SOC2]: ComplianceClearance.SENSITIVE,
  [ComplianceTag.ISO_27001]: ComplianceClearance.SENSITIVE,
  [ComplianceTag.PCI_DSS]: ComplianceClearance.RESTRICTED,
  [ComplianceTag.SOX]: ComplianceClearance.RESTRICTED,
  [ComplianceTag.FINRA]: ComplianceClearance.RESTRICTED,
  [ComplianceTag.RESTRICTED]: ComplianceClearance.RESTRICTED,
}

/** Every tag implied by a clearance class (all tags whose minimum is at or below it). */
export function tagsImpliedByClearance(clearance: ComplianceClearance): ReadonlySet<ComplianceTag> {
  const rank = clearanceRank(clearance)
  const implied = new Set<ComplianceTag>()
  for (const [tag, required] of Object.entries(COMPLIANCE_TAG_MINIMUM_CLASS) as [
    ComplianceTag,
    ComplianceClearance,
  ][]) {
    if (clearanceRank(required) <= rank) implied.add(tag)
  }
  return implied
}

/** Metadata key the compiler reads explicit per-tag grants from. */
export const COMPLIANCE_GRANTS_METADATA_KEY = 'complianceGrants'

/** True when every required tag is present in the effective tag set. */
export function satisfiesTags(
  effectiveTags: ReadonlySet<ComplianceTag>,
  requiredTags: readonly ComplianceTag[],
): boolean {
  for (const tag of requiredTags) {
    if (!effectiveTags.has(tag)) return false
  }
  return true
}
