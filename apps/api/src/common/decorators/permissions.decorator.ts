import { SetMetadata } from '@nestjs/common'
import type { PermissionAction } from '@contextgraph/types'

/** A resource-action pair required on a route. */
export interface RequiredPermission {
  resource: string
  action: PermissionAction
}

export const PERMISSIONS_KEY = 'requiredPermissions'

/* Declares the permissions a route requires. Consumed by AuthorizationGuard, which delegates capability checks to */
export const RequirePermissions = (
  ...permissions: readonly RequiredPermission[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions)
