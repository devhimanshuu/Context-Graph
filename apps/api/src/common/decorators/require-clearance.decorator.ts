import { SetMetadata } from '@nestjs/common'
import type { ComplianceClearance } from '@contextgraph/types'

export const CLEARANCE_KEY = 'requiredComplianceClearance'

/** Requires the principal's compliance clearance to dominate the given class. Consumed by AuthorizationGuard. */
export const RequireClearance = (
  clearance: ComplianceClearance,
): MethodDecorator & ClassDecorator => SetMetadata(CLEARANCE_KEY, clearance)
